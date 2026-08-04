"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { statusMeta, type Character, type Scene } from "@/lib/types";

const MAX_CHIPS = 4;

export function SceneCardBody({
  scene,
  number,
  characters,
  dragging = false,
}: {
  scene: Scene;
  number: number;
  characters: Character[];
  dragging?: boolean;
}) {
  const cast = scene.characterIds
    .map((id) => characters.find((c) => c.id === id))
    .filter((c): c is Character => Boolean(c));
  const status = statusMeta(scene.status);
  const meta = [scene.timeLabel, scene.place].filter(Boolean).join(" ／ ");

  return (
    <article
      className={`bg-surface border-line overflow-hidden rounded-lg border text-left shadow-sm transition-shadow ${
        dragging ? "rotate-1 shadow-lg" : "hover:border-accent/60"
      }`}
    >
      {scene.thumbnail && (
        // 縮小済み data URL なので next/image ではなく素の img を使う
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={scene.thumbnail}
          alt=""
          className="bg-surface2 aspect-video w-full object-cover"
        />
      )}
      <div className="space-y-1.5 p-2.5">
        <div className="flex items-start gap-1.5">
          <span className="text-muted mt-px shrink-0 text-[11px] font-medium tabular-nums">
            S{number}
          </span>
          <h4
            className={`flex-1 text-sm leading-snug font-medium break-words ${
              scene.title ? "" : "text-muted"
            }`}
          >
            {scene.title || "無題のシーン"}
          </h4>
        </div>

        {meta && <p className="text-muted text-[11px] break-words">{meta}</p>}

        {scene.summary && (
          <p className="text-muted line-clamp-3 text-xs leading-relaxed">
            {scene.summary}
          </p>
        )}

        {cast.length > 0 && (
          <ul className="flex flex-wrap gap-1 pt-0.5">
            {cast.slice(0, MAX_CHIPS).map((character) => (
              <li
                key={character.id}
                className="bg-surface2 flex max-w-full items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px]"
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: character.color }}
                />
                <span className="truncate">{character.name || "名称未設定"}</span>
              </li>
            ))}
            {cast.length > MAX_CHIPS && (
              <li className="text-muted px-1 py-0.5 text-[11px]">
                +{cast.length - MAX_CHIPS}
              </li>
            )}
          </ul>
        )}

        <div className="flex justify-end pt-0.5">
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${status.className}`}
          >
            {status.label}
          </span>
        </div>
      </div>
    </article>
  );
}

export function SortableSceneCard({
  scene,
  number,
  characters,
  sequenceId,
  index,
  onOpen,
}: {
  scene: Scene;
  number: number;
  characters: Character[];
  sequenceId: string;
  index: number;
  onOpen: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: scene.id,
    data: { type: "scene", sequenceId, index },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`cursor-grab touch-none focus:outline-none ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <SceneCardBody scene={scene} number={number} characters={characters} />
    </div>
  );
}
