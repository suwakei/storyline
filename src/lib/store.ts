import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import {
  createCharacter,
  createProject,
  createScene,
  createSequence,
  createStory,
  newId,
} from "./factory";
import { STORAGE_KEY, idbStorage } from "./storage";
import type { Character, Project, Scene, Sequence, Story } from "./types";

interface StoreState {
  projects: Project[];
  /** IndexedDB からの読み込みが終わったか。false の間は描画を待つ */
  hydrated: boolean;
  setHydrated: () => void;

  // 作品
  addProject: (title: string) => string;
  importProject: (project: Project) => string;
  updateProject: (
    projectId: string,
    patch: Partial<Pick<Project, "title" | "summary">>,
  ) => void;
  deleteProject: (projectId: string) => void;

  // ストーリー
  addStory: (projectId: string) => string | undefined;
  updateStory: (
    projectId: string,
    storyId: string,
    patch: Partial<Pick<Story, "title" | "summary">>,
  ) => void;
  deleteStory: (projectId: string, storyId: string) => void;
  moveStory: (projectId: string, from: number, to: number) => void;

  // シークエンス
  addSequence: (projectId: string, storyId: string) => string | undefined;
  updateSequence: (
    projectId: string,
    storyId: string,
    sequenceId: string,
    patch: Partial<Pick<Sequence, "title" | "summary">>,
  ) => void;
  deleteSequence: (
    projectId: string,
    storyId: string,
    sequenceId: string,
  ) => void;
  moveSequence: (
    projectId: string,
    storyId: string,
    from: number,
    to: number,
  ) => void;

  // シーン
  addScene: (
    projectId: string,
    storyId: string,
    sequenceId: string,
  ) => string | undefined;
  updateScene: (
    projectId: string,
    storyId: string,
    sceneId: string,
    patch: Partial<Omit<Scene, "id">>,
  ) => void;
  deleteScene: (projectId: string, storyId: string, sceneId: string) => void;
  duplicateScene: (projectId: string, storyId: string, sceneId: string) => void;
  /** シークエンス跨ぎの移動と同一シークエンス内の並べ替えを兼ねる */
  moveScene: (
    projectId: string,
    storyId: string,
    sceneId: string,
    toSequenceId: string,
    toIndex: number,
  ) => void;

  // キャラクター
  addCharacter: (projectId: string) => string | undefined;
  updateCharacter: (
    projectId: string,
    characterId: string,
    patch: Partial<Omit<Character, "id">>,
  ) => void;
  deleteCharacter: (projectId: string, characterId: string) => void;
}

/** 配列の要素を from から to へ移動する (in-place) */
function moveItem<T>(list: T[], from: number, to: number) {
  if (from < 0 || from >= list.length) return;
  const clamped = Math.max(0, Math.min(to, list.length - 1));
  const [item] = list.splice(from, 1);
  list.splice(clamped, 0, item);
}

