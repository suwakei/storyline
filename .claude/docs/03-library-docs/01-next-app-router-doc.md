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
src/
├─ proxy.ts                            Proxy (旧 middleware)。未ログインを /login へ飛ばす
└─ app/
   ├─ layout.tsx                       ルートレイアウト (Server Component)
   ├─ globals.css
   ├─ page.tsx                         "/"                    (Server Component)
   ├─ favicon.ico
   ├─ login/page.tsx                   "/login"               (Server Component)
   ├─ api/auth/[...nextauth]/route.ts  "/api/auth/*"          (Auth.js のハンドラ)
   └─ projects/[projectId]/page.tsx    "/projects/<id>"       (Server Component)
```

各 `page.tsx` は **認証を検証してクライアントコンポーネントを 1 個描くだけ**にしてある
(中身は `src/components/ProjectList.tsx` / `ProjectWorkspace.tsx` / `LoginCard.tsx`)。

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

`page.tsx` は認証の検証が要るので Server Component。`params` / `searchParams` は
**Promise なので `await` で解き**、値はクライアントコンポーネントへ props で渡す:

```tsx
// src/app/projects/[projectId]/page.tsx
export default async function ProjectPage({
  params,
}: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  await requireSession(`/projects/${projectId}`);
  return <ProjectWorkspace projectId={projectId} />;
}
```

Client Component で props として受ける場合は `use()` で解く:

```tsx
import { use } from "react";
export default function Page({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = use(params);
}
```

**`params` を同期的なオブジェクトとして扱わない** (Next.js 15 以前の書き方)。

`PageProps<"/login">` のようなルート文字列の型はビルド時に生成される。ルートを追加した
直後は `npx tsc --noEmit` が `does not satisfy the constraint 'AppRoutes'` で落ちるので、
**先に `npm run build` を 1 回通して型を再生成する**。

---

## 3. クライアント / サーバの境界

**作品データのストアを読む画面はすべて `"use client"`**。IndexedDB はブラウザにしか無く、
サーバでは初期化できないため。一方 **認証だけはサーバ側にある**。

| ある | 用途 |
| --- | --- |
| Client Component / hooks | 画面の中身 (`src/components/**`)。作品データはここでしか触らない |
| Server Component | `app/**/page.tsx`。`auth()` で認証を検証してから中身を描く |
| Server Function (`"use server"`) | [src/lib/auth-actions.ts](../../../src/lib/auth-actions.ts) のログイン / ログアウトのみ |
| Route Handler | `app/api/auth/[...nextauth]/route.ts` (Auth.js のハンドラ) のみ |
| Proxy (`src/proxy.ts`) | 未ログインを `/login` へ飛ばす楽観的リダイレクト |

| まだ無い | 備考 |
| --- | --- |
| 作品データの Server Function / API | 作品は依然 IndexedDB。Postgres 移行は別増分 |
| ISR / `revalidate` / データキャッシュ | 認証付きページはすべて動的 (`ƒ`) |

**`middleware.ts` を作らない。** Next.js 16 で非推奨になり `proxy.ts` にリネームされた
(`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`)。
また公式は「Proxy を完全な認証・認可の解決策として使うな」と明記しているので、
**認可の判定は必ず各ページ / Server Function 内で `auth()` を呼んで行う**。

作品データをサーバへ載せる提案は移行スコープの変更にあたるため、実装前にユーザ確認が必要。

---

## 4. ナビゲーション

```tsx
import Link from "next/link";
<Link href={`/projects/${project.id}`}>…</Link>
```

- ページ間遷移は `Link`。`window.location` を使わない
- ログイン後の遷移は 2 画面だけ (一覧 ↔ 作品画面)。パネルはドロワーで表現する
  ([01-architecture-design.md](../02-development-docs/01-architecture-design.md))
- `/login` への遷移はリダイレクト (`redirect()` / `proxy.ts`) で起きるので `Link` は張らない

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
| [prisma.config.ts](../../../prisma.config.ts) | Prisma 7 の CLI 設定。**接続 URL は schema.prisma に書けない**ので、`datasource.url` はここが正。`.env` も自前で読む |
| `.env` (`.env.example` がひな形) | `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` / `AUTH_SECRET` / `DATABASE_URL` / `AUTH_INVITE_CODE` |

インポートは `@/` エイリアスを使う (`@/lib/store` / `@/components/ui`)。
相対パスの `../../` を書かない。

`@prisma/client` は Next の既定の外部パッケージ一覧に入っているので、
`serverExternalPackages` を足す必要は無い。

---

## 8. 迷ったら読むガイド (バンドル済み)

```
node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md
node_modules/next/dist/docs/01-app/02-guides/single-page-applications.md
node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md
node_modules/next/dist/docs/01-app/02-guides/authentication.md
```

Auth.js v5 (`next-auth@beta`) の API も推測で書かず、`node_modules/next-auth/index.d.ts` と
`node_modules/@auth/core/index.d.ts` の型定義を読んで確認する。
