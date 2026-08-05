# UI 設計 (トークン・プリミティブ・a11y)

見た目に関する正準。実装前に
[storyline-frontend-design skill](../../skills/storyline-frontend-design/SKILL.md) も参照する。

---

## 1. カラートークン

[src/app/globals.css](../../../src/app/globals.css) で CSS 変数として定義し、
Tailwind v4 の `@theme inline` でユーティリティとして公開している。

値は **oklch** で書く。彩度 (C) を意図的に低く抑えるのが本アプリの方針で、
作家が長時間見る画面なので**色は「情報の区別」に足りる最小限**しか持たせない。
高彩度の原色はカンバン上で並ぶと本文より目立ってしまう。

| ユーティリティ | 変数 | ライト | ダーク | 用途 |
| --- | --- | --- | --- | --- |
| `bg-bg` | `--bg` | `oklch(0.975 0.003 265)` | `oklch(0.19 0.008 265)` | ページ背景 |
| `bg-surface` | `--surface` | `oklch(1 0 0)` | `oklch(0.235 0.009 265)` | カード・パネル・ドロワー |
| `bg-surface2` | `--surface-2` | `oklch(0.955 0.005 265)` | `oklch(0.275 0.01 265)` | 一段沈んだ面・ホバー |
| `border-line` | `--line` | `oklch(0.895 0.007 265)` | `oklch(0.34 0.012 265)` | 境界線・区切り |
| `text-fg` | `--fg` | `oklch(0.22 0.012 265)` | `oklch(0.92 0.006 265)` | 本文 |
| `text-muted` | `--muted` | `oklch(0.53 0.015 265)` | `oklch(0.68 0.012 265)` | 補助テキスト |
| `bg-accent` | `--accent` | `oklch(0.47 0.085 255)` | `oklch(0.72 0.075 250)` | 主アクション・選択状態 |
| `text-accentfg` | `--accent-fg` | `oklch(0.99 0 0)` | `oklch(0.19 0.01 265)` | アクセント上の文字 |
| `text-danger` | `--danger` | `oklch(0.52 0.13 25)` | `oklch(0.7 0.11 25)` | 破壊的操作 |

シーンステータス用に `--status-{idea,draft,done}` (文字色) と同 `-bg` (背景色) も同じ形で
定義してあり、`text-status-draft` / `bg-status-draft-bg` として使える。

### ネイティブ UI の追従

`:root` に `color-scheme: light dark` を置き、[layout.tsx](../../../src/app/layout.tsx) の
`viewport` export で `<meta name="color-scheme" content="light dark">` を出している
(レンダリング開始前にテーマを伝えて初期表示の白フラッシュを抑えるため。**消さない**)。
併せて `accent-color` (チェックボックス等) と `.thin-scroll` の `scrollbar-color` /
`scrollbar-width` をトークンに合わせている。macOS はオーバーレイスクロールバーのため
`scrollbar-width` を明示しないと `scrollbar-color` が無視される。

### 使い方のルール

- **生の色ユーティリティ (`text-gray-500` / `bg-slate-100` 等) を使わない**
- 半透明が要るときはトークンに不透明度を付ける (`bg-danger/10` / `bg-accent/5` /
  `hover:border-accent/60`)
- 色を増やすときは `:root` と `@media (prefers-color-scheme: dark)` の**両方**に変数を足し、
  `@theme inline` で公開してから使う。新しい色も oklch の C は 0.13 以下に収める

### 例外: データとしての色

| 対象 | 実装 |
| --- | --- |
| キャラクター識別色 | `CHARACTER_COLORS` (`{ name, value }` の 10 色) を `style` 属性で適用 |
| シーンステータスバッジ | `SCENE_STATUSES[].className` が `--status-*` トークンのクラスを持つ |

いずれも [src/lib/types.ts](../../../src/lib/types.ts) にあり、**データの一部**として扱う。
これ以外の場所に固定色を書かない。

キャラクター色を**面として塗るときはベタ塗りにしない**。
`color-mix(in oklab, ${color} 18%, var(--surface))` のように背景へ薄く混ぜ、文字は `--fg` の
まま置く ([SceneEditor](../../../src/components/SceneEditor.tsx) の登場キャラチップが基準)。
ベタ塗り + 白文字は、淡いキャラ色のときにコントラストが破綻する。
小さなドット (識別の起点) だけは色そのままで良い。

