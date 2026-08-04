# アーキテクチャ設計

storyline の実装構造。コンポーネントを追加する / 画面構成を変えるときはここを最初に読む。

---

## 1. レイヤは 2 つだけ

| ディレクトリ | 役割 | React 依存 |
| --- | --- | --- |
| [src/lib/](../../../src/lib/) | データモデル・ストア・永続化・入出力・純粋関数 | `store.ts` のみ |
| [src/components/](../../../src/components/) | 表示と入力 | あり |

`src/app/` はルーティングと配線だけを担い、ロジックを持たない。
**この 2 層以外 (services/ や contexts/ など) を作らない。**

```
src/
├─ app/
│  ├─ layout.tsx                    ルート要素・フォント・metadata
│  ├─ globals.css                   Tailwind v4 + セマンティックトークン
│  ├─ page.tsx                      作品一覧 (/)
│  └─ projects/[projectId]/page.tsx 作品画面 (/projects/<id>)
├─ components/
│  ├─ ui.tsx                        汎用プリミティブ
│  ├─ StoryTabs.tsx                 ストーリー切替タブ
│  ├─ SceneEditor.tsx               シーン編集ドロワー
│  ├─ CharacterPanel.tsx            キャラクター管理ドロワー
│  └─ board/
│     ├─ Board.tsx                  DndContext・ドラッグ処理・列の並び
│     ├─ SequenceColumn.tsx         列 (シークエンス)
│     └─ SceneCard.tsx              カード (シーン) 本体と sortable ラッパ
└─ lib/                             types / factory / store / storage / io / image / stats
```

---

## 2. 状態の持ち方

### 永続する状態 = zustand ストア 1 つ

[src/lib/store.ts](../../../src/lib/store.ts) の `useStore` がすべての作品データを持つ。
**ストアを増やさない。Context も使わない。**

```tsx
// 必要な分だけセレクタで取る (全体購読は全画面の再描画を招く)
const projects = useStore((s) => s.projects);
const updateScene = useStore((s) => s.updateScene);
```

### 永続しない状態 = 各コンポーネントの `useState`

| 状態 | 持ち主 |
| --- | --- |
| 開いているシーン / ドロワーの開閉 | [projects/[projectId]/page.tsx](../../../src/app/projects/[projectId]/page.tsx) |
| 選択中のストーリー | 同上 (`activeStoryId`) |
| 入力中の draft | `InlineText` / `SceneEditor` |
| ドラッグ中の対象 | `Board` |

### 「あるものから導出する」原則

選択中の ID は保持するが、**実体は毎回ストアから引き直す**。

```tsx
const activeStory = stories.find((s) => s.id === activeStoryId) ?? stories[0] ?? null;
const openScene = locateScene(activeStory, openSceneId);
```

削除された対象は自然に `null` になり、パネルが勝手に閉じる。
削除時に「開いているパネルを閉じる」処理を書かなくて済む。

---

## 3. クライアント / サーバ境界

データが IndexedDB にあるため、**ストアを読む画面はすべてクライアントコンポーネント**になる。

| ファイル | 種別 |
| --- | --- |
| `app/layout.tsx` | サーバコンポーネント (metadata・フォント) |
| `app/page.tsx` / `app/projects/[projectId]/page.tsx` | `"use client"` |
| `src/components/**` | すべて `"use client"` |

新しいページを足すときも、ストアを読むなら `"use client"` を付ける。
Server Component にできるのは静的な枠だけ。

### ハイドレーション待ち

`persist` の読み込みは非同期なので、`hydrated` が `true` になるまで中身を描かない。

```tsx
const hydrated = useStore((s) => s.hydrated);
if (!hydrated) return <p>読み込み中…</p>;
```

これを忘れると「一瞬 0 件が見える」「空状態が出てから作品が出る」ちらつきになる。

---

## 4. パネルの使い分け

| 種類 | 用途 | 実装 |
| --- | --- | --- |
| `Drawer` (右から) | 継続的な編集 (シーン編集・キャラ管理) | [ui.tsx](../../../src/components/ui.tsx) |
| `Modal` (中央) | 単発の入力 (新規作品名) | 同上 |
| `window.confirm` | 破壊的操作の確認 | 直接呼ぶ |

**画面遷移は 2 つだけ** (一覧 ↔ 作品画面)。それ以外はドロワーで併置し、カンバンを見たまま
編集できる状態を保つ。新しい画面を足す前に、ドロワーで済まないか検討する。

編集内容は閉じる操作で確定する (保存ボタンを置かない)。ドロワーのアンマウント時に
draft を flush する実装になっているため、**`key` を付けて対象ごとに作り直す**こと:

```tsx
<SceneEditor key={openScene.scene.id} ... />
```

---

## 5. コンポーネントを追加するときの判断

1. **ui.tsx のプリミティブで組めないか** — 組めるなら新規ファイルを作らない
2. **1 箇所でしか使わないか** — 使う場所に直書きする
3. **繰り返す枠 / ドロワー / モーダルか** — ui.tsx に抽出する
4. **カンバンの部品か** — `components/board/` に置く

props は「ストアから引いた値 + コールバック」を渡す形に寄せる。
子コンポーネントがストアを直接触るのは、更新関数 (`useStore((s) => s.updateX)`) までとする。

---

## 関連ドキュメント

- ストア操作の追加 → [02-data-model-and-persistence.md](./02-data-model-and-persistence.md)
- 見た目・トークン → [06-ui-design.md](./06-ui-design.md)
- ドラッグ & ドロップ → [07-drag-and-drop.md](./07-drag-and-drop.md)
- Next.js の書き方 → [01-next-app-router-doc.md](../03-library-docs/01-next-app-router-doc.md)
