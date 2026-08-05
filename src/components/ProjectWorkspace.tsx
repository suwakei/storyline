"use client";

import Link from "next/link";
import { useState } from "react";

import { Board } from "@/components/board/Board";
import { MobileSequenceList } from "@/components/board/MobileSequenceList";
import { CharacterPanel } from "@/components/CharacterPanel";
import { SceneEditor } from "@/components/SceneEditor";
import { StoryTabs } from "@/components/StoryTabs";
import { Button, InlineText } from "@/components/ui";
import { downloadProject } from "@/lib/io";
import { useStore } from "@/lib/store";
import type { Story } from "@/lib/types";

/** 開いているシーンと、その所属シークエンスを引く */
function locateScene(story: Story | null, sceneId: string | null) {
  if (!story || !sceneId) return null;
  for (const sequence of story.sequences) {
    const scene = sequence.scenes.find((s) => s.id === sceneId);
    if (scene) return { scene, sequence };
  }
  return null;
}

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const hydrated = useStore((s) => s.hydrated);
  const project = useStore((s) => s.projects.find((p) => p.id === projectId));
  const updateProject = useStore((s) => s.updateProject);

  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [openSceneId, setOpenSceneId] = useState<string | null>(null);
  const [charactersOpen, setCharactersOpen] = useState(false);

  const stories = project?.stories ?? [];
  // 選択中のストーリーが消えた場合も含め、常に「あるもの」から導出する
  const activeStory =
    stories.find((s) => s.id === activeStoryId) ?? stories[0] ?? null;
  // 削除されたシーンは locateScene が null を返すので、パネルは自然に閉じる
  const openScene = locateScene(activeStory, openSceneId);

  if (!hydrated) {
    return <p className="text-muted p-10 text-center text-sm">読み込み中…</p>;
  }

  if (!project) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm">この作品は見つかりませんでした。</p>
        <Link href="/" className="text-accent mt-3 inline-block text-sm">
          ← 作品一覧へ戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="border-line shrink-0 border-b px-6 pt-4 pb-2">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="text-muted hover:text-fg shrink-0 text-sm"
            title="作品一覧へ"
          >
            ← 一覧
          </Link>
          <InlineText
            value={project.title}
            placeholder="作品名"
            onCommit={(title) => updateProject(project.id, { title })}
            className="focus:bg-surface2 min-w-0 flex-1 rounded bg-transparent px-1.5 py-0.5 text-lg font-bold outline-none"
          />
          <div className="flex shrink-0 gap-2">
            <Button size="touch" onClick={() => setCharactersOpen(true)}>
              キャラクター
              <span className="text-muted text-xs tabular-nums">
                {project.characters.length}
              </span>
            </Button>
            <Button size="touch" onClick={() => downloadProject(project)}>
              書き出す
            </Button>
          </div>
        </div>
        <InlineText
          value={project.summary}
          placeholder="作品のログライン・メモ"
          onCommit={(summary) => updateProject(project.id, { summary })}
          className="text-muted focus:bg-surface2 mt-1 w-full rounded bg-transparent px-1.5 py-0.5 text-xs outline-none"
        />
      </header>

      <div className="shrink-0 pt-2">
        <StoryTabs
          projectId={project.id}
          stories={stories}
          activeStoryId={activeStory?.id ?? ""}
          onSelect={setActiveStoryId}
        />
      </div>

      <main className="min-h-0 flex-1">
        {activeStory && (
          <>
            {/* md 以上: 既存カンバン (ドラッグ)。CSS のみで出し分け、両方の DOM は常にマウントされる */}
            <div className="hidden h-full md:block">
              <Board
                projectId={project.id}
                story={activeStory}
                characters={project.characters}
                onOpenScene={setOpenSceneId}
              />
            </div>
            {/* md 未満: 縦リスト (上下ボタンで並べ替え) */}
            <div className="h-full md:hidden">
              <MobileSequenceList
                projectId={project.id}
                story={activeStory}
                characters={project.characters}
                onOpenScene={setOpenSceneId}
              />
            </div>
          </>
        )}
      </main>

      {openScene && activeStory && (
        <SceneEditor
          key={openScene.scene.id}
          projectId={project.id}
          storyId={activeStory.id}
          scene={openScene.scene}
          sequenceId={openScene.sequence.id}
          sequenceTitle={openScene.sequence.title}
          sequences={activeStory.sequences}
          characters={project.characters}
          onClose={() => setOpenSceneId(null)}
        />
      )}

      {charactersOpen && (
        <CharacterPanel
          projectId={project.id}
          characters={project.characters}
          onClose={() => setCharactersOpen(false)}
        />
      )}
    </div>
  );
}