---

## 2. プリミティブ

[src/components/ui.tsx](../../../src/components/ui.tsx)。**同種の UI を各画面で作り直さない。**

| コンポーネント | 用途 |
| --- | --- |
| `Button` | `primary` / `subtle` (既定) / `ghost` / `danger` の 4 バリアント |
| `IconButton` | アイコンのみのボタン。`label` から `aria-label` と `title` を付ける |
| `Field` | ラベル + 入力 + ヒントのまとまり |
| `TextInput` / `TextArea` | 枠付き入力。`INPUT_CLASS` を共有 |
| `InlineText` | 枠なしのインライン編集。draft + デバウンス保存 |
| `Modal` | 中央のダイアログ。単発の入力向け |
| `Drawer` | 右から出るパネル。継続的な編集向け |
| `EmptyState` | 空状態 (タイトル + 説明 + アクション) |
| `Select` | 枠付きセレクト。`TextInput` / `TextArea` と同じ `INPUT_CLASS` を共有 |
| `Banner` | 1 行の通知帯。`tone="danger"` (エラー) / `"neutral"` (完了通知) の 2 トーンのみ |

足りないものは **ui.tsx に追加する**。ローカルに似たものを作らない。

### `Button` / `IconButton` の `size` prop

`size="touch"` を渡すと `md` 未満で 44×44px 相当のタップ領域になり、`md` 以上は既定
(`size="md"`、省略時と同じ) のサイズに戻る。**PC の情報密度は変えない**ためのレスポンシブ
上書きで、内部的にはクラス文字列を丸ごと入れ替える (Tailwind は同じユーティリティの
重複指定を後勝ちで解決しないため、`className` での追記ではなく `size` ごとの
クラスセットを切り替えている)。

```tsx
<Button size="touch" onClick={...}>書き出す</Button>
<IconButton label="閉じる" size="touch" onClick={...}>✕</IconButton>
```

新しく `md` 未満で操作可能になる要素を足すときは、既存プリミティブなら `size="touch"` を
使う。`Select` のような `size` prop を持たないプリミティブは `className="min-h-11"` を
明示的に足す (`INPUT_CLASS` の `py-2` だけでは 44px に届かないため)。

---

## 3. レイアウトの約束

- 作品画面は `h-[100dvh]` の縦フレックス。ヘッダ・タブは `shrink-0`、カンバンが
  `flex-1 min-h-0` で残りを埋める。**この構造を崩すと横スクロールが body に漏れる**
- 横に伸びる要素 (カンバン・タブ) は `.thin-scroll` を付けてスクロールバーを控えめにする
  (`globals.css` 定義)
- シークエンス列は `w-72` 固定。カードは列幅いっぱい
- テキストは `truncate` / `line-clamp-2` / `line-clamp-3` で溢れを止める
  (カードの高さが揃わないと一望性が落ちる)

---

## 4. タイポグラフィ

- フォント: `--font-geist-sans` + 和文フォールバック (`Hiragino Sans` / `Noto Sans JP` 等)。
  **Web フォントを追加しない**
- 本文 `text-sm`、補助 `text-xs`、カードのメタ情報 `text-[11px]`、バッジ `text-[10px]`
- 数字が並ぶ箇所 (シーン番号 `S12`・件数) は `tabular-nums`

---

## 5. アクセシビリティ (必須)

| 項目 | 実装 |
| --- | --- |
| アイコンのみのボタン | `IconButton` を使う (`aria-label` + `title`) |
| ダイアログ | `role="dialog"` + `aria-modal="true"` + `aria-label` + Escape で閉じる |
| 装飾用の色ドット | `aria-hidden="true"` |
| クリック可能な `div` | `role="button"` + `tabIndex={0}` + Enter/Space ハンドラ |
| 状態表現 | 色だけに頼らない (ステータスはラベル文字も出す) |
| コントラスト | WCAG AA (4.5:1) 以上 |

ドラッグハンドルには操作を説明する `aria-label` を付ける
(例: `"シークエンスを並べ替える"`)。現状キーボードによる並べ替えは未対応 —
実装する場合は dnd-kit の `KeyboardSensor` を検討する。

