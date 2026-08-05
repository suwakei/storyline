# 認証（ログイン / ログアウト）だけを実装する

- 作成日: 2026-08-04
- ステータス: **完了**（2026-08-04 開発部。実装・静的検証まで。社長の動作確認待ち）
- 優先度: **高**
- モデル: opus
- 依頼元: 社長（承認済み・秘書を介さない直接依頼）
- 仕様変更: **2026-08-04 社長決定によりサインイン制限を「メールアドレスの許可リスト」から
  「招待コード」へ差し替え**（理由: いちいちアドレスを書くのが面倒）。実装済み
- 前提仕様:
  - [planning/specs/2026-08-04-accounts-and-server-spec.md](../../planning/specs/2026-08-04-accounts-and-server-spec.md)
    — 3 章（`/login`）/ 4 章（ルーティング）/ 8 章（アカウントメニュー）。
    **10 章（許可リスト）は上記の社長決定で無効**
  - [design/ui-specs/2026-08-04-auth-screens.md](../../design/ui-specs/2026-08-04-auth-screens.md)
  - [design/wireframes/2026-08-04-auth-screens.md](../../design/wireframes/2026-08-04-auth-screens.md)
- Prisma 構成・Next 16 制約の調査元:
  [dev/tasks/2026-08-04-accounts-and-server-data-migration.md](./2026-08-04-accounts-and-server-data-migration.md)

---

## 位置づけ（サーバ移行の全体ではない）

サーバ移行の全体チケットは
[dev/tasks/2026-08-04-accounts-and-server-impl.md](./2026-08-04-accounts-and-server-impl.md)。
**本チケットはそこから「認証だけ」を切り出した増分**であり、あちらには着手していない。

**到達した状態: 「ログインしないと使えないが、作品データはまだローカル（IndexedDB）」。**
これは意図した中間状態。

> ### ⚠ ユーザごとのデータ分離はまだ無い
>
> 作品データは引き続きブラウザの IndexedDB（キー `storyline-store-v1`）にあり、
> `userId` による絞り込みは**存在しない**。したがって:
>
> - **同じブラウザで別のアカウントにログインしても、同じ IndexedDB の作品が見える**
> - **別の端末でログインしても作品は付いてこない**（ログインは「入口の鍵」でしかない）
> - DB（Postgres）に載っているのは Auth.js の `User` / `Account` / `Session` / `VerificationToken` だけ
>
> データ分離が入るのは作品データの Postgres 移行の増分から。
> `src/lib/store.ts` / `storage.ts` / `io.ts` / `image.ts` は**1 行も変更していない**。

---

## スコープ

### やったこと

1. 依存追加: `next-auth@beta`（5.0.0-beta.32）/ `@auth/prisma-adapter` / `prisma` /
   `@prisma/client` / `@prisma/adapter-pg`（すべて Prisma 7.9.1 系）
2. Prisma セットアップ（`prisma.config.ts` ＋ ドライバアダプタ / `prisma generate` 実行済み）
3. `src/lib/auth.ts`（Google Provider ＋ PrismaAdapter）
4. **招待コード（`AUTH_INVITE_CODE`）による新規サインインの制限**（未設定なら新規ユーザを作らない）
5. `/login` 画面（デザイン仕様どおり ＋ 招待コード入力の開閉）
6. アカウントメニュー（ログアウト含む）を `/` のヘッダへ配線
7. `ui.tsx` に `Banner` プリミティブを新設（`tone="danger" | "neutral"`）
8. 未ログイン時のルート保護（`src/proxy.ts` ＋ 各ページの `auth()`）

### 意図的にやらなかったこと

