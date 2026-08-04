# Next.js 16 App Router — このリポジトリでの書き方

**このバージョンは学習データの Next.js と異なる。** 推測で書かず、迷ったら
`node_modules/next/dist/docs/` の該当ガイドを読む (リポジトリ直下の
[AGENTS.md](../../../AGENTS.md) が同じ指示を出している。あのブロックは `next dev` が
自動生成するので消さない)。

インストール版: **Next.js 16.3.0 / React 19.2.8**。

---

## 1. 学習データとの主な差分

| 項目 | Next.js 16 での実際 |
| --- | --- |
| バンドラ | **Turbopack が既定**。`--turbopack` フラグは不要 |
| `params` / `searchParams` | **Promise**。`await` (Server) または `use()` (Client) で解く |
| `cookies()` / `headers()` / `draftMode()` | 非同期。`await` が必要 |
| ルート props の型 | グローバルな `PageProps<Route>` / `LayoutProps<Route>` を使う (import 不要) |
| Lint | `next lint` は廃止。**ESLint CLI を直接叩く** (`package.json` は `"lint": "eslint"`) |
| `middleware.ts` | `proxy` 規約に置き換わった |
| Node.js | 20.9 以上、TypeScript 5.1 以上 |

---

## 2. このリポジトリのルート構成

```
src/app/
├─ layout.tsx                      ルートレイアウト (Server Component)
├─ globals.css
├─ page.tsx                        "/"                   ("use client")
├─ favicon.ico
└─ projects/[projectId]/page.tsx   "/projects/<id>"      ("use client")
```

### ルートレイアウト

```tsx
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="bg-bg text-fg flex min-h-full flex-col">{children}</body>
    </html>
  );
}
```

- `LayoutProps<"/">` は **import せずに使える** (Next.js が型を生成する)
- `<html>` と `<body>` はルートレイアウトにのみ書く
- フォントは `next/font/google` で読み、CSS 変数として渡す

### 動的ルート

このアプリのデータはブラウザ内 (IndexedDB) にあるため、作品画面は
**クライアントコンポーネントで `useParams()` を使う**:

```tsx
"use client";
import { useParams } from "next/navigation";

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  …
}
```

Server Component / 非同期取得が要る場合は `params` を解く:

```tsx
// Server Component
export default async function Page({ params }: PageProps<"/projects/[projectId]"> ) {
  const { projectId } = await params;
}

// Client Component (props で受ける場合)
import { use } from "react";
export default function Page({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = use(params);
}
```

**`params` を同期的なオブジェクトとして扱わない** (Next.js 15 以前の書き方)。

---

## 3. クライアント / サーバの境界

このアプリでは **ストアを読む画面はすべて `"use client"`**。IndexedDB はブラウザにしか無く、
サーバでは初期化できないため。

| 使えるもの | 使わないもの (このプロジェクトに存在しない) |
| --- | --- |
| Client Component / hooks | Server Actions (`"use server"`) |
| `useParams` / `useRouter` / `Link` | Route Handler (`app/api/**/route.ts`) |
| `metadata` (静的) | `cookies()` / `headers()` / `proxy` |
| `next/font` | ISR / `revalidate` / データキャッシュ |

サーバを追加する提案は「サーバを持たない」という前提の変更にあたるため、
実装前にユーザ確認が必要 ([CLAUDE.md](../../CLAUDE.md))。

---

## 4. ナビゲーション

```tsx
import Link from "next/link";
<Link href={`/projects/${project.id}`}>…</Link>
```

- ページ間遷移は `Link`。`window.location` を使わない
- 遷移は 2 画面だけ (一覧 ↔ 作品画面)。パネルはドロワーで表現する
  ([01-architecture-design.md](../02-development-docs/01-architecture-design.md))

---

## 5. metadata

```tsx
export const metadata: Metadata = {
  title: "storyline",
  description: "シナリオの時系列とキャラクターのつながりを整理するツール",
};
```

クライアントコンポーネントでは `metadata` を export できない。
動的ルートで作品名を出したい場合の選択肢は
[10-seo-and-metadata.md](../02-development-docs/10-seo-and-metadata.md) を参照。

---

## 6. 画像

サムネイルは data URL なので `next/image` の最適化対象外。素の `<img>` を使い、
その行に `// eslint-disable-next-line @next/next/no-img-element` を付ける
(既存コードと同じ形にする)。

---

## 7. 設定ファイル

| ファイル | 内容 |
| --- | --- |
| [next.config.ts](../../../next.config.ts) | 現状オプション無し。`output: "export"` は使っていない |
| [tsconfig.json](../../../tsconfig.json) | `paths: { "@/*": ["./src/*"] }`、`.next/types` を include |
| [eslint.config.mjs](../../../eslint.config.mjs) | flat config。`eslint-config-next` の core-web-vitals + typescript |
| [postcss.config.mjs](../../../postcss.config.mjs) | `@tailwindcss/postcss` のみ |

インポートは `@/` エイリアスを使う (`@/lib/store` / `@/components/ui`)。
相対パスの `../../` を書かない。

---

## 8. 迷ったら読むガイド (バンドル済み)

```
node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md
node_modules/next/dist/docs/01-app/02-guides/single-page-applications.md
node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
```
