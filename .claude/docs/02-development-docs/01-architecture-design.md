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
├─ proxy.ts                         未ログインを /login へ飛ばす楽観的リダイレクト
├─ app/
│  ├─ layout.tsx                    ルート要素・フォント・metadata
│  ├─ globals.css                   Tailwind v4 + セマンティックトークン
│  ├─ page.tsx                      作品一覧 (/)            認証を検証して ProjectList を描く
│  ├─ login/page.tsx                ログイン (/login)       LoginCard を描く
│  ├─ api/auth/[...nextauth]/route.ts  Auth.js のハンドラ
│  └─ projects/[projectId]/page.tsx 作品画面 (/projects/<id>) 認証を検証して ProjectWorkspace を描く
├─ components/
│  ├─ ui.tsx                        汎用プリミティブ
│  ├─ ProjectList.tsx               作品一覧の中身 (/ の実体)
│  ├─ ProjectWorkspace.tsx          作品画面の中身 (/projects/<id> の実体)
│  ├─ LoginCard.tsx                 ログインカード (/login の実体)
│  ├─ AccountMenu.tsx               アカウントメニュー (下シート / ポップオーバー)
│  ├─ StoryTabs.tsx                 ストーリー切替タブ
│  ├─ SceneEditor.tsx               シーン編集ドロワー
│  ├─ CharacterPanel.tsx            キャラクター管理ドロワー
│  └─ board/
│     ├─ Board.tsx                  DndContext・ドラッグ処理・列の並び (md 以上のみ表示)
│     ├─ SequenceColumn.tsx         列 (シークエンス、md 以上のみ表示)
│     ├─ SceneCard.tsx              カード (シーン) 本体と sortable ラッパ (md 以上のみ表示)
│     ├─ MobileSequenceList.tsx     縦リスト本体 (md 未満のみ表示、上下ボタンで並べ替え)
│     └─ MobileSceneRow.tsx         縦リストの 1 シーン行
└─ lib/                             types / factory / store / storage / io / image / stats
                                    ＋ 認証: auth / auth-actions / auth-errors / invite / prisma
```

### `md` (768px) を境にした出し分け

[projects/[projectId]/page.tsx](../../../src/app/projects/[projectId]/page.tsx) は
`Board` (カンバン) と `MobileSequenceList` (縦リスト) の**両方を常にマウント**し、
`hidden md:block` / `md:hidden` の CSS だけで表示を切り替える。JS の `matchMedia` による
分岐は使わない (SSR/CSR のハイドレーションミスマッチを避けるため)。詳細は
[06-ui-design.md](./06-ui-design.md) の「レスポンシブ方針」章を参照。

`MobileSequenceList` はシークエンス・シーンの並べ替えを `▲ / ▼` ボタンで行い、
`Board` のドラッグ実装 (`DndContext` / `moveScene` の `onDragOver` 呼び出し等) には
一切依存しない。呼ぶストア関数 (`moveScene` / `moveSequence`) は共通だが、呼び出し方は
別物。詳しくは [07-drag-and-drop.md](./07-drag-and-drop.md) と
[06-ui-design.md](./06-ui-design.md) を参照。

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

作品データが IndexedDB にあるため、**ストアを読む画面はすべてクライアントコンポーネント**になる。
一方、認証はサーバ側にしか置けない。したがって **`app/**/page.tsx` は「認証を検証して
クライアントコンポーネントを 1 個描くだけの Server Component」**という形に統一している。

| ファイル | 種別 |
| --- | --- |
| `app/layout.tsx` | Server Component (metadata・フォント) |
| `app/page.tsx` / `app/projects/[projectId]/page.tsx` / `app/login/page.tsx` | Server Component (`auth()` で認証を検証してから描く) |
| `app/api/auth/[...nextauth]/route.ts` | Route Handler (Auth.js のハンドラ) |
| `src/proxy.ts` | Proxy (旧 middleware)。Cookie の有無だけを見る楽観的リダイレクト |
| `src/components/**` | すべて `"use client"` (`ProjectList` / `ProjectWorkspace` が各ページの中身) |

新しいページを足すときも、ストアを読むなら `"use client"` を付ける。

### 認可をどこで判定するか

- **`src/proxy.ts` は判定の本体ではない。** Next.js 公式が「Proxy を完全な認証・認可の
  解決策として使うな」「Server Function は Proxy だけでは守れない」と明記しているため、
  ここではセッション Cookie の有無だけを見て `/login?callbackUrl=…` へ飛ばす
- **判定の本体は各ページ / Server Function の `auth()`**。ページは
  [src/lib/auth.ts](../../../src/lib/auth.ts) の `requireSession()` を入口で呼ぶ。
  Layout では判定しない (Partial Rendering でナビゲーションのたびに再実行されないため)
- **誰がアカウントを作れるか**は招待コード (`AUTH_INVITE_CODE`) が決める。照合は
  [src/lib/invite.ts](../../../src/lib/invite.ts) の定数時間比較でサーバ側だけで行い、
  ブラウザへ渡すのは短命の httpOnly クッキー (コードそのものは入れない)。
  **`src/lib/invite.ts` は `node:crypto` に依存するのでクライアントから import しない**

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