| 項目 | 理由 |
| --- | --- |
| 作品データの Postgres 移行 | スコープ外。データ層は無変更 |
| Vercel Blob / サムネイル移行 | `BLOB_READ_WRITE_TOKEN` 未設定 |
| `SaveStatusIndicator` / `saveStatus` / `retrySave` | サーバ保存が入ってから |
| 作品削除・アカウント削除のモーダル化、44px 対応、`MAX_EDGE` 変更 | 別増分 |
| アカウントメニューの「アカウントを削除」行 | アカウント削除の実装がスコープ外。押せない行を置くほうが害が大きいので**行ごと出していない** |
| アカウントメニューへの「JSON を読み込む」の吸収 | [移行方針チケットの決定 7 Step 0](./2026-08-04-accounts-and-server-data-migration.md) が「切替デプロイ前は JSON の UI を現状のまま残す（ここで UI を動かすと移行元から書き出せなくなる）」と定めているため。**`/` ヘッダの「JSONを読み込む」ボタンはそのまま残した** |
| `/login` の「アカウントを削除しました」バナー（design 2-4） | アカウント削除が未実装なので出す経路が無い。`Banner tone="neutral"` は実装済みなので、削除機能を入れるときに 1 行で足せる |

---

## 招待コード方式（社長決定 2026-08-04）

```
AUTH_INVITE_CODE=<12 文字程度のランダム文字列>   ← 値は .env にある。ここには書かない
```

### 挙動

| 状況 | 結果 |
| --- | --- |
| 既存ユーザ（`User` 行がある）がログイン | **招待コード不要。** Google ボタンだけで入れる |
| 新規ユーザ（`User` 行が無い）＋ 有効な招待コードの証跡あり | アカウントを作ってログイン |
| 新規ユーザ ＋ 証跡なし | 拒否。`/login?error=AccessDenied` →「このアカウントはまだ登録されていません。はじめての方は招待コードを入力してください。」 |
| 招待コードを間違えた | `/login?error=InviteCodeInvalid` →「招待コードが違います。」＋ 入力欄を開いたまま |
| **`AUTH_INVITE_CODE` が未設定** | **新規ユーザを作らない**（フェイルセーフ）。`/login?error=InviteCodeUnset` →「いまは新規登録を受け付けていません。」既存ユーザのログインは通る |
| 10 分間に 11 回以上コードを送った | `/login?error=TooManyAttempts` →「招待コードの入力が多すぎます。…」 |

### 「新規ユーザか」の判定

`signIn` コールバック内で `prisma.user.findUnique({ where: { email } })` を引き、
**行が無ければ新規**とみなす。`@auth/core` の callback フローで
`handleAuthorized`（＝ `signIn` コールバック）が `handleLoginOrRegister`（＝ 実際に
`User` を作る処理）より**前に**走ることを実装で確認済み
（`node_modules/@auth/core/lib/actions/callback/index.js` の 63 行目 → 70 行目）。

### セキュリティ設計

| 要件 | どう満たしたか |
| --- | --- |
| コードをクライアントへ送らない | `process.env.AUTH_INVITE_CODE` を読むのは [src/lib/auth-actions.ts](../../../../src/lib/auth-actions.ts)（`"use server"`）と [src/lib/auth.ts](../../../../src/lib/auth.ts) だけ。`NEXT_PUBLIC_` は付けていない。**ビルド成果物 `.next/static/**` を全文検索して、変数名も値も `AUTH_SECRET` も 1 件も出ないことを確認済み** |
| 検証はサーバ側 | Server Function `signInWithInviteCodeAction`。クライアントは `<form action>` で送るだけで、合否の判断材料を一切持たない |
| タイミング安全な比較 | [src/lib/invite.ts](../../../../src/lib/invite.ts) の `equalsConstantTime`。**両辺を SHA-256 で 32 バイトに畳んでから `crypto.timingSafeEqual`** に渡すので、長さが違っても例外にならない（`timingSafeEqual` は長さ違いで throw する） |
| 検証済みをサーバ側で持ち回る | クッキー `storyline.invite`（**httpOnly / sameSite=lax / path=/ / 本番のみ secure / 10 分**）。値は **`<有効期限ms>.<HMAC-SHA256 署名>`** で、**コードそのものは入っていない**。鍵は `AUTH_SECRET` |
| 使い回しの抑制 | `signIn` コールバックで検証に成功したらそのクッキーを `delete` する（Route Handler なので削除可）。**best effort** で、失敗しても 10 分で失効する |
| レート制限 | `registerInviteAttempt()`：10 分あたり 10 回 / クライアント（`x-forwarded-for` の先頭）。**プロセスのメモリにしか持たない**ので、再デプロイやサーバレスのコールドスタートでリセットされ、インスタンスをまたいだ合算もできない。**総当たりを鈍らせるだけの軽い制限**であり、厳密な防御ではない |

