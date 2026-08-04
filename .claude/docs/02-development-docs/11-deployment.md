# ビルドとデプロイ

サーバ側の状態を持たないため、デプロイは単純。**環境変数もシークレットも無い。**

---

## 1. コマンド

| コマンド | 用途 | Claude が実行してよいか |
| --- | --- | --- |
| `npm run dev` | 開発サーバ (http://localhost:3000) | **不可** (ユーザが自分のターミナルで動かす) |
| `npm run build` | 本番ビルド | 可 |
| `npm run start` | ビルド成果物の起動 | **不可** (サーバを立てるため) |
| `npm run lint` | ESLint | 可 |
| `npx tsc --noEmit` | 型チェック | 可 |

Next.js 16 では **Turbopack が既定**。`--turbopack` フラグは不要
([03-library-docs/01-next-app-router-doc.md](../03-library-docs/01-next-app-router-doc.md))。

---

## 2. デプロイ先

Vercel にそのまま載る。設定は不要:

- ビルドコマンド `npm run build`、出力は自動検出
- Node ランタイムは使うが、**サーバ側の状態を持たない** (API Route も Server Action も無い)
- 環境変数は 0 個

`output: "export"` (静的エクスポート) は現状**使っていない**。
使う場合、動的ルート `/projects/[projectId]` に `generateStaticParams` が必要になるが、
id はユーザのブラウザ内で生成されるため事前に列挙できない。
静的化したいなら、ルーティングをクエリパラメータ (`/?project=<id>`) に変える設計変更が要る。

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
