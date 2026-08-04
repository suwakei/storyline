import {
  createCharacter,
  createProject,
  createScene,
  createSequence,
  createStory,
  newId,
} from "./factory";
import type {
  Character,
  Project,
  Scene,
  SceneStatus,
  Sequence,
  Story,
} from "./types";

export const EXPORT_FORMAT = "storyline.project";
export const EXPORT_VERSION = 1;

interface ExportEnvelope {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  project: Project;
}

export function toExportJson(project: Project): string {
  const envelope: ExportEnvelope = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    project,
  };
  return JSON.stringify(envelope, null, 2);
}

export function downloadProject(project: Project) {
  const blob = new Blob([toExportJson(project)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFileName(project.title)}.storyline.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeFileName(name: string) {
  const trimmed = name.trim().replace(/[\\/:*?"<>|]/g, "_");
  return trimmed || "storyline";
}

/* ------------------------------------------------------------------ *
 * インポート
 *
 * 手で編集された JSON や古いエクスポートが来ても壊れないよう、
 * 想定外の値は既定値へ落として読み込む。
 * ------------------------------------------------------------------ */

const str = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

function normalizeCharacter(raw: unknown, index: number): Character {
  const source = isRecord(raw) ? raw : {};
  return createCharacter(index, {
    id: str(source.id) || newId(),
    name: str(source.name),
    role: str(source.role),
    note: str(source.note),
    ...(typeof source.color === "string" ? { color: source.color } : {}),
  });
}

function normalizeScene(raw: unknown, knownCharacterIds: Set<string>): Scene {
  const source = isRecord(raw) ? raw : {};
  const status = str(source.status, "idea");
  const thumbnail = str(source.thumbnail);
  return createScene({
    id: str(source.id) || newId(),
    title: str(source.title),
    summary: str(source.summary),
    characterIds: arr(source.characterIds)
      .filter((id): id is string => typeof id === "string")
      .filter((id) => knownCharacterIds.has(id)),
    timeLabel: str(source.timeLabel),
    place: str(source.place),
    status: (["idea", "draft", "done"].includes(status)
      ? status
      : "idea") as SceneStatus,
    memo: str(source.memo),
    ...(thumbnail ? { thumbnail } : {}),
  });
}

function normalizeSequence(
  raw: unknown,
  knownCharacterIds: Set<string>,
): Sequence {
  const source = isRecord(raw) ? raw : {};
  return createSequence({
    id: str(source.id) || newId(),
    title: str(source.title, "無題のシークエンス"),
    summary: str(source.summary),
    scenes: arr(source.scenes).map((scene) =>
      normalizeScene(scene, knownCharacterIds),
    ),
  });
}

function normalizeStory(raw: unknown, knownCharacterIds: Set<string>): Story {
  const source = isRecord(raw) ? raw : {};
  return createStory({
    id: str(source.id) || newId(),
    title: str(source.title, "無題のストーリー"),
    summary: str(source.summary),
    sequences: arr(source.sequences).map((sequence) =>
      normalizeSequence(sequence, knownCharacterIds),
    ),
  });
}

function normalizeProject(raw: unknown): Project {
  const source = isRecord(raw) ? raw : {};
  const base = createProject(str(source.title, "無題の作品"));
  const characters = arr(source.characters).map(normalizeCharacter);
  const knownCharacterIds = new Set(characters.map((c) => c.id));
  const stories = arr(source.stories).map((story) =>
    normalizeStory(story, knownCharacterIds),
  );

  return {
    ...base,
    id: str(source.id) || base.id,
    summary: str(source.summary),
    createdAt: str(source.createdAt, base.createdAt),
    updatedAt: str(source.updatedAt, base.updatedAt),
    characters,
    // 空配列の作品はボードが出せないので、最低 1 ストーリーは確保する
    stories: stories.length > 0 ? stories : base.stories,
  };
}

/**
 * エクスポート JSON を Project に戻す。
 * エンベロープ無しの素の Project オブジェクトも受け付ける。
 * @throws 形式が読めないとき
 */
export function parseProjectJson(text: string): Project {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("JSON として読み込めませんでした。");
  }
  if (!isRecord(parsed)) throw new Error("JSON の中身が想定と違います。");

  const candidate = isRecord(parsed.project) ? parsed.project : parsed;
  if (!isRecord(candidate) || !("stories" in candidate)) {
    throw new Error("storyline のエクスポートファイルではないようです。");
  }
  return normalizeProject(candidate);
}

/** インポート時に id 衝突を避けて新規作品として取り込む */
export function withFreshIds(project: Project): Project {
  const characterIdMap = new Map<string, string>();
  const characters = project.characters.map((character) => {
    const id = newId();
    characterIdMap.set(character.id, id);
    return { ...character, id };
  });

  return {
    ...project,
    id: newId(),
    characters,
    stories: project.stories.map((story) => ({
      ...story,
      id: newId(),
      sequences: story.sequences.map((sequence) => ({
        ...sequence,
        id: newId(),
        scenes: sequence.scenes.map((scene) => ({
          ...scene,
          id: newId(),
          characterIds: scene.characterIds
            .map((id) => characterIdMap.get(id))
            .filter((id): id is string => Boolean(id)),
        })),
      })),
    })),
  };
}