`sameSite=lax` にしたのは、Google からのコールバックが**トップレベルの GET ナビゲーション**で
戻ってくるため（`strict` だとクッキーが送られず、必ず失敗する）。

### 実測した挙動（実コードをそのまま実行して確認）

```
トークンにコードが入らない形式 (exp.署名) : true
正しい鍵 + 期限内            → 有効
期限切れ / 鍵違い / 署名改ざん / 有効期限だけ伸ばす / undefined / ドット無し → すべて無効
定数時間比較: 一致→true、不一致(同長)→false、長さ違い→false(例外なし)、空→false
レート制限: 1〜10 回目は許可 / 11・12 回目は拒否 / 別 IP は独立 / 10 分後に復活
```

### 招待コード方式の限界（明記しておく）

- **コードを変えても既存ユーザは締め出せない。** コードが効くのはアカウント作成のときだけで、
  既に `User` 行がある人は最大 30 日のセッションを持ち続ける。
  **特定の人を止めたいときは `User` 行を削除する**（cascade で `Account` / `Session` も落ちる）。
  許可リスト方式にあった「環境変数から名前を消せば即座に締め出せる」性質は失われた
- コードを知っている人は**何アカウントでも作れる**。spec 7 章の「ユーザ 6 人」上限は
  コードでは強制していない（無料枠の実値が未確認のため。作品データの移行と同じ増分で
  `src/lib/limits.ts` に入れるのが妥当）

---

## 追加・変更したファイル

### 新規（設定・配線）

| ファイル | 内容 |
| --- | --- |
| [prisma.config.ts](../../../../prisma.config.ts) | Prisma 7 の CLI 設定。**`datasource.url` はここが正**（schema.prisma には書けない）。Prisma 7 の設定ローダは `.env` を読まない（`@prisma/config` が c12 を `dotenv: false` で呼ぶ）ので `process.loadEnvFile()` を自前で呼ぶ |
| [src/proxy.ts](../../../../src/proxy.ts) | 未ログインを `/login?callbackUrl=…` へ飛ばす**楽観的**リダイレクト |
| [src/app/api/auth/[...nextauth]/route.ts](../../../../src/app/api/auth/%5B...nextauth%5D/route.ts) | `export const { GET, POST } = handlers` |
| [src/app/login/page.tsx](../../../../src/app/login/page.tsx) | Server Component。`auth()` で既ログインなら `callbackUrl` へ、そうでなければ `LoginCard` を描く |

### 新規（`src/lib/`）

| ファイル | 内容 |
| --- | --- |
| [src/lib/prisma.ts](../../../../src/lib/prisma.ts) | `PrismaClient` シングルトン（`PrismaPg` アダプタ）。dev の HMR で接続プールが増えないよう `globalThis` に控える |
| [src/lib/invite.ts](../../../../src/lib/invite.ts) | 招待コードの定数時間比較・証跡トークンの発行/検証・軽いレート制限。**`node:crypto` 依存なのでクライアントから import しない** |
| [src/lib/auth.ts](../../../../src/lib/auth.ts) | `NextAuth({...})` 本体、`signIn` コールバック（新規ユーザ判定＋招待の証跡検証）、`safeCallbackUrl`、`requireSession` |
| [src/lib/auth-actions.ts](../../../../src/lib/auth-actions.ts) | `"use server"`。`signInWithGoogleAction` / `signInWithInviteCodeAction` / `signOutAction` |
| [src/lib/auth-errors.ts](../../../../src/lib/auth-errors.ts) | エラーコード → 日本語文言のマッピングと「入力欄を開くか」の判定。**この 1 ファイルだけに置く**（design ui-spec 2-3 の要求） |

### 新規（`src/components/`）

