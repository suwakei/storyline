"use client";

import { useEffect, useRef, useState } from "react";

import { Button, Drawer, Field, TextArea, TextInput } from "@/components/ui";
import { fileToThumbnail } from "@/lib/image";
import { useStore } from "@/lib/store";
import { SCENE_STATUSES, type Character, type Scene } from "@/lib/types";

/**
 * シーン編集パネル。
 * 1 文字ごとにストアへ書くとボード全体が再描画されるので、
 * ローカル draft に溜めて 300ms 止まったら保存する。閉じるときは必ず flush する。
 * 呼び出し側で key={scene.id} を付ける前提。
 */
export function SceneEditor({
  projectId,
  storyId,
  scene,
  sequenceTitle,
  characters,
  onClose,
}: {
  projectId: string;
  storyId: string;
  scene: Scene;
  sequenceTitle: string;
  characters: Character[];
  onClose: () => void;
}) {
  const updateScene = useStore((s) => s.updateScene);
  const deleteScene = useStore((s) => s.deleteScene);
  const duplicateScene = useStore((s) => s.duplicateScene);

  const [draft, setDraft] = useState<Scene>(scene);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = useRef(false);
  const flushArgs = useRef({ projectId, storyId, draft, updateScene });
  useEffect(() => {
    flushArgs.current = { projectId, storyId, draft, updateScene };
  });

  const patch = (values: Partial<Scene>) => {
    dirty.current = true;
    setDraft((current) => ({ ...current, ...values }));
  };

  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(() => {
      updateScene(projectId, storyId, draft.id, draft);
      dirty.current = false;
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  useEffect(
    () => () => {
      if (!dirty.current) return;
      const args = flushArgs.current;
      args.updateScene(args.projectId, args.storyId, args.draft.id, args.draft);
    },
    [],
  );

  const toggleCharacter = (characterId: string) =>
    patch({
      characterIds: draft.characterIds.includes(characterId)
        ? draft.characterIds.filter((id) => id !== characterId)
        : [...draft.characterIds, characterId],
    });

  const handleImage = async (file: File) => {
    setImageError(null);
    try {
      patch({ thumbnail: await fileToThumbnail(file) });
    } catch (e) {
      setImageError(
        e instanceof Error ? e.message : "画像を読み込めませんでした。",
      );
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      title={
        <span className="block truncate">
          シーン編集
          <span className="text-muted ml-2 text-xs font-normal">
            {sequenceTitle}
          </span>
        </span>
      }
      footer={
        <>
          <Button
            variant="danger"
            onClick={() => {
              if (!window.confirm("このシーンを削除します。よろしいですか？"))
                return;
              dirty.current = false;
              deleteScene(projectId, storyId, draft.id);
              onClose();
            }}
          >
            削除
          </Button>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                duplicateScene(projectId, storyId, draft.id);
                onClose();
              }}
            >
              複製
            </Button>
            <Button variant="primary" onClick={onClose}>
              閉じる
            </Button>
          </div>
        </>
      }
    >
      <Field label="タイトル">
        <TextInput
          autoFocus
          value={draft.title}
          placeholder="例: 旧校舎で遺体発見"
          onChange={(e) => patch({ title: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="時間ラベル">
          <TextInput
            value={draft.timeLabel}
            placeholder="例: 事件当日 早朝"
            onChange={(e) => patch({ timeLabel: e.target.value })}
          />
        </Field>
        <Field label="場所">
          <TextInput
            value={draft.place}
            placeholder="例: 旧校舎 3F"
            onChange={(e) => patch({ place: e.target.value })}
          />
        </Field>
      </div>

      <Field label="ステータス">
        <div className="flex gap-1.5">
          {SCENE_STATUSES.map((status) => (
            <button
              key={status.value}
              type="button"
              onClick={() => patch({ status: status.value })}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                draft.status === status.value
                  ? status.className
                  : "text-muted hover:bg-surface2"
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="あらすじ">
        <TextArea
          rows={5}
          value={draft.summary}
          placeholder="このシーンで何が起きるか"
          onChange={(e) => patch({ summary: e.target.value })}
        />
      </Field>

      <Field
        label="登場キャラクター"
        hint={
          characters.length === 0
            ? "上部の「キャラクター」からまず登録してください"
            : undefined
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {characters.map((character) => {
            const active = draft.characterIds.includes(character.id);
            return (
              <button
                key={character.id}
                type="button"
                onClick={() => toggleCharacter(character.id)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  active
                    ? "border-transparent text-white"
                    : "border-line text-muted hover:text-fg"
                }`}
                style={active ? { background: character.color } : undefined}
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: active ? "rgba(255,255,255,.85)" : character.color,
                  }}
                />
                {character.name || "名称未設定"}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="サムネイル">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImage(file);
            e.target.value = "";
          }}
        />
        {draft.thumbnail ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={draft.thumbnail}
              alt=""
              className="border-line bg-surface2 aspect-video w-full rounded-lg border object-cover"
            />
            <div className="flex gap-2">
              <Button onClick={() => fileRef.current?.click()}>差し替え</Button>
              <Button
                variant="danger"
                onClick={() => patch({ thumbnail: undefined })}
              >
                外す
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="border-line text-muted hover:border-accent hover:text-fg flex aspect-video w-full items-center justify-center rounded-lg border border-dashed text-xs transition-colors"
          >
            画像を選ぶ（未設定なら空欄のまま）
          </button>
        )}
        {imageError && (
          <p className="text-danger mt-1 text-xs">{imageError}</p>
        )}
      </Field>

      <Field label="メモ">
        <TextArea
          rows={3}
          value={draft.memo}
          placeholder="自分用の覚え書き・伏線メモなど"
          onChange={(e) => patch({ memo: e.target.value })}
        />
      </Field>
    </Drawer>
  );
}
