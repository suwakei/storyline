# パフォーマンス最適化

このアプリの重さは **入力のたびに起きる再描画** と **サムネイル画像のサイズ** の 2 つに集約される。
ネットワークも計算量の大きい処理も無いので、それ以外は基本的に問題にならない。

---

## 1. 入力を 1 文字ごとにストアへ書かない (最重要)

ストアを更新するとカンバン全体が再描画される。100 件のシーンがある状態でタイトルを打つと、
1 文字ごとに 100 枚のカードが再計算される。

**既定は「ローカル draft → デバウンス → ストア反映」。**

### `InlineText` (枠なしインライン編集)

[src/components/ui.tsx](../../../src/components/ui.tsx)。500ms 停止で保存、blur / Enter でも保存、
Escape で取り消し。**アンマウント時に flush** するため、パネルを閉じても取りこぼさない。

```tsx
<InlineText
  value={sequence.title}
  onCommit={(title) => updateSequence(projectId, storyId, sequence.id, { title })}
/>
```

外から `value` が変わるケース (インポート等) は `key` ごと作り直される前提の実装になっている。

### `SceneEditor` (フォーム全体)

[src/components/SceneEditor.tsx](../../../src/components/SceneEditor.tsx)。
シーン 1 件を丸ごと `draft` state に持ち、300ms 停止でストアへ反映。
アンマウント時に `dirty` なら flush する。

呼び出し側で **`key={scene.id}` を付ける**こと。付けないと別シーンを開いたときに
draft が引き継がれ、他のシーンへ書き込む事故になる。

### 新しい入力を足すとき

| 入力の性質 | 使うもの |
| --- | --- |
| 単一フィールドのインライン編集 | `InlineText` |
| フォーム全体 | `SceneEditor` の draft パターン |
| チェックボックス・ボタンなど離散的な操作 | 直接ストア更新でよい |

---

## 2. セレクタを絞る

```tsx
// ✅ 必要な分だけ
const projects = useStore((s) => s.projects);
const updateScene = useStore((s) => s.updateScene);

// ❌ 全体購読 — 何が変わっても再描画される
const store = useStore();
```

zustand の既定は `Object.is` 比較。**セレクタで新しいオブジェクト / 配列を作らない**
(毎回別参照になり、常に再描画される)。

```tsx
// ❌ 毎回新しい配列
const titles = useStore((s) => s.projects.map((p) => p.title));

// ✅ 元データを取って、コンポーネント内で導出する
const projects = useStore((s) => s.projects);
```

派生値 (シーン数の集計・通し番号の offset) は [stats.ts](../../../src/lib/stats.ts) の
純粋関数か、レンダー内の素朴な計算で済ませる。現状の規模では `useMemo` は不要。

---

## 3. 画像は必ず縮小する

[src/lib/image.ts](../../../src/lib/image.ts) が長辺 640px / JPEG 0.82 に縮小してから
data URL 化する。**原寸を保存しない。**

data URL は以下すべてに載る:

- IndexedDB の保存内容 (ブラウザのストレージ枠を消費)
- エクスポート JSON (ファイルサイズが直接増える)
- 再描画時のメモリ

シーン 100 件にサムネイルを付けると、640px JPEG でおよそ数十 MB 規模になる。
縮小パラメータを変えるときは、この総量への影響を見積もること。

カード上の表示は素の `<img>` を使う (`next/image` は data URL に対して意味がない)。
`eslint-disable-next-line @next/next/no-img-element` が付いているのはこのため。

---

## 4. リストの `key`

- シーン / シークエンス / ストーリー / キャラクターの `key` は必ず **id** を使う
- index を `key` にしない (並べ替えで DOM が使い回され、入力中の draft が混線する)

---

## 5. やらないこと

| 手法 | 判断 |
| --- | --- |
| 仮想スクロール | シーン数が数百規模では不要。導入すると dnd-kit と競合する |
| `React.memo` の全面適用 | draft パターンで再描画自体を抑えているため、現状は不要 |
| Web Worker | 重い計算が存在しない |
| ストアの分割 | データが 1 つの木なので、分割は整合性の管理コストの方が高い |

体感が重いという報告があったら、**まず「どの操作が重いか」を特定する**。
入力なら draft 経路、スクロールならカードの描画内容、読み込みなら画像サイズを疑う。

---

## 関連ドキュメント

- ストア設計 → [02-data-model-and-persistence.md](./02-data-model-and-persistence.md)
- 画像の取り扱い → [03-import-export.md](./03-import-export.md)
- zustand の書き方 → [02-zustand-immer-doc.md](../03-library-docs/02-zustand-immer-doc.md)