| ファイル | 内容 |
| --- | --- |
| [src/components/LoginCard.tsx](../../../../src/components/LoginCard.tsx) | `/login` のカード。Google ボタン ＋ 招待コード入力の開閉。`<form action={…}>` ＋ `useFormStatus` でボタンを `disabled` にしラベルを変える |
| [src/components/AccountMenu.tsx](../../../../src/components/AccountMenu.tsx) | Google アイコン（出せなければ頭文字）のトリガー ＋ モバイル下シート / PC ポップオーバー。中身は「ログイン中 / メール / ログアウト」 |
| [src/components/ProjectList.tsx](../../../../src/components/ProjectList.tsx) | 旧 `src/app/page.tsx` の中身をそのまま移設（＋ヘッダに `AccountMenu`、エラー表示を `Banner` に置換） |
| [src/components/ProjectWorkspace.tsx](../../../../src/components/ProjectWorkspace.tsx) | 旧 `src/app/projects/[projectId]/page.tsx` の中身をそのまま移設（`useParams()` → `projectId` prop に変更） |

### 変更

| ファイル | 内容 |
| --- | --- |
| [src/components/ui.tsx](../../../../src/components/ui.tsx) | `Banner`（`tone="danger" \| "neutral"`、任意 `action`）を追加。既存プリミティブは無改修 |
| [src/app/page.tsx](../../../../src/app/page.tsx) | Server Component 化。`requireSession("/")` → `<ProjectList userEmail={…} />` |
| [src/app/projects/[projectId]/page.tsx](../../../../src/app/projects/%5BprojectId%5D/page.tsx) | Server Component 化。`await params` → `requireSession(...)` → `<ProjectWorkspace projectId={…} />` |
| [package.json](../../../../package.json) | 依存 5 件追加 ＋ `"postinstall": "prisma generate"`（`node_modules/@prisma/client` は git 管理外なので、clone 直後や Vercel のビルドで生成が要る） |

`.env` は**触っていない**。`.env.example` は依頼元が招待コード方式に更新済みだったので変更不要。
**許可リスト方式のコード（`parseAllowedEmails` / `isAllowedEmail` / `isUsableSession`）は
デッドコードを残さず削除済み**。

### ドキュメント更新（同じ変更内で実施）

| ファイル | 直した記述 |
| --- | --- |
| [docs/01-project-overview/01-storyline-concept.md](../../../docs/01-project-overview/01-storyline-concept.md) | 画面一覧に `/login`（初回のみ招待コード）を追加。「サーバが無い」→「サーバは認証のためだけにある」。**ユーザごとのデータ分離が無い旨**を明記 |
| [docs/02-development-docs/01-architecture-design.md](../../../docs/02-development-docs/01-architecture-design.md) | ディレクトリ図を更新。「クライアント / サーバ境界」章に**認可をどこで判定するか**と招待コードの扱いを追記 |
| [docs/02-development-docs/04-error-handling.md](../../../docs/02-development-docs/04-error-handling.md) | エラー表示のコピペ例を `Banner` に置換。Auth.js 由来 / 招待コード由来の 2 系統を追記 |
| [docs/02-development-docs/06-ui-design.md](../../../docs/02-development-docs/06-ui-design.md) | プリミティブ表に `Banner` を追加 |
| [docs/02-development-docs/10-seo-and-metadata.md](../../../docs/02-development-docs/10-seo-and-metadata.md) | 「`/projects/<id>` はクライアントコンポーネント」→ page は Server Component だが作品データは依然 IndexedDB |
| [docs/02-development-docs/11-deployment.md](../../../docs/02-development-docs/11-deployment.md) | 「環境変数もシークレットも無い」を撤回。dev ポート 4000、`docker compose` / `prisma` コマンドの実行可否、Vercel 側の必要環境変数（`AUTH_INVITE_CODE` 込み）、`output: "export"` が使えない理由 |
| [docs/03-library-docs/01-next-app-router-doc.md](../../../docs/03-library-docs/01-next-app-router-doc.md) | ルート構成、`params` の解き方、「使わないもの」表（Server Action / Route Handler / proxy が**存在する**側へ移動）、`middleware.ts` 禁止、`prisma.config.ts` / `.env`、読むべきガイドに proxy と authentication を追加 |

`node .claude/scripts/lint-claude.mjs` → pass。

