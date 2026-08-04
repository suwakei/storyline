import type { Project, Story } from "./types";

export function countScenes(story: Story) {
  return story.sequences.reduce((sum, seq) => sum + seq.scenes.length, 0);
}

export function projectStats(project: Project) {
  const sequences = project.stories.reduce(
    (sum, story) => sum + story.sequences.length,
    0,
  );
  const scenes = project.stories.reduce(
    (sum, story) => sum + countScenes(story),
    0,
  );
  return {
    stories: project.stories.length,
    sequences,
    scenes,
    characters: project.characters.length,
  };
}

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "―" : dateFormatter.format(date);
}
