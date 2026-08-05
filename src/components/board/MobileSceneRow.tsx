"use client";

import { IconButton } from "@/components/ui";
import { statusMeta, type Character, type Scene } from "@/lib/types";

/** カンバンの MAX_CHIPS (4) より 1 少ない。幅が狭い分、表示件数も絞る (UI 仕様 §3) */
const MAX_CHIPS = 3;

/**
 * 縦リストの 1 シーン分の行。
 * サムネイル+テキスト+ステータスをまとめた <button> と、並べ替え用の
 * ▲/▼ IconButton を兄弟要素にする (role="button" の入れ子を避ける。UI 仕様 §3)。
 */
export function MobileSceneRow({
  scene,
  number,
  characters,
  onOpen,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  scene: Scene;
  number: number;
  characters: Character[];
  onOpen: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const cast = scene.characterIds
    .map((id) => characters.find((c) => c.id === id))
    .filter((c): c is Character => Boolean(c));
  const status = statusMeta(scene.status);
  const meta = [scene.timeLabel, scene.place].filter(Boolean).join(" ／ ");

  return (
    <div className="flex items-stretch gap-1.5">
      <button
        type="button"
        onClick={onOpen}
        className="bg-surface border-line hover:border-accent/60 flex min-w-0 flex-1 items-start gap-2.5 rounded-lg border p-2 text-left transition-colors"
      >
        <div className="bg-surface2 border-line h-16 w-16 shrink-0 overflow-hidden rounded-md border">
          {scene.thumbnail && (
            // 縮小済み data URL なので next/image ではなく素の img を使う (SceneCard.tsx と同じ)
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={scene.thumbnail}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start gap-1.5">
            <span className="text-muted mt-px shrink-0 text-[11px] font-medium tabular-nums">
              S{number}
            </span>
            <h4
              className={`min-w-0 flex-1 truncate text-sm leading-snug font-medium ${
                scene.title ? "" : "text-muted"
              }`}
            >
              {scene.title || "無題のシーン"}
            </h4>
          </div>

          {meta && <p className="text-muted truncate text-[11px]">{meta}</p>}

          {cast.length > 0 && (
            <ul className="flex flex-nowrap items-center gap-1.5 overflow-hidden">
              {cast.slice(0, MAX_CHIPS).map((character) => (
                <li
                  key={character.id}
                  className="flex shrink-0 items-center gap-1 text-[11px]"
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: character.color }}
                  />
                  <span className="max-w-16 truncate">
                    {character.name || "名称未設定"}
                  </span>
                </li>
              ))}
              {cast.length > MAX_CHIPS && (
                <li className="text-muted shrink-0 text-[11px]">
                  +{cast.length - MAX_CHIPS}
                </li>
              )}
            </ul>
          )}

          <div className="flex justify-end">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${status.className}`}
            >
              {status.label}
            </span>
          </div>
        </div>
      </button>

      <div className="flex shrink-0 flex-col gap-1.5">
        <IconButton
          label="シーンを上へ移動"
          size="touch"
          disabled={!canMoveUp}
          className="disabled:opacity-30"
          onClick={onMoveUp}
        >
          ▲
        </IconButton>
        <IconButton
          label="シーンを下へ移動"
          size="touch"
          disabled={!canMoveDown}
          className="disabled:opacity-30"
          onClick={onMoveDown}
        >
          ▼
        </IconButton>
      </div>
    </div>
  );
}