> **未修正で残した記述（開発部の権限外）**
> - [.claude/CLAUDE.md](../../../CLAUDE.md) 冒頭「フロントエンドのみで完結し、サーバもデータベースも
>   持たない」／`.company/CLAUDE.md` の「サーバ: **無し**」／[README.md](../../../../README.md)。
>   README は spec 15 章で**広報部**の担当と決まっている。CLAUDE.md 系はプロジェクト設定なので
>   社長の判断で更新してほしい。**現状は事実と食い違っている。**

---

## 未ログイン時のルート保護をどう作ったか

**2 段構え。`proxy.ts` は判定の本体ではない。**

### 1 段目: `src/proxy.ts`（楽観的リダイレクトのみ）

- **`middleware.ts` は作っていない。** Next 16 で非推奨になり `proxy.ts` にリネームされた
  （`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` の
  Version History `v16.0.0` 行で確認）
- やることは**セッション Cookie（`authjs.session-token` / `__Secure-authjs.session-token`）の
  有無を見るだけ**。DB は引かない。無ければ `/login?callbackUrl=<元のパス>` へ 302
- `/login` は素通し。**「ログイン済みなら `/` へ」の判定はここでやっていない**
  — Cookie だけが残って実体が無い状態だと `/login ↔ /` の無限リダイレクトになるため。
  この判定は実体を検証できる `/login` ページ側に置いた
- matcher: `/((?!api/auth|_next/static|_next/image|.*\.(?:ico|png|jpg|jpeg|gif|svg|webp|txt|xml|webmanifest)$).*)`
  — コンパイル後の形を再現して検証済み:

  | パス | 結果 |
  | --- | --- |
  | `/` `/login` `/projects/abc` `/api/other` | Proxy を通る |
  | `/api/auth/**` `/_next/static/**` `/_next/image` `/favicon.ico` `/globe.svg` `/robots.txt` | 素通し |

### 2 段目: 各ページ / Server Function の `auth()`（判定の本体）

Next 公式が「Proxy を完全な認証・認可の解決策として使うな」
（`01-app/01-getting-started/16-proxy.md`）、「Server Function は Proxy だけでは守れない。
**各 Server Function の中で認証・認可を検証すること**」（`…/file-conventions/proxy.md` の
Execution order 節）と明記しているため、実判定はここ。

| 場所 | 検証 |
| --- | --- |
| `src/app/page.tsx` | `await requireSession("/")` |
| `src/app/projects/[projectId]/page.tsx` | `await requireSession("/projects/" + projectId)` |
| `src/app/login/page.tsx` | `auth()` → セッションがあれば `callbackUrl` へリダイレクト |
| `signOutAction` | 検証不要（未ログインで呼ばれても Cookie を消すだけ。害が無い） |
| `signInWithGoogleAction` / `signInWithInviteCodeAction` | **未ログインで呼ばれるのが正常**。認可は Auth.js の `signIn` コールバック（新規ユーザ判定 ＋ 招待コードの証跡）が持つ。招待コード自体の照合も後者の中でサーバ側だけで行う |

- **Layout では判定していない。** Next 公式が「Partial Rendering のため Layout は
  ナビゲーションのたびに再実行されない」と警告しているため（`02-guides/authentication.md`）
- `requireSession()` は `redirect()` を呼ぶので戻り値は非 null に絞られる。
  作品データを触る Server Function が増えたときも、この関数を入口で呼ぶ形に揃える
- **作品データを扱う Server Function はまだ 1 つも無い**（データは IndexedDB のまま）

---

## デザイン部へ差し戻す点

design ui-spec の `/login`（2 章）は「見出し ＋ 1 行説明 ＋ Google ボタン ＋ **許可リストの注記**」
だった。招待コード方式に変わったため、以下を実装判断で足している。**仕様への反映をお願いしたい。**

1. **注記の文言を差し替えた**: 「ログインできるのは許可されたアカウントのみです」
   → 「はじめての方は招待コードが必要です」
2. **招待コードの入力欄を追加した**（ui-spec に無い要素）。既存ユーザの導線を邪魔しないよう、
   **既定は閉じている**:
   - Google ボタンの下に `border-line border-t` の区切りを置き、その下に注記
   - 「招待コードを入力する」（`min-h-11` の素の `<button>`、`text-accent`）を押すと
     `Field` ＋ `TextInput`（`name="inviteCode"`、`className="min-h-11"`）＋
     「招待コードでログイン」ボタン（`min-h-12 w-full`）が開く
   - 招待コード関連のエラーで戻ってきたときは**開いた状態で描く**
     （`AccessDenied` / `InviteCodeInvalid` のみ。`InviteCodeUnset` / `TooManyAttempts` は
     打ち直しても通らないので開かない）
