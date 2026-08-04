/**
 * データモデル
 *
 * 作品(Project) > ストーリー(Story) > シークエンス(Sequence) > シーン(Scene)
 *
 * 並び順は配列の順序そのもの (order フィールドは持たない)。
 * 作品内の「時間」は timeLabel の自由テキストで表し、実際の順序はシーンの並び順が担う。
 */

export type SceneStatus = "idea" | "draft" | "done";

export interface Character {
  id: string;
  name: string;
  /** 相関図・シーンチップで使う識別色 (hex) */
  color: string;
  /** 立ち位置。主人公 / 敵役 など自由テキスト */
  role: string;
  note: string;
}

export interface Scene {
  id: string;
  title: string;
  summary: string;
  /** Character.id の配列。作品から削除されたキャラの id は残さない */
  characterIds: string[];
  /** 「事件当日 早朝」など自由テキスト */
  timeLabel: string;
  place: string;
  status: SceneStatus;
  memo: string;
  /** 縮小済み data URL。未設定なら undefined */
  thumbnail?: string;
}

export interface Sequence {
  id: string;
  title: string;
  summary: string;
  scenes: Scene[];
}

export interface Story {
  id: string;
  title: string;
  summary: string;
  sequences: Sequence[];
}

export interface Project {
  id: string;
  title: string;
  summary: string;
  /** ISO 8601 */
  createdAt: string;
  updatedAt: string;
  characters: Character[];
  stories: Story[];
}

export const SCENE_STATUSES: {
  value: SceneStatus;
  label: string;
  /** バッジ用 Tailwind クラス */
  className: string;
}[] = [
  {
    value: "idea",
    label: "プロット",
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
  {
    value: "draft",
    label: "執筆中",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  },
  {
    value: "done",
    label: "完了",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  },
];

export function statusMeta(status: SceneStatus) {
  return SCENE_STATUSES.find((s) => s.value === status) ?? SCENE_STATUSES[0];
}

/** キャラ追加時に順番に割り当てる色 */
export const CHARACTER_COLORS = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#8b5cf6",
  "#ef4444",
  "#84cc16",
  "#f97316",
  "#14b8a6",
];