export const useStore = create<StoreState>()(
  persist(
    immer((set) => {
      /** 作品を引き当てて更新日時を進めつつ変更を適用する */
      const editProject = (
        projectId: string,
        recipe: (project: Project) => void,
      ) =>
        set((state) => {
          const project = state.projects.find((p) => p.id === projectId);
          if (!project) return;
          recipe(project);
          project.updatedAt = new Date().toISOString();
        });

      const editStory = (
        projectId: string,
        storyId: string,
        recipe: (story: Story, project: Project) => void,
      ) =>
        editProject(projectId, (project) => {
          const story = project.stories.find((s) => s.id === storyId);
          if (story) recipe(story, project);
        });

      const findSceneLocation = (story: Story, sceneId: string) => {
        for (const sequence of story.sequences) {
          const index = sequence.scenes.findIndex((sc) => sc.id === sceneId);
          if (index !== -1) return { sequence, index };
        }
        return null;
      };

      return {
        projects: [],
        hydrated: false,
        setHydrated: () =>
          set((state) => {
            state.hydrated = true;
          }),

        addProject: (title) => {
          const project = createProject(title);
          set((state) => {
            state.projects.unshift(project);
          });
          return project.id;
        },

        importProject: (project) => {
          set((state) => {
            const existing = state.projects.findIndex(
              (p) => p.id === project.id,
            );
            if (existing === -1) state.projects.unshift(project);
            else state.projects[existing] = project;
          });
          return project.id;
        },

        updateProject: (projectId, patch) =>
          editProject(projectId, (project) => {
            Object.assign(project, patch);
          }),

        deleteProject: (projectId) =>
          set((state) => {
            state.projects = state.projects.filter((p) => p.id !== projectId);
          }),

        addStory: (projectId) => {
          const story = createStory({
            sequences: [createSequence({ title: "第1シークエンス" })],
          });
          editProject(projectId, (project) => {
            project.stories.push(story);
          });
          return story.id;
        },

        updateStory: (projectId, storyId, patch) =>
          editStory(projectId, storyId, (story) => {
            Object.assign(story, patch);
          }),

        deleteStory: (projectId, storyId) =>
          editProject(projectId, (project) => {
            project.stories = project.stories.filter((s) => s.id !== storyId);
          }),

        moveStory: (projectId, from, to) =>
          editProject(projectId, (project) => {
            moveItem(project.stories, from, to);
          }),

        addSequence: (projectId, storyId) => {
          const sequence = createSequence();
          editStory(projectId, storyId, (story) => {
            sequence.title = `第${story.sequences.length + 1}シークエンス`;
            story.sequences.push(sequence);
          });
          return sequence.id;
        },

        updateSequence: (projectId, storyId, sequenceId, patch) =>
          editStory(projectId, storyId, (story) => {
            const sequence = story.sequences.find((s) => s.id === sequenceId);
            if (sequence) Object.assign(sequence, patch);
          }),

        deleteSequence: (projectId, storyId, sequenceId) =>
          editStory(projectId, storyId, (story) => {
            story.sequences = story.sequences.filter(
              (s) => s.id !== sequenceId,
            );
          }),

        moveSequence: (projectId, storyId, from, to) =>
          editStory(projectId, storyId, (story) => {
            moveItem(story.sequences, from, to);
          }),

        addScene: (projectId, storyId, sequenceId) => {
          const scene = createScene();
          editStory(projectId, storyId, (story) => {
            const sequence = story.sequences.find((s) => s.id === sequenceId);
            if (sequence) sequence.scenes.push(scene);
          });
          return scene.id;
        },

        updateScene: (projectId, storyId, sceneId, patch) =>
          editStory(projectId, storyId, (story) => {
            const found = findSceneLocation(story, sceneId);
            if (found) Object.assign(found.sequence.scenes[found.index], patch);
          }),

        deleteScene: (projectId, storyId, sceneId) =>
          editStory(projectId, storyId, (story) => {
            const found = findSceneLocation(story, sceneId);
            if (found) found.sequence.scenes.splice(found.index, 1);
          }),

        duplicateScene: (projectId, storyId, sceneId) =>
          editStory(projectId, storyId, (story) => {
            const found = findSceneLocation(story, sceneId);
            if (!found) return;
            const original = found.sequence.scenes[found.index];
            const copy = createScene({
              ...original,
              id: newId(),
              characterIds: [...original.characterIds],
              title: original.title ? `${original.title} (コピー)` : "",
            });
            found.sequence.scenes.splice(found.index + 1, 0, copy);
          }),

        moveScene: (projectId, storyId, sceneId, toSequenceId, toIndex) =>
          editStory(projectId, storyId, (story) => {
            const found = findSceneLocation(story, sceneId);
            const target = story.sequences.find((s) => s.id === toSequenceId);
            if (!found || !target) return;
            const [scene] = found.sequence.scenes.splice(found.index, 1);
            const index = Math.max(0, Math.min(toIndex, target.scenes.length));
            target.scenes.splice(index, 0, scene);
          }),

        addCharacter: (projectId) => {
          let id: string | undefined;
          editProject(projectId, (project) => {
            const character = createCharacter(project.characters.length);
            id = character.id;
            project.characters.push(character);
          });
          return id;
        },

        updateCharacter: (projectId, characterId, patch) =>
          editProject(projectId, (project) => {
            const character = project.characters.find(
              (c) => c.id === characterId,
            );
            if (character) Object.assign(character, patch);
          }),

        deleteCharacter: (projectId, characterId) =>
          editProject(projectId, (project) => {
            project.characters = project.characters.filter(
              (c) => c.id !== characterId,
            );
            // 参照が残るとシーン側で幽霊チップになるため一緒に外す
            for (const story of project.stories)
              for (const sequence of story.sequences)
                for (const scene of sequence.scenes)
                  scene.characterIds = scene.characterIds.filter(
                    (id) => id !== characterId,
                  );
          }),
      };
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ projects: state.projects }) as StoreState,
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