3. **primary ボタンが 2 つになる**（Google / 招待コードでログイン）。区切り線でグループを
   分けているので意図は読めるはずだが、**デザイン部の判断を仰ぎたい**
4. 新しいプリミティブは作っていない（`Field` / `TextInput` / `Button` / `Banner` のみ）。
   タップ領域はすべて 44px 以上、色は既存トークンのみ

`Banner` の API は `tone` / `children` / 任意の `action`（ui-spec 10 章の申し送り 1 に沿って確定）。

---

## 企画部へ差し戻す点

1. **spec 決定 10（`AUTH_ALLOWED_EMAILS` の許可リスト）は社長決定で無効になった。**
   招待コード方式（`AUTH_INVITE_CODE`・初回サインインのみ）に差し替え済み。
   spec 10 章の書き換えと、**「限界」節（上記）の反映**をお願いしたい。特に:
   - 環境変数から名前を消して即座に締め出す運用ができなくなった（`User` 行の削除が必要）
   - spec 7 章の「ユーザ数 6 人」上限を担保する仕組みが**無くなった**
     （コードを知っていれば何アカウントでも作れる）。上限をどこで強制するか要判断
2. **spec 決定 4「判定は middleware で行う（毎ページで書かない）」は Next.js 16 では成立しない。**
   `middleware` は非推奨で `proxy` にリネームされており、さらに公式が Proxy を認可の
   解決策にするなと明記している。**実装を正とし、spec の文言を
   「`proxy.ts` で楽観的にリダイレクトし、認可は各ページ / Server Function 内の `auth()` で必ず検証する」
   に更新してほしい。**「所有者チェックを middleware でやらない」という既存の判断はそのまま正しい
   （移行方針チケットの付録 C-6 と同じ指摘。まだ spec 本文に反映されていない）
3. **spec 14-2 の未確認事項のうち 2 件をクローズできる**（下の「詰まった点」3・4）

---

## Prisma の構成（Prisma 7）

- **`datasource` に `url` を書けない**（P1012）ので、接続先は `prisma.config.ts` の
  `datasource.url` と `src/lib/prisma.ts` の `PrismaPg` アダプタの 2 か所が持つ
- ドライバアダプタは `@prisma/adapter-pg`（ローカル Docker Postgres と Neon の両方で使える）
- **Prisma 7 の設定ローダは `.env` を読まない**（`@prisma/config` が c12 を `dotenv: false` で
  呼んでいることを実装で確認）。`prisma.config.ts` の先頭で `process.loadEnvFile()` を呼んでいる。
  `.env` が無い環境（Vercel）では例外を握ってプラットフォームの環境変数をそのまま使う
- `prisma/schema.prisma` は**無変更**。`@auth/prisma-adapter` が触るモデル
  （`user` / `account` / `session` / `verificationToken` / `authenticator`）のうち
  `authenticator` は WebAuthn 専用で、Google のみの構成では呼ばれないためモデルを足していない
- `Account` の複合主キー `@@id([provider, providerAccountId])` が、アダプタの
  `where: { provider_providerAccountId }` と一致することを生成後の型で確認済み
- `npx prisma generate` は**実行した**（DB 不要）。`npx prisma validate` も通っている
- **`npx prisma migrate` は実行していない。** DB コンテナは開発部では起動しない約束のため。
  **マイグレーションは下の「社長がやる手順」の 2 番目**

---

## 検証結果（すべて実行済み）

