# UI 設計 (トークン・プリミティブ・a11y)

見た目に関する正準。実装前に
[storyline-frontend-design skill](../../skills/storyline-frontend-design/SKILL.md) も参照する。

---

## 1. カラートークン

[src/app/globals.css](../../../src/app/globals.css) で CSS 変数として定義し、
Tailwind v4 の `@theme inline` でユーティリティとして公開している。

| ユーティリティ | 変数 | ライト | ダーク | 用途 |
| --- | --- | --- | --- | --- |
| `bg-bg` | `--bg` | `#f5f6f8` | `#0d0f13` | ページ背景 |
| `bg-surface` | `--surface` | `#ffffff` | `#161a20` | カード・パネル・ドロワー |
| `bg-surface2` | `--surface-2` | `#eef0f4` | `#1d222a` | 一段沈んだ面・ホバー |
| `border-line` | `--line` | `#dfe3e9` | `#2a3038` | 境界線・区切り |
| `text-fg` | `--fg` | `#14171c` | `#e7e9ec` | 本文 |
| `text-muted` | `--muted` | `#6b7280` | `#97a0ad` | 補助テキスト |
| `bg-accent` | `--accent` | `#4f46e5` | `#7d81f5` | 主アクション・選択状態 |
| `text-accentfg` | `--accent-fg` | `#ffffff` | `#0d0f13` | アクセント上の文字 |
| `text-danger` | `--danger` | `#dc2626` | `#f87171` | 破壊的操作 |

### 使い方のルール

- **生の色ユーティリティ (`text-gray-500` / `bg-slate-100` 等) を使わない**
- 半透明が要るときはトークンに不透明度を付ける (`bg-danger/10` / `bg-accent/5` /
  `hover:border-accent/60`)
- 色を増やすときは `:root` と `@media (prefers-color-scheme: dark)` の**両方**に変数を足し、
  `@theme inline` で公開してから使う

### 例外: データとしての色

| 対象 | 実装 |
| --- | --- |
| キャラクター識別色 | `CHARACTER_COLORS` (10 色) を `style={{ background: color }}` で適用 |
| シーンステータスバッジ | `SCENE_STATUSES[].className` に Tailwind の色クラスを直接持つ |

いずれも [src/lib/types.ts](../../../src/lib/types.ts) にあり、**データの一部**として扱う。
これ以外の場所に固定色を書かない。

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

足りないものは **ui.tsx に追加する**。ローカルに似たものを作らない。

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

## 関連ドキュメント

- Tailwind v4 のトークン定義方法 → [04-tailwind-v4-doc.md](../03-library-docs/04-tailwind-v4-doc.md)
- 画面構成 → [01-architecture-design.md](./01-architecture-design.md)
- 入力の重さ → [08-performance-optimization.md](./08-performance-optimization.md)
