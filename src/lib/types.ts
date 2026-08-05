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
    className: "bg-status-idea-bg text-status-idea",
  },
  {
    value: "draft",
    label: "執筆中",
    className: "bg-status-draft-bg text-status-draft",
  },
  {
    value: "done",
    label: "完了",
    className: "bg-status-done-bg text-status-done",
  },
];

export function statusMeta(status: SceneStatus) {
  return SCENE_STATUSES.find((s) => s.value === status) ?? SCENE_STATUSES[0];
}

/**
 * キャラ追加時に順番に割り当てる識別色。
 * 高彩度の原色はカンバン上で並ぶと視覚的にうるさく、本文より目立ってしまうため、
 * 彩度を落とした 10 色で「区別はつくが主張しない」ところに寄せている。
 * `name` はスウォッチの読み上げ用 (色コードを読み上げても意味が伝わらない)。
 */
export const CHARACTER_COLORS: { name: string; value: string }[] = [
  { name: "インディゴ", value: "#6b7bb5" },
  { name: "モーヴ", value: "#9a83b8" },
  { name: "ローズ", value: "#b8798f" },
  { name: "テラコッタ", value: "#c0836f" },
  { name: "サンド", value: "#bda06b" },
  { name: "オリーブ", value: "#96a36d" },
  { name: "セージ", value: "#71a288" },
  { name: "ティール", value: "#6ba3a3" },
  { name: "スカイ", value: "#6f9ac2" },
  { name: "スレート", value: "#838d9c" },
];