| コマンド | 結果 |
| --- | --- |
| `npm run build` | ✅ 成功。`/` `/login` `/projects/[projectId]` `/api/auth/[...nextauth]` はすべて `ƒ`（動的）、`ƒ Proxy (Middleware)` が登録されている |
| `npm run lint` | ✅ 指摘なし |
| `npx tsc --noEmit` | ✅ エラー 0 |
| `npx prisma validate` | ✅ `The schema at prisma/schema.prisma is valid` |
| `npx prisma generate` | ✅ Prisma Client 7.9.1 生成 |
| クライアントバンドルの秘密漏れ検査 | ✅ `.next/static/**` に `AUTH_INVITE_CODE` の**変数名も値も**、`AUTH_SECRET` の値も 1 件も無い |
| 招待コードのロジック（実コードを実行） | ✅ 上の「実測した挙動」のとおり |

> ルートを追加した直後は `tsc` が `Type '"/login"' does not satisfy the constraint 'AppRoutes'`
> で落ちる（`PageProps<Route>` の型が未生成のため）。**先に `npm run build` を 1 回通す**。
> この落とし穴は `01-next-app-router-doc.md` に追記した。

**実行していないこと**: `npm run dev` / `docker compose up` / `prisma migrate` /
実ブラウザでの動作確認。すべて社長の手元での作業。

---

## 社長がやる手順（この順序で）

### 0. 事前に 1 回だけ: Google Cloud Console のリダイレクト URI を **4000** に直す

`package.json` の dev は `next dev -p 4000` なので、承認済みのリダイレクト URI は

```
http://localhost:4000/api/auth/callback/google
```

**3000 のままだと `redirect_uri_mismatch` でログインできない。**
（本番ドメインを取ったら `https://<本番ドメイン>/api/auth/callback/google` も追加）

### 1. DB を起動する

```bash
docker compose up -d      # npm run db:up でも同じ
```

（ホスト側ポート 5434。`.env` の `DATABASE_URL` がこれを指している）

### 2. マイグレーションを作って適用する

```bash
npx prisma migrate dev --name init
```

**開発部では未実行。** `prisma/migrations/` はまだ空で、テーブルは 1 つも作られていない。
このコマンドが `User` / `Account` / `Session` / `VerificationToken` ＋ 作品データ用テーブルを作る
（作品データ側のテーブルは今回まだ使わないが、スキーマは既に確定済みなので同時に作られる）。

### 3. dev サーバを起動する

```bash
npm run dev
```

### 4. `http://localhost:4000` を開く

`/login` にリダイレクトされる。**初回は「招待コードを入力する」を開いてコードを入れる。**
**招待コードは `.env` の `AUTH_INVITE_CODE` の値**（このチケットには値を書いていない）。
2 回目以降は「Google でログイン」だけで入れる。

---

## 確認してほしいこと（未チェック＝実機確認待ち）

- [ ] `http://localhost:4000` が `/login` にリダイレクトされる
- [ ] `/login` が 375px 幅で崩れない（カード `max-w-sm`、ボタン 48px、入力欄 44px）
- [ ] ライト / ダーク両方で `/login` が読める
- [ ] **初回**: 「招待コードを入力する」→ 正しいコード → Google → ログインできる
- [ ] **2 回目以降**: 「Google でログイン」だけでログインできる（コードを聞かれない）
- [ ] **間違ったコード**で「招待コードが違います。」が出て、入力欄が開いたまま残る
- [ ] **未登録の Google アカウント**で Google ボタンだけ押すと
      「このアカウントはまだ登録されていません。…」が出る
- [ ] ログイン後 `/` が開き、ヘッダ右に Google アカウントのアイコンが出る
      （画像が出せないときだけ頭文字アバターになる）
- [ ] アバターをタップ（スマホ幅）→ 下からシートが出る / クリック（PC 幅）→ ポップオーバーが出る
- [ ] メニュー内「ログアウト」で `/login` に戻る
- [ ] ログアウト後に `/projects/<既存の作品id>` を直接開くと `/login?callbackUrl=/projects/<id>` へ飛ぶ
- [ ] 再ログイン後、その作品画面に着地する（`callbackUrl` が効いている）
- [ ] **ログイン後も既存の作品がそのまま見える**（IndexedDB を壊していない）
- [ ] 作品の作成 / 編集 / 書き出し / 読み込みが今までどおり動く
- [ ] スマホ実機（44px タップ領域・下シート）

---

## 詰まった点・未確認のまま残したこと

