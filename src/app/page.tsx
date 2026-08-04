"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { Button, EmptyState, Field, Modal, TextInput } from "@/components/ui";
import { downloadProject, parseProjectJson, withFreshIds } from "@/lib/io";
import { formatDateTime, projectStats } from "@/lib/stats";
import { useStore } from "@/lib/store";

export default function ProjectListPage() {
  const hydrated = useStore((s) => s.hydrated);
  const projects = useStore((s) => s.projects);
  const addProject = useStore((s) => s.addProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const importProject = useStore((s) => s.importProject);

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    addProject(newTitle);
    setNewTitle("");
    setCreating(false);
  };

  const handleImport = async (file: File) => {
    setError(null);
    try {
      const imported = parseProjectJson(await file.text());
      const collides = projects.some((p) => p.id === imported.id);
      if (
        collides &&
        !window.confirm(
          `「${imported.title}」は既に開いています。上書きしますか？\n(キャンセルすると別の作品として取り込みます)`,
        )
      ) {
        importProject(withFreshIds(imported));
      } else {
        importProject(imported);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました。");
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">storyline</h1>
          <p className="text-muted mt-1 text-sm">
            作品 → ストーリー → シークエンス → シーンで構成を組み立てる
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => fileRef.current?.click()}>
            JSONを読み込む
          </Button>
          <Button variant="primary" onClick={() => setCreating(true)}>
            ＋ 新しい作品
          </Button>
        </div>
      </header>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImport(file);
          e.target.value = "";
        }}
      />

      {error && (
        <p className="border-danger/40 bg-danger/10 text-danger mb-4 rounded-md border px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {!hydrated ? (
        <p className="text-muted py-16 text-center text-sm">読み込み中…</p>
      ) : projects.length === 0 ? (
        <EmptyState
          title="まだ作品がありません"
          description="新しい作品を作るか、書き出した JSON を読み込んでください。データはこのブラウザ内 (IndexedDB) に保存されます。"
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              ＋ 最初の作品を作る
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => {
            const stats = projectStats(project);
            return (
              <li
                key={project.id}
                className="bg-surface border-line hover:border-accent/60 rounded-xl border p-4 transition-colors"
              >
                <Link href={`/projects/${project.id}`} className="block">
                  <h2 className="truncate font-semibold">{project.title}</h2>
                  <p className="text-muted mt-0.5 line-clamp-2 min-h-[2rem] text-xs leading-relaxed">
                    {project.summary || "説明なし"}
                  </p>
                </Link>

                <dl className="text-muted mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <div>
                    ストーリー <b className="text-fg">{stats.stories}</b>
                  </div>
                  <div>
                    シークエンス <b className="text-fg">{stats.sequences}</b>
                  </div>
                  <div>
                    シーン <b className="text-fg">{stats.scenes}</b>
                  </div>
                  <div>
                    キャラ <b className="text-fg">{stats.characters}</b>
                  </div>
                </dl>

                <div className="border-line mt-3 flex items-center justify-between border-t pt-3">
                  <span className="text-muted text-xs">
                    更新 {formatDateTime(project.updatedAt)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      onClick={() => downloadProject(project)}
                    >
                      書き出す
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (
                          window.confirm(
                            `「${project.title}」を削除します。元に戻せません。よろしいですか？`,
                          )
                        )
                          deleteProject(project.id);
                      }}
                    >
                      削除
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="新しい作品"
      >
        <Field label="作品名">
          <TextInput
            autoFocus
            value={newTitle}
            placeholder="例: 夏の終わりの事件簿"
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setCreating(false)}>キャンセル</Button>
          <Button variant="primary" onClick={handleCreate}>
            作成
          </Button>
        </div>
      </Modal>
    </main>
  );
}
