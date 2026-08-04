---
name: storyline-frontend-design
description: storyline の UI (Next.js App Router のカンバン画面・編集ドロワー・作品一覧) を作る・整えるときに使う。公式 frontend-design skill の美的方針を土台に、本プロジェクト固有の制約 (Tailwind v4 + セマンティックトークン・ライト/ダーク両対応・ui.tsx プリミティブ優先・一望性の維持) で上書きする。コンポーネント / パネル / ダイアログの新規作成・スタイリング・ビジュアル調整が対象。このリポジトリ内では汎用の frontend-design より本スキルを優先する。
license: 派生部は本リポジトリ準拠。土台の frontend-design は Apache-2.0 (../frontend-design/LICENSE.txt)
---

storyline で UI を実装するときの設計ガイド。**公式 frontend-design skill を温存した派生版**であり、
公式の一般原則を本プロジェクトの制約に翻訳して上書きする。

## 読む順序

1. **美的方針の土台** = 公式 [frontend-design skill](../frontend-design/SKILL.md)
   (AI スロップ回避・タイポグラフィ・配色・モーション・空間構成の一般原則)。
2. **本スキル (下記)** = その一般原則を storyline の制約に落とし込んだ上書き規約。
   **公式と衝突したら必ず本スキルが優先**。
3. **詳細リファレンス** = [06-ui-design.md](../../docs/02-development-docs/06-ui-design.md)
   (トークン全定義・プリミティブ一覧・a11y チェックリスト)。

## このアプリの美的な目的

storyline は **長時間、話の構成を眺めて考えるための道具**。
「印象的な第一画面」ではなく「疲れずに読み続けられる一覧性」に美意識を割く。

- **一望性が最優先** — カード 1 枚を飾るより、20 枚並べたときに構造が読めることを取る
- **カードに情報を足すときは何かを削る** — 情報密度は上げず、優先順位を組み替える
- **控えめな彩度** — 画面内で彩度が高いのは「キャラクター識別色」と「アクセント」だけ。
  背景・枠線・本文は無彩色に近い階調で階層を作る

## 最重要オーバーライド

公式は「HTML/CSS/JS をゼロから自由に作る」前提。storyline では **色とスペーシングの判断を
トークンとプリミティブに集約し、個別コンポーネントはそれを組み合わせるだけ** にする。

- **Tailwind v4 を使う** — 素の CSS ファイルを増やさない。スタイルは className に書く。
  グローバル定義は [src/app/globals.css](../../../src/app/globals.css) のみ
- **色はセマンティックトークン経由** — [globals.css](../../../src/app/globals.css) の
  `@theme inline` が公開しているものだけを使う:

  | クラス | 用途 |
  | --- | --- |
  | `bg-bg` | ページ背景 |
  | `bg-surface` | カード・パネル・ドロワーの面 |
  | `bg-surface2` | 一段沈んだ面 (列の背景・ホバー・プレースホルダ) |
  | `border-line` | 境界線・区切り |
  | `text-fg` | 本文 |
  | `text-muted` | 補助テキスト・非活性 |
  | `bg-accent` / `text-accentfg` | 主アクション |
  | `text-danger` | 破壊的操作 |

  **`text-gray-500` / `bg-slate-100` のような生の色ユーティリティは使わない。**
  例外は「データとしての色」だけ: キャラクター識別色 (`CHARACTER_COLORS`、`style` 属性で適用) と
  シーンステータスバッジ (`SCENE_STATUSES[].className`)
- **ライト / ダーク両対応が必須** — 色は `prefers-color-scheme` で切り替わる CSS 変数として
  定義されている。新しい色が要るなら className に直書きせず、`:root` と
  `@media (prefers-color-scheme: dark)` の両方に変数を足してからトークン化する
- **プリミティブを再発明しない** — [src/components/ui.tsx](../../../src/components/ui.tsx) の
  `Button` (`primary` / `subtle` / `ghost` / `danger`) / `IconButton` / `Field` / `TextInput` /
  `TextArea` / `InlineText` / `Modal` / `Drawer` / `EmptyState` を使う。
  足りなければ ui.tsx に足す (各画面でローカルに作らない)
- **アイコンライブラリを入れない** — 現状はテキストグリフ (`✕` `⠿` `‹` `›` `＋`) で統一している。
  SVG が必要なら手書きでインラインに置く

## タイポグラフィ・スペーシング

- フォントは `--font-geist-sans` + 和文フォールバック ([globals.css](../../../src/app/globals.css))。
  新しい Web フォントを追加しない (読み込みコストと日本語表示の一貫性のため)
- サイズは Tailwind の刻みから選ぶ (`text-[11px]` のような任意値は、カードのメタ情報など
  既に使われている箇所に合わせるときだけ)
- 数字が並ぶ箇所 (シーン番号・件数) は `tabular-nums` を付ける
- 余白は既存スケールから選び、中間値を発明しない

## モーション

- `transition-colors` / `transition-shadow` 程度に留める。派手な出入りアニメは入れない
  (カンバンは dnd-kit が transform を持つため、独自アニメと競合しやすい)
- ドラッグ中の表現は既存に合わせる: ドラッグ元は `opacity-40`、`DragOverlay` は
  `rotate-1 shadow-lg`、ドロップ先の列は `bg-accent/5`

## アクセシビリティ (公式に無い本プロジェクト必須要件)

- アイコンのみのボタンは `IconButton` を使う (`aria-label` + `title` が入る)
- モーダル / ドロワーは `role="dialog"` + `aria-modal` + Escape で閉じる
  (`Modal` / `Drawer` が担保済み。独自に作らない)
- 装飾用の色チップ・ドットは `aria-hidden="true"`
- **色だけで状態を伝えない** — ステータスはバッジのラベル文字も出す
- クリック可能な `div` には `role="button"` + `tabIndex` + Enter/Space ハンドラを付ける
  (カンバンのカードがこの形)
- コントラストは WCAG AA (4.5:1) 以上

## 実装の進め方

- `src/components/` の編集は [component-builder](../../agents/component-builder.md) に委譲する。
  `src/app/` の配線と `globals.css` は親が直接編集
- 1 箇所でしか使わない UI は使う場所に直書き。ドロワー / モーダル / 繰り返す枠は ui.tsx に抽出
- 見た目を変えたら **ライト・ダーク両方** の確認をユーザに依頼する
  (Claude 側で `npm run dev` は起動しない)