| # | 内容 |
| --- | --- |
| 1 | **spec 決定 10（許可リスト）と決定 4（middleware）はどちらも書き換えが要る**（上の「企画部へ差し戻す点」） |
| 2 | **サブエージェントへ委譲できなかった。** このセッションでは `src/components/` → component-builder / `src/lib/` → store-builder の委譲手段（Task ツール）が使えなかったため、開発部が直接編集した。規約上の委譲ルールは次回以降も維持する |
| 3 | **Auth.js v5 の既定セッション期間**（spec 14-2 の未確認事項）は**確認できた**: `maxAge` 既定 30 日 / `updateAge` 既定 1 日（アクセス時に延長 = rolling）。spec 4-2 の「30 日・アクセスのたびに延長」と一致するので明示指定して固定した。**クローズしてよい** |
| 4 | **`profile.email_verified` の取得可否**（spec 14-2）も**確認できた**: `@auth/core/providers/google` の `GoogleProfile` に `email_verified: boolean` があり、共通 `Profile` 型にも `email_verified?: boolean \| null` がある。**クローズしてよい** |
| 5 | **`@auth/prisma-adapter` が `VerificationToken` を要求するか**（移行方針 U-10）は今回も断定できていない。アダプタ実装は `p.verificationToken` を参照しているので**モデルは必要**（Google のみなら行は作られない）。**残す判断は正しかった** |
| 6 | **実際のログイン往復は未検証。** OAuth の往復・Prisma アダプタの書き込み・招待クッキーが Google のコールバックまで運ばれるか（`sameSite=lax`）は、DB と dev サーバを起動しないと確かめられない。静的検証（build / lint / tsc / prisma validate / バンドル検査 / ロジックの単体実行）まで |
| 7 | **招待クッキーの `delete` が実際に効くかは未検証。** `signIn` コールバックは Route Handler の中で走るので Next の仕様上は削除できるはずだが（`cookies.md` の「`.delete` は Server Function か Route Handler でのみ」）、Auth.js のハンドラが自前の `Response` を返すため、Set-Cookie がマージされるかは実測が要る。**効かなくても 10 分で失効する**設計にしてある |
| 8 | **レート制限はプロセスメモリのみ。** 再デプロイやサーバレスのコールドスタートでリセットされ、インスタンスをまたいだ合算もできない。永続化するには DB か外部ストアが要るので、この増分では入れていない |
| 9 | **`signIn` の Server Function が Google へ外部リダイレクトする経路**は Auth.js v5 の標準実装に乗せた。`onClick` + `useTransition` ではなく **`<form action={…}>` + `useFormStatus`** を採ったのは、これが documented パターンで外部リダイレクトの扱いが確実なため。デザイン要求の「押したら disabled にしてラベルを変える」は `useFormStatus` で満たしている |
| 10 | **`Prisma 7` + `prisma-client-js` ジェネレータ**のまま進めた（schema.prisma 無変更）。Prisma 7 が推奨する新しい `prisma-client` ジェネレータへの移行は別途判断が要る |
| 11 | **DB が落ちているときの挙動**: セッション Cookie が無ければ `/login` は DB を引かない（`@auth/core` の session アクションが `if (!sessionToken) return` する実装を確認済み）ので、DB 停止中でもログイン画面は出る。Cookie がある状態で DB が落ちていると 500 になる。**未検証** |

---

## 引き継ぎ

### デザイン部へ

- 上の「**デザイン部へ差し戻す点**」（招待コード入力欄の追加・注記の差し替え・primary 2 つ）を
  ui-spec に反映してほしい
- Claude 側では `npm run dev` を起動しないため、**社長の実機確認（PC + スマホ、ライト/ダーク）の
  結果をもってレビューしてほしい**

### 企画部へ

- 上の「**企画部へ差し戻す点**」3 件

### 次の増分（作品データの Postgres 移行）へ

- `requireSession()` を Server Function の入口でも呼ぶ形に揃える（今は認証系 3 本だけで、
  どれも認可不要と判断している）
- `session.user.id` を使うのはその増分から。今は `email` しか使っていない
- `src/lib/limits.ts`（件数・文字数・**ユーザ数**の上限）はまだ無い。
  招待コード方式ではユーザ数が青天井なので、ここは優先度が上がった
