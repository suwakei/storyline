import { nanoid } from "nanoid";
import {
  CHARACTER_COLORS,
  type Character,
  type Project,
  type Scene,
  type Sequence,
  type Story,
} from "./types";

export const newId = () => nanoid(12);

export function createScene(patch: Partial<Scene> = {}): Scene {
  return {
    id: newId(),
    title: "",
    summary: "",
    characterIds: [],
    timeLabel: "",
    place: "",
    status: "idea",
    memo: "",
    ...patch,
  };
}

export function createSequence(patch: Partial<Sequence> = {}): Sequence {
  return {
    id: newId(),
    title: "新しいシークエンス",
    summary: "",
    scenes: [],
    ...patch,
  };
}

export function createStory(patch: Partial<Story> = {}): Story {
  return {
    id: newId(),
    title: "新しいストーリー",
    summary: "",
    sequences: [],
    ...patch,
  };
}

export function createCharacter(
  index: number,
  patch: Partial<Character> = {},
): Character {
  return {
    id: newId(),
    name: "",
    color: CHARACTER_COLORS[index % CHARACTER_COLORS.length].value,
    role: "",
    note: "",
    ...patch,
  };
}

export function createProject(title: string): Project {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title: title.trim() || "無題の作品",
    summary: "",
    createdAt: now,
    updatedAt: now,
    characters: [],
    stories: [
      createStory({
        title: "本編",
        sequences: [createSequence({ title: "第1シークエンス" })],
      }),
    ],
  };
}
