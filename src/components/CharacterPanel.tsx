"use client";

import { Button, Drawer, InlineText } from "@/components/ui";
import { useStore } from "@/lib/store";
import { CHARACTER_COLORS, type Character } from "@/lib/types";

export function CharacterPanel({
  projectId,
  characters,
  onClose,
}: {
  projectId: string;
  characters: Character[];
  onClose: () => void;
}) {
  const addCharacter = useStore((s) => s.addCharacter);
  const updateCharacter = useStore((s) => s.updateCharacter);
  const deleteCharacter = useStore((s) => s.deleteCharacter);

  return (
    <Drawer
      open
      onClose={onClose}
      title="キャラクター"
      footer={
        <>
          <span className="text-muted text-xs">{characters.length} 人</span>
          <Button
            variant="primary"
            size="touch"
            onClick={() => addCharacter(projectId)}
          >
            ＋ 追加
          </Button>
        </>
      }
    >
      {characters.length === 0 && (
        <p className="text-muted text-xs leading-relaxed">
          ここで登録したキャラクターを、各シーンに紐づけられます。
        </p>
      )}

      {characters.map((character) => (
        <div
          key={character.id}
          className="border-line space-y-2 rounded-lg border p-3"
        >
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ background: character.color }}
            />
            <InlineText
              value={character.name}
              placeholder="名前"
              onCommit={(name) =>
                updateCharacter(projectId, character.id, { name })
              }
              className="focus:bg-surface2 min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-sm font-medium outline-none"
            />
            <Button
              variant="danger"
              onClick={() => {
                if (
                  window.confirm(
                    `「${character.name || "名称未設定"}」を削除します。各シーンからも外れます。よろしいですか？`,
                  )
                )
                  deleteCharacter(projectId, character.id);
              }}
            >
              削除
            </Button>
          </div>

          <InlineText
            value={character.role}
            placeholder="立ち位置（主人公 / 敵役 など）"
            onCommit={(role) =>
              updateCharacter(projectId, character.id, { role })
            }
            className="border-line focus:border-accent w-full rounded border bg-transparent px-2 py-1 text-xs outline-none"
          />
          <InlineText
            value={character.note}
            placeholder="メモ"
            onCommit={(note) =>
              updateCharacter(projectId, character.id, { note })
            }
            className="border-line focus:border-accent w-full rounded border bg-transparent px-2 py-1 text-xs outline-none"
          />

          <div className="flex flex-wrap gap-1 pt-0.5">
            {CHARACTER_COLORS.map(({ name, value }) => {
              const selected = character.color === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-label={`色を${name}にする`}
                  aria-pressed={selected}
                  onClick={() =>
                    updateCharacter(projectId, character.id, { color: value })
                  }
                  className={`h-5 w-5 rounded-full transition-transform ${
                    selected
                      ? "ring-fg ring-offset-surface scale-110 ring-2 ring-offset-1"
                      : "hover:scale-110"
                  }`}
                  style={{ background: value }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </Drawer>
  );
}