---

## 6. モーション

- `transition-colors` / `transition-shadow` に留める。派手な出入りアニメは入れない
- ドラッグ中の表現は既存に合わせる:
  - ドラッグ元のカード: `opacity-40`
  - `DragOverlay` のカード: `rotate-1 shadow-lg`
  - ドロップ先の列: `bg-accent/5`
  - ドラッグ中の列: `opacity-50`

---

## 7. ライト / ダーク

`prefers-color-scheme` による自動切替のみ。**手動テーマ切替は無い。**
見た目を変えたら両方で確認する (Claude 側で `npm run dev` は起動しないため、
ユーザに両モードでの確認を依頼する)。

---

## 8. レスポンシブ方針 (`md` = 768px)

2026-08-04 の対応で、`/projects/[projectId]` 画面はスマホ (縦リスト) を基準に設計し、
PC (カンバン) はその展開という位置づけに反転した。**PC とスマホの表現が競合したら
スマホを優先する。**

### 出し分けは CSS のみ

`md` (768px) 未満で縦リスト ([MobileSequenceList](../../../src/components/board/MobileSequenceList.tsx))、
`md` 以上で既存カンバン ([Board](../../../src/components/board/Board.tsx)) を表示する。
[projects/[projectId]/page.tsx](../../../src/app/projects/[projectId]/page.tsx) は
両方を `hidden md:block` / `md:hidden` の CSS だけで出し分け、**JS の `matchMedia` による
分岐は使わない** (SSR/CSR のハイドレーションミスマッチを避けるため)。両方の DOM が常に
マウントされるトレードオフがあるが、[08-performance-optimization.md](./08-performance-optimization.md)
の想定規模 (シーン数百件) では許容範囲としている。

```tsx
<div className="hidden h-full md:block">
  <Board ... />
</div>
<div className="h-full md:hidden">
  <MobileSequenceList ... />
</div>
```

### 縦リストの並べ替えはボタン方式 (ドラッグ不採用)

縦リストは指の上下ドラッグとページスクロールが同一軸になり、dnd-kit で区別するには
長押し猶予が要ってスクロール体験を損ねやすい。加えて D&D は
[07-drag-and-drop.md](./07-drag-and-drop.md) の言う「最も壊れやすい箇所」であるため、
**シーン・シークエンスの並べ替えは `▲ / ▼` の `IconButton` (`size="touch"`) に統一し、
`moveScene` / `moveSequence` をそのまま呼ぶ**。境界 (先頭/末尾) では `disabled` にする
([StoryTabs](../../../src/components/StoryTabs.tsx) の「‹ / ›」と同じパターン)。
シークエンス跨ぎの移動はドラッグの代わりに
[SceneEditor](../../../src/components/SceneEditor.tsx) の「所属シークエンス」`Select`
で行う (常時表示、`md` を問わない)。**PC のカンバン (`Board.tsx` 以下) のドラッグ実装は
このレスポンシブ対応の対象外**で変更していない。

### タップ領域は 44×44px (`md` 未満のみ)

WCAG 2.5.5 相当。`md` 未満で表示・到達しうる対話要素はすべて 44×44px 以上にする。
`Button` / `IconButton` の `size="touch"` prop (上記「プリミティブ」章参照) で
`md` 以上のサイズは変えずに実現する。対象は縦リストの新規要素だけでなく、
ヘッダの「キャラクター」「書き出す」・[StoryTabs](../../../src/components/StoryTabs.tsx)
の「‹ / › / ✕」・[SceneEditor](../../../src/components/SceneEditor.tsx) /
[CharacterPanel](../../../src/components/CharacterPanel.tsx) のフッターボタンなど、
`md` 未満でも表示される既存プリミティブ利用箇所を含む。カンバン専用コンポーネント
(`Board.tsx` 以下) は `md` 未満で非表示になるため対象外。

---

## 関連ドキュメント

- Tailwind v4 のトークン定義方法 → [04-tailwind-v4-doc.md](../03-library-docs/04-tailwind-v4-doc.md)
- 画面構成 → [01-architecture-design.md](./01-architecture-design.md)
- 入力の重さ → [08-performance-optimization.md](./08-performance-optimization.md)
