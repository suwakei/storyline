# 型定義

TypeScript 5 / `strict: true`。`any` は禁止。

---

## 1. 置き場所

| 種類 | 置き場所 |
| --- | --- |
| データモデル (`Project` / `Story` / `Sequence` / `Scene` / `Character`) | [src/lib/types.ts](../../../src/lib/types.ts) |
| データに紐づく定数 (`SCENE_STATUSES` / `CHARACTER_COLORS`) | 同上 |
| ストアの形 (`StoreState`) | [src/lib/store.ts](../../../src/lib/store.ts) |
| コンポーネントの props | 各コンポーネントの直上にインライン |

**props 用の `interface` を types.ts に集めない**。使う場所の隣にある方が変更しやすい。

---

## 2. 書き方

### データモデルは `interface`、ユニオンは `type`

```ts
export type SceneStatus = "idea" | "draft" | "done";

export interface Scene {
  id: string;
  title: string;
  /** Character.id の配列。作品から削除されたキャラの id は残さない */
  characterIds: string[];
  /** 未設定なら undefined */
  thumbnail?: string;
}
```

- フィールドの意図が自明でないものだけ JSDoc を付ける (WHY を書く。WHAT は書かない)
- 省略可能なフィールドは `?` を使い、`| undefined` を明示しない

### props はインラインの型リテラル

```tsx
export function SceneCardBody({
  scene,
  number,
  characters,
  dragging = false,
}: {
  scene: Scene;
  number: number;
  characters: Character[];
  dragging?: boolean;
}) { … }
```

DOM 属性を透過させる場合は React の型を拡張する:

```tsx
React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }
Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { … }
```

### 部分更新は `Partial<Pick<...>>` で絞る

更新できるフィールドを型で宣言する。何でも渡せる `Partial<T>` は最後の手段。

```ts
updateProject: (id: string, patch: Partial<Pick<Project, "title" | "summary">>) => void;
updateScene:   (…, patch: Partial<Omit<Scene, "id">>) => void;   // id だけは変えさせない
```

---

## 3. `any` を使わずに外部の値を扱う

外部由来 (JSON・File) は `unknown` で受け、型ガードで絞る。
語彙は [io.ts](../../../src/lib/io.ts) の `isRecord` / `str` / `arr` に統一する。

```ts
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
```

配列の絞り込みには type predicate を使う:

```ts
scene.characterIds
  .map((id) => characterIdMap.get(id))
  .filter((id): id is string => Boolean(id));

.filter((c): c is Character => Boolean(c));
```

### `as` を使ってよい場所

原則使わない。現状の例外は 2 箇所だけで、いずれも直前に実行時チェックがある:

```ts
status: (["idea", "draft", "done"].includes(status) ? status : "idea") as SceneStatus
partialize: (state) => ({ projects: state.projects }) as StoreState   // zustand persist の型都合
```

新しく `as` を書きたくなったら、まず型ガード関数で表現できないか検討する。

---

## 4. Next.js が生成する型

ルートに紐づく props は Next.js 16 が生成する型ヘルパを使う。自前で `params` の型を書かない。

```tsx
export default function RootLayout({ children }: LayoutProps<"/">) { … }
export default async function Page({ params }: PageProps<"/projects/[projectId]">) { … }
```

クライアントコンポーネントで params を読む場合は `useParams<T>()`:

```tsx
const params = useParams<{ projectId: string }>();
```

詳細は [01-next-app-router-doc.md](../03-library-docs/01-next-app-router-doc.md)。

---

## 5. 型を変えたときの確認

```
npx tsc --noEmit
npm run lint
```

型変更の影響は [02-data-model-and-persistence.md](./02-data-model-and-persistence.md) の
チェックリスト (factory → store → io → コンポーネント) を必ず通す。
特に [io.ts](../../../src/lib/io.ts) の `normalize*` は型エラーにならないまま
「読み込むと項目が消える」不具合になりやすい。
