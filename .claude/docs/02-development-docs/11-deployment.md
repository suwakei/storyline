# ビルドとデプロイ

作品データはブラウザの IndexedDB にあるが、**認証は Auth.js + Postgres でサーバ側にある**。
そのため環境変数とシークレットが要る (`.env.example` がひな形)。

---

## 1. コマンド

| コマンド | 用途 | Claude が実行してよいか |
| --- | --- | --- |
| `npm run dev` | 開発サーバ (http://localhost:4000) | **不可** (ユーザが自分のターミナルで動かす) |
| `docker compose up -d` | ローカル Postgres (ホスト側 5434) | **不可** (DB もサーバ。ユーザが起動する) |
| `npx prisma migrate dev` | マイグレーション適用 | **不可** (DB 接続が要る) |
| `npx prisma generate` | Prisma Client 生成 | 可 (DB 不要。`postinstall` でも走る) |
| `npm run build` | 本番ビルド | 可 |
| `npm run start` | ビルド成果物の起動 | **不可** (サーバを立てるため) |
| `npm run lint` | ESLint | 可 |
| `npx tsc --noEmit` | 型チェック | 可 |

Next.js 16 では **Turbopack が既定**。`--turbopack` フラグは不要
([03-library-docs/01-next-app-router-doc.md](../03-library-docs/01-next-app-router-doc.md))。

---

## 2. デプロイ先

Vercel に載る:

- ビルドコマンド `npm run build`、出力は自動検出。`postinstall` で `prisma generate` が走る
- Node ランタイム。認証は Server Component / Server Function / Route Handler / Proxy を使う
- **環境変数が要る**: `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` / `AUTH_SECRET` / `DATABASE_URL` /
  `AUTH_INVITE_CODE` (`AUTH_INVITE_CODE` が未設定だと**新規ユーザを作れない**。
  既存ユーザのログインは通る)
- Google Cloud Console の「承認済みのリダイレクト URI」に
  `<オリジン>/api/auth/callback/google` を登録する (dev は `http://localhost:4000/...`)
- 作品データは依然ブラウザの IndexedDB。**DB に載っているのは User / Account / Session だけ**

`output: "export"` (静的エクスポート) は**使えない**。認証が動的レンダリングを要求するため
(`npm run build` の出力でも `/` `/login` `/projects/[projectId]` はすべて `ƒ` になる)。
加えて、動的ルート `/projects/[projectId]` の id はユーザのブラウザ内で生成されるので
`generateStaticParams` で事前に列挙することもできない。

---

## 3. デプロイ時の注意

### データはユーザのブラウザにある

デプロイしてもデータ移行は発生しない。逆に言えば、**デプロイ先を変えるとオリジンが変わり、
IndexedDB は引き継がれない**。ドメイン変更時は、ユーザに JSON 書き出しでの移行を案内する。

### キャッシュ

Service Worker / PWA を入れていないため、古い JS が残る問題は現状発生しない。
導入を検討する場合は [10-seo-and-metadata.md](./10-seo-and-metadata.md) の注意を参照。

---

## 4. リポジトリ運用

- 現状 **`main` の単一ブランチ**、リモート未設定
- 複数コミットにまたがる作業は `feat/<slug>` を切る
- push・PR 作成は**ユーザの明示指示があるときだけ**行う
- `.next/` `node_modules/` `tsconfig.tsbuildinfo` は git 管理外 (`.gitignore` 参照)

### AGENTS.md について

リポジトリ直下の [AGENTS.md](../../../AGENTS.md) にある `nextjs-agent-rules` ブロックは
**`next dev` が自動生成・再追加する**。差分から消しても再作成されるので、
作業と一緒にコミットして差分をきれいに保つ。

---

## 関連ドキュメント

- Next.js 16 の変更点 → [01-next-app-router-doc.md](../03-library-docs/01-next-app-router-doc.md)
- テスト・CI → [09-test-strategy.md](./09-test-strategy.md)
