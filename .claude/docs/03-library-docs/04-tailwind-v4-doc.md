# Tailwind v4 — このリポジトリでの書き方

Tailwind CSS v4 + `@tailwindcss/postcss`。**設定ファイル (`tailwind.config.js`) は無い。**
v4 は CSS ファイル内でテーマを定義する。

---

## 1. セットアップ

[postcss.config.mjs](../../../postcss.config.mjs):

```js
export default { plugins: ["@tailwindcss/postcss"] };
```

[src/app/globals.css](../../../src/app/globals.css) の先頭:

```css
@import "tailwindcss";
```

v3 の `@tailwind base; @tailwind components; @tailwind utilities;` は使わない。

---

## 2. トークンの定義方法 (v4 の要)

このリポジトリは **2 段構え**にしている。

### ① 素の CSS 変数でライト / ダークの値を持つ

```css
:root {
  --surface: #ffffff;
  --accent: #4f46e5;
}

@media (prefers-color-scheme: dark) {
  :root {
    --surface: #161a20;
    --accent: #7d81f5;
  }
}
```

### ② `@theme inline` で Tailwind ユーティリティとして公開する

```css
@theme inline {
  --color-surface: var(--surface);
  --color-accent: var(--accent);
  --font-sans: var(--font-geist-sans);
}
```

`--color-surface` を定義すると `bg-surface` / `text-surface` / `border-surface` が生える。

**`inline` が重要**: 付けないと `@theme` 内の値がビルド時に固定され、
`prefers-color-scheme` による切り替えが効かなくなる。

### 色を追加する手順

1. `:root` に `--foo: <light>` を足す
2. `@media (prefers-color-scheme: dark)` の `:root` に `--foo: <dark>` を足す
3. `@theme inline` に `--color-foo: var(--foo);` を足す
4. `bg-foo` / `text-foo` / `border-foo` として使う

**手順 2 を飛ばさない** (ダークで色が破綻する)。

---

## 3. 命名の注意

Tailwind は `--color-*` の名前をそのままクラス名にする。ハイフンはクラス名の区切りとして
解釈されうるため、このリポジトリでは複合語をハイフン無しにしている:

| CSS 変数 | 公開名 | クラス |
| --- | --- | --- |
| `--surface-2` | `--color-surface2` | `bg-surface2` |
| `--accent-fg` | `--color-accentfg` | `text-accentfg` |

新しいトークンもこの流儀に合わせる。

---

## 4. 使い方の規約

- **生の色ユーティリティ (`text-gray-500` / `bg-slate-100`) を使わない**。
  セマンティックトークン経由にする ([06-ui-design.md](../02-development-docs/06-ui-design.md))
- 不透明度はスラッシュ記法で付ける: `bg-danger/10` / `bg-accent/5` / `border-accent/60`
- 任意値 (`text-[11px]` / `pt-[10vh]`) は、既存で使われている値に合わせるときだけ使う
- 長い className は既存コードの並び (レイアウト → 色 → 状態) に合わせる。
  Prettier の Tailwind プラグインは入っていないので、手で揃える

---

## 5. グローバル CSS に書いてよいもの

`globals.css` に書くのは次の 3 つだけ:

1. トークン定義 (`:root` / `@media` / `@theme inline`)
2. `body` の基本スタイル (背景・文字色・フォントスタック)
3. ユーティリティで表現できない装飾 — 現状は `.thin-scroll`
   (`::-webkit-scrollbar` 系はユーティリティで書けない)

**コンポーネント用のクラスを増やさない**。見た目は className に直接書く。
CSS Modules も使わない。

---

## 6. 動的な値

Tailwind はビルド時にクラス名を走査するため、**文字列連結でクラスを組み立てない**。

```tsx
// ❌ 生成されない
className={`text-${color}-500`}

// ✅ 完全なクラス名をマップに持つ
const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accentfg hover:opacity-90",
  danger: "text-danger hover:bg-danger/10",
};

// ✅ 実行時の任意色は style 属性で (キャラクター識別色)
style={{ background: character.color }}
```

---

## 7. フォント

`next/font` が生成する CSS 変数を `@theme inline` に橋渡ししている:

```tsx
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
<html className={geistSans.variable}>
```

```css
@theme inline { --font-sans: var(--font-geist-sans); }

body {
  font-family: var(--font-geist-sans), "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif;
}
```

和文フォールバックが必要なため、`body` 側でフォントスタックを明示している。
**新しい Web フォントを追加しない。**
