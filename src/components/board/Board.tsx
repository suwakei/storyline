"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";

import { Button } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Character, Scene, Story } from "@/lib/types";

import { SceneCardBody } from "./SceneCard";
import { SequenceColumn } from "./SequenceColumn";

/** 末尾に挿入したいときの番兵 */
const APPEND = Number.MAX_SAFE_INTEGER;

function findScene(story: Story, sceneId: string) {
  for (const sequence of story.sequences) {
    const index = sequence.scenes.findIndex((s) => s.id === sceneId);
    if (index !== -1)
      return { scene: sequence.scenes[index], sequence, index };
  }
  return null;
}

export function Board({
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
  const moveSequence = useStore((s) => s.moveSequence);
  const moveScene = useStore((s) => s.moveScene);

  const [dragging, setDragging] = useState<
    { type: "scene"; scene: Scene; number: number } | { type: "sequence" } | null
  >(null);

  /** 各シークエンスの先頭シーンがストーリー内で何番目から始まるか */
  const offsets: number[] = [];
  for (let i = 0, running = 0; i < story.sequences.length; i += 1) {
    offsets.push(running);
    running += story.sequences[i].scenes.length;
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    if (active.data.current?.type === "sequence") {
      setDragging({ type: "sequence" });
      return;
    }
    const found = findScene(story, String(active.id));
    if (!found) return;
    const sequenceIndex = story.sequences.indexOf(found.sequence);
    setDragging({
      type: "scene",
      scene: found.scene,
      number: offsets[sequenceIndex] + found.index + 1,
    });
  };

  /** over からドロップ先のシークエンス id と挿入位置を読む */
  const resolveTarget = (over: DragOverEvent["over"]) => {
    if (!over) return null;
    const data = over.data.current;
    if (data?.type === "scene")
      return { sequenceId: String(data.sequenceId), index: Number(data.index) };
    if (data?.type === "column")
      return { sequenceId: String(data.sequenceId), index: APPEND };
    if (data?.type === "sequence")
      return { sequenceId: String(over.id), index: APPEND };
    return null;
  };

  // シークエンスを跨いだ瞬間に移動しておくと、ドロップ先が視覚的に分かる
  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (active.data.current?.type !== "scene") return;
    const target = resolveTarget(over);
    if (!target) return;
    const fromSequenceId = String(active.data.current.sequenceId);
    if (target.sequenceId === fromSequenceId) return;
    moveScene(
      projectId,
      story.id,
      String(active.id),
      target.sequenceId,
      target.index,
    );
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    if (!over) return;

    if (active.data.current?.type === "sequence") {
      const overData = over.data.current;
      const overSequenceId =
        overData?.type === "sequence"
          ? String(over.id)
          : overData?.sequenceId
            ? String(overData.sequenceId)
            : null;
      if (!overSequenceId || overSequenceId === active.id) return;
      const from = story.sequences.findIndex((s) => s.id === active.id);
      const to = story.sequences.findIndex((s) => s.id === overSequenceId);
      if (from !== -1 && to !== -1) moveSequence(projectId, story.id, from, to);
      return;
    }

    const target = resolveTarget(over);
    if (!target) return;
    // シークエンス跨ぎは handleDragOver で済んでいるので、ここは同一列の並べ替え
    const fromSequenceId = String(active.data.current?.sequenceId);
    if (target.sequenceId !== fromSequenceId || active.id === over.id) return;
    moveScene(
      projectId,
      story.id,
      String(active.id),
      target.sequenceId,
      target.index,
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="thin-scroll flex h-full items-start gap-3 overflow-x-auto px-6 pb-6">
        <SortableContext
          items={story.sequences.map((sequence) => sequence.id)}
          strategy={horizontalListSortingStrategy}
        >
          {story.sequences.map((sequence, index) => (
            <div key={sequence.id} className="h-full max-h-full py-1">
              <SequenceColumn
                projectId={projectId}
                storyId={story.id}
                sequence={sequence}
                characters={characters}
                numberOffset={offsets[index]}
                onOpenScene={onOpenScene}
              />
            </div>
          ))}
        </SortableContext>

        <div className="shrink-0 py-1">
          <Button
            className="w-56 justify-start"
            onClick={() => addSequence(projectId, story.id)}
          >
            ＋ シークエンスを追加
          </Button>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging?.type === "scene" ? (
          <div className="w-72 opacity-95">
            <SceneCardBody
              scene={dragging.scene}
              number={dragging.number}
              characters={characters}
              dragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
