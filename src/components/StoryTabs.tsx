"use client";

import { Button, IconButton, InlineText } from "@/components/ui";
import { countScenes } from "@/lib/stats";
import { useStore } from "@/lib/store";
import type { Story } from "@/lib/types";

export function StoryTabs({
  projectId,
  stories,
  activeStoryId,
  onSelect,
}: {
  projectId: string;
  stories: Story[];
  activeStoryId: string;
  onSelect: (storyId: string) => void;
}) {
  const addStory = useStore((s) => s.addStory);
  const updateStory = useStore((s) => s.updateStory);
  const deleteStory = useStore((s) => s.deleteStory);
  const moveStory = useStore((s) => s.moveStory);

  return (
    <div className="thin-scroll flex items-center gap-1 overflow-x-auto px-6 pb-2">
      {stories.map((story, index) => {
        const active = story.id === activeStoryId;
        return (
          <div
            key={story.id}
            className={`flex shrink-0 items-center gap-0.5 rounded-lg border px-1.5 py-1 transition-colors ${
              active
                ? "border-accent bg-surface"
                : "border-transparent hover:bg-surface2"
            }`}
          >
            {active ? (
              <InlineText
                value={story.title}
                placeholder="ストーリー名"
                onCommit={(title) => updateStory(projectId, story.id, { title })}
                className="focus:bg-surface2 w-32 rounded bg-transparent px-1.5 py-0.5 text-sm font-semibold outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => onSelect(story.id)}
                className="text-muted hover:text-fg px-1.5 py-0.5 text-sm font-medium"
              >
                {story.title || "無題"}
              </button>
            )}

            <span className="text-muted px-1 text-[11px] tabular-nums">
              {countScenes(story)}
            </span>

            {active && (
              <>
                <IconButton
                  label="左へ移動"
                  size="touch"
                  disabled={index === 0}
                  className="disabled:opacity-30"
                  onClick={() => moveStory(projectId, index, index - 1)}
                >
                  ‹
                </IconButton>
                <IconButton
                  label="右へ移動"
                  size="touch"
                  disabled={index === stories.length - 1}
                  className="disabled:opacity-30"
                  onClick={() => moveStory(projectId, index, index + 1)}
                >
                  ›
                </IconButton>
                <IconButton
                  label="このストーリーを削除"
                  size="touch"
                  disabled={stories.length <= 1}
                  className="hover:text-danger disabled:opacity-30"
                  onClick={() => {
                    if (
                      window.confirm(
                        `「${story.title}」を配下のシークエンス・シーンごと削除します。よろしいですか？`,
                      )
                    ) {
                      const next = stories.find((s) => s.id !== story.id);
                      deleteStory(projectId, story.id);
                      if (next) onSelect(next.id);
                    }
                  }}
                >
                  ✕
                </IconButton>
              </>
            )}
          </div>
        );
      })}

      <Button
        variant="ghost"
        className="shrink-0"
        onClick={() => {
          const id = addStory(projectId);
          if (id) onSelect(id);
        }}
      >
        ＋ ストーリー
      </Button>
    </div>
  );
}
