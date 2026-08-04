"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button, IconButton, InlineText } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Character, Sequence } from "@/lib/types";

import { SortableSceneCard } from "./SceneCard";

export function SequenceColumn({
  projectId,
  storyId,
  sequence,
  characters,
  /** ストーリー全体でのシーン通し番号の開始値 */
  numberOffset,
  onOpenScene,
}: {
  projectId: string;
  storyId: string;
  sequence: Sequence;
  characters: Character[];
  numberOffset: number;
  onOpenScene: (sceneId: string) => void;
}) {
  const updateSequence = useStore((s) => s.updateSequence);
  const deleteSequence = useStore((s) => s.deleteSequence);
  const addScene = useStore((s) => s.addScene);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sequence.id, data: { type: "sequence" } });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `col:${sequence.id}`,
    data: { type: "column", sequenceId: sequence.id },
  });

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`bg-surface2/60 border-line flex w-72 shrink-0 flex-col rounded-xl border ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <header className="border-line space-y-1 border-b px-2.5 py-2">
        <div className="flex items-center gap-1">
          <button
            {...attributes}
            {...listeners}
            aria-label="シークエンスを並べ替える"
            title="ドラッグで並べ替え"
            className="text-muted hover:text-fg cursor-grab touch-none px-1 text-sm"
          >
            ⠿
          </button>
          <InlineText
            value={sequence.title}
            placeholder="シークエンス名"
            onCommit={(title) =>
              updateSequence(projectId, storyId, sequence.id, { title })
            }
            className="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-sm font-semibold outline-none focus:bg-surface"
          />
          <span className="text-muted shrink-0 text-[11px] tabular-nums">
            {sequence.scenes.length}
          </span>
          <IconButton
            label="このシークエンスを削除"
            className="hover:text-danger"
            onClick={() => {
              if (
                sequence.scenes.length > 0 &&
                !window.confirm(
                  `「${sequence.title}」を ${sequence.scenes.length} 件のシーンごと削除します。よろしいですか？`,
                )
              )
                return;
              deleteSequence(projectId, storyId, sequence.id);
            }}
          >
            ✕
          </IconButton>
        </div>
        <InlineText
          value={sequence.summary}
          placeholder="このシークエンスの狙い"
          onCommit={(summary) =>
            updateSequence(projectId, storyId, sequence.id, { summary })
          }
          className="text-muted focus:bg-surface w-full rounded bg-transparent px-1 py-0.5 text-[11px] outline-none"
        />
      </header>

      <div
        ref={setDropRef}
        className={`thin-scroll flex-1 space-y-2 overflow-y-auto p-2 ${
          isOver ? "bg-accent/5" : ""
        }`}
      >
        <SortableContext
          items={sequence.scenes.map((scene) => scene.id)}
          strategy={verticalListSortingStrategy}
        >
          {sequence.scenes.map((scene, index) => (
            <SortableSceneCard
              key={scene.id}
              scene={scene}
              number={numberOffset + index + 1}
              characters={characters}
              sequenceId={sequence.id}
              index={index}
              onOpen={() => onOpenScene(scene.id)}
            />
          ))}
        </SortableContext>

        {sequence.scenes.length === 0 && (
          <p className="border-line text-muted rounded-lg border border-dashed py-6 text-center text-xs">
            ここにシーンをドロップ
          </p>
        )}
      </div>

      <div className="p-2 pt-0">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => {
            const id = addScene(projectId, storyId, sequence.id);
            if (id) onOpenScene(id);
          }}
        >
          ＋ シーンを追加
        </Button>
      </div>
    </section>
  );
}
