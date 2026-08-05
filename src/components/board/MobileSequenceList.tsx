"use client";

import { useState } from "react";

import { Button, IconButton, InlineText } from "@/components/ui";
import { useStore } from "@/lib/store";
import { SCENE_STATUSES, type Character, type Sequence, type Story } from "@/lib/types";

import { MobileSceneRow } from "./MobileSceneRow";

/** 折りたたみ時の見出しに出す「プロット2・執筆中3・完了1」形式のテキスト集計 */
function statusSummary(sequence: Sequence) {
  const counts = new Map<string, number>();
  for (const scene of sequence.scenes) {
    counts.set(scene.status, (counts.get(scene.status) ?? 0) + 1);
  }
  return SCENE_STATUSES.map((status) => ({
    label: status.label,
    count: counts.get(status.value) ?? 0,
  }))
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.label}${entry.count}`)
    .join("・");
}

/**
 * md 未満で表示する縦リスト本体。
 * シークエンス見出し (アコーディオン) + シーン行。並べ替えはドラッグではなく
 * 上下ボタン (▲/▼) で行う (デザイン部決定。長押しドラッグは不採用)。
 * 折りたたみ状態はストアに保存しない、画面ローカルな Set<sequenceId>。
 */
export function MobileSequenceList({
  projectId,
  story,
  characters,
  onOpenScene,
}: {
  projectId: string;
  story: Story;
  characters: Character[];
  onOpenScene: (sceneId: string) => void;
}) {
  const addSequence = useStore((s) => s.addSequence);
  const updateSequence = useStore((s) => s.updateSequence);
  const deleteSequence = useStore((s) => s.deleteSequence);
  const moveSequence = useStore((s) => s.moveSequence);
  const addScene = useStore((s) => s.addScene);
  const moveScene = useStore((s) => s.moveScene);

  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const allCollapsed =
    story.sequences.length > 0 &&
    story.sequences.every((sequence) => collapsed.has(sequence.id));

  const toggleAll = () =>
    setCollapsed(
      allCollapsed ? new Set() : new Set(story.sequences.map((s) => s.id)),
    );

  const toggleOne = (sequenceId: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(sequenceId)) next.delete(sequenceId);
      else next.add(sequenceId);
      return next;
    });

  /** 各シークエンスの先頭シーンがストーリー内で何番目から始まるか (Board.tsx と同じ考え方) */
  const offsets: number[] = [];
  for (let i = 0, running = 0; i < story.sequences.length; i += 1) {
    offsets.push(running);
    running += story.sequences[i].scenes.length;
  }

  return (
    <div className="thin-scroll h-full space-y-3 overflow-y-auto px-4 pt-2 pb-6">
      <div className="flex justify-end">
        <Button variant="ghost" size="touch" onClick={toggleAll}>
          {allCollapsed ? "すべて開く" : "すべて折りたたむ"}
        </Button>
      </div>

      {story.sequences.map((sequence, sequenceIndex) => {
        const isCollapsed = collapsed.has(sequence.id);
        return (
          <section
            key={sequence.id}
            className="bg-surface2/60 border-line rounded-xl border"
          >
            <div className="flex items-center gap-1 px-2 py-2">
              <IconButton
                label={isCollapsed ? "展開する" : "折りたたむ"}
                aria-expanded={!isCollapsed}
                size="touch"
                onClick={() => toggleOne(sequence.id)}
              >
                {isCollapsed ? "▸" : "▾"}
              </IconButton>
              <InlineText
                value={sequence.title}
                placeholder="シークエンス名"
                onCommit={(title) =>
                  updateSequence(projectId, story.id, sequence.id, { title })
                }
                className="focus:bg-surface min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-sm font-semibold outline-none"
              />
              <span className="text-muted shrink-0 text-[11px] tabular-nums">
                {sequence.scenes.length}件
              </span>

              {!isCollapsed && (
                <>
                  <IconButton
                    label="シークエンスを上へ移動"
                    size="touch"
                    disabled={sequenceIndex === 0}
                    className="disabled:opacity-30"
                    onClick={() =>
                      moveSequence(
                        projectId,
                        story.id,
                        sequenceIndex,
                        sequenceIndex - 1,
                      )
                    }
                  >
                    ▲
                  </IconButton>
                  <IconButton
                    label="シークエンスを下へ移動"
                    size="touch"
                    disabled={sequenceIndex === story.sequences.length - 1}
                    className="disabled:opacity-30"
                    onClick={() =>
                      moveSequence(
                        projectId,
                        story.id,
                        sequenceIndex,
                        sequenceIndex + 1,
                      )
                    }
                  >
                    ▼
                  </IconButton>
                  <IconButton
                    label="このシークエンスを削除"
                    size="touch"
                    className="hover:text-danger"
                    onClick={() => {
                      if (
                        sequence.scenes.length > 0 &&
                        !window.confirm(
                          `「${sequence.title}」を ${sequence.scenes.length} 件のシーンごと削除します。よろしいですか？`,
                        )
                      )
                        return;
                      deleteSequence(projectId, story.id, sequence.id);
                    }}
                  >
                    ✕
                  </IconButton>
                </>
              )}
            </div>

            {isCollapsed ? (
              sequence.scenes.length > 0 && (
                <p className="text-muted px-2 pb-2 text-[11px]">
                  {statusSummary(sequence)}
                </p>
              )
            ) : (
              <div className="space-y-2 px-2 pb-2">
                <InlineText
                  value={sequence.summary}
                  placeholder="このシークエンスの狙い"
                  onCommit={(summary) =>
                    updateSequence(projectId, story.id, sequence.id, {
                      summary,
                    })
                  }
                  className="text-muted focus:bg-surface w-full rounded bg-transparent px-1 py-0.5 text-xs outline-none"
                />

                {sequence.scenes.map((scene, index) => (
                  <MobileSceneRow
                    key={scene.id}
                    scene={scene}
                    number={offsets[sequenceIndex] + index + 1}
                    characters={characters}
                    onOpen={() => onOpenScene(scene.id)}
                    onMoveUp={() =>
                      moveScene(
                        projectId,
                        story.id,
                        scene.id,
                        sequence.id,
                        index - 1,
                      )
                    }
                    onMoveDown={() =>
                      moveScene(
                        projectId,
                        story.id,
                        scene.id,
                        sequence.id,
                        index + 1,
                      )
                    }
                    canMoveUp={index > 0}
                    canMoveDown={index < sequence.scenes.length - 1}
                  />
                ))}

                {sequence.scenes.length === 0 && (
                  <p className="border-line text-muted rounded-lg border border-dashed py-6 text-center text-xs">
                    まだシーンがありません
                  </p>
                )}

                <Button
                  variant="ghost"
                  size="touch"
                  className="w-full justify-start"
                  onClick={() => {
                    const id = addScene(projectId, story.id, sequence.id);
                    if (id) onOpenScene(id);
                  }}
                >
                  ＋ シーンを追加
                </Button>
              </div>
            )}
          </section>
        );
      })}

      <Button
        size="touch"
        className="w-full justify-start"
        onClick={() => addSequence(projectId, story.id)}
      >
        ＋ シークエンスを追加
      </Button>
    </div>
  );
}
