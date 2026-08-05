# アカウント制・サーバ移行の実装

- ステータス: **未着手**
- 優先度: **高**
- モデル: opus
- 起票日: 2026-08-04
- 更新日: 2026-08-04（モバイルファースト化 → JSON (b) 確定 → **企画部の spec 精査結果を反映**）
- 依頼元: 社長
- 前提: [planning/2026-08-04-accounts-and-server-spec.md](../../planning/tasks/2026-08-04-accounts-and-server-spec.md) の完了（**充足済み。2026-08-04 に企画部が全文精査して確定**） ＋ [dev/2026-08-04-accounts-and-server-data-migration.md](./2026-08-04-accounts-and-server-data-migration.md) の完了 ＋ 下記ブロッカーの解消
- 決裁記録: [2026-08-04-accounts-and-server-decisions.md](../../secretary/decisions/2026-08-04-accounts-and-server-decisions.md)

## 概要

確定した仕様と移行方針に従い、Google ログイン + Postgres 保存へ実装を切り替える。
これによりスマホ・複数端末から同じ作品を触れるようになる（本チケットが移行の本体）。

**2026-08-04 追記**: 社長の想定利用がスマホメインになったため、本チケットで新規に増える画面
（ログイン / エラー / 移行導線）も**スマホ幅 375px を基準に作る**。PC はそれを広い画面に
広げたもの、という順序で実装すること。

**2026-08-04 追記（JSON）**: 解釈 **(b)** で社長確定。**読み込み（`parseProjectJson` /
`withFreshIds`）は移行経路として残す**。書き出しはバックアップの主手段から外し、
spec の決定 7 に従って常用導線（作品画面ヘッダ / 一覧ヘッダ）から
アカウントメニュー・削除確認モーダルへ移す。**機能そのものの削除は行わない**
（(a) の再判断は移行完了後）。

**2026-08-04 追記（企画部の spec 精査）**: spec は秘書が代筆した草案を企画部が全文精査して
確定させた。本チケットに効く追加要件は次の 3 つ。

1. **保存で書く手を止めない**（spec 1-2）。楽観的更新 ＋ 編集 1 件単位の自動保存。
   **保存に失敗しても画面の入力を消さない**。保存状態の表示は画面に 1 か所だけ
2. **セッションは 30 日**（アクセスのたびに延長）。スマホで毎回ログインさせない（spec 4-2）
3. **許可リストの人数上限は 6**、サムネイル 300 KB 超は**再圧縮してから判定**、
   一覧・ボードは**ページングしない**（spec 7 章）

## ブロッカー（社長作業。揃うまで完了できない）

- [ ] `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`（Google Cloud で OAuth クライアント作成）
- [ ] `DATABASE_URL`（GitHub → Vercel 連携 → `vercel install neon`）
- [ ] `BLOB_READ_WRITE_TOKEN`（Vercel Blob ストア作成）

揃うまでは、スキーマ・Server Actions・UI 配線まで書いて `npm run build` /
`npx tsc --noEmit` / `npx prisma validate` で検証する。

なお spec の開放質問 Q1（許可リスト**方式そのものの承認**と `AUTH_ALLOWED_EMAILS` の値）・
Q2（本番ドメイン）も未回答。Q1 は無料枠を守る防波堤なので、実装時に仕組みだけ入れて
値は環境変数で外出しする。**未設定時は全拒否**（全許可にすると設定忘れが穴になる）。

## 作業

- Prisma 導入とマイグレーション
- Auth.js v5 + Google Provider、middleware で未ログインを `/login` へ。セッション 30 日
- `signIn` コールバックで `AUTH_ALLOWED_EMAILS` を検証（**アドレス一致 ＋ Google 側で検証済み**）
- Server Actions で CRUD。**全クエリを `userId` で絞る**（他人の作品に触れないこと）
- [src/lib/store.ts](../../../../src/lib/store.ts) を「サーバデータのキャッシュ + 楽観更新」に作り替え。
  zustand ストアは 1 つのまま増やさない。**保存失敗時に入力を捨てない**こと
- サムネイルを Vercel Blob へ（[src/lib/image.ts](../../../../src/lib/image.ts) の縮小は流用。
  300 KB 超は再圧縮してから判定）
- 既存ローカルデータの移行導線（JSON 読み込み。移行方針チケットで確定した手順に従う）
- JSON 書き出しを常用導線から外す（機能は残す。spec の決定 7 の配置に合わせる）

## 完了条件

- [ ] 未ログインで `/` と `/projects/*` にアクセスすると `/login` へ飛ぶ
- [ ] 別アカウントの作品 id を URL に直接入れても 404 になる（ログイン済みでも他人の作品は見えない）
- [ ] 許可リスト外のアカウントでログインすると `/login` に日本語のエラーが出る
- [ ] 作品の作成・シーンの追加編集・並べ替えが DB に永続化され、別端末で再ログインすると同じ状態が見える
- [ ] **通信を落とした状態でシーンを編集すると、「保存できませんでした」＋再試行が出て、
      入力した文章が画面から消えない**（spec 1-2。実機で機内モードにして確認）
- [ ] サムネイルが Blob に保存され、DB には URL のみが入る
- [ ] 現行ローカル版で書き出した JSON を読み込んで、シーン・キャラ・サムネイルが復元できる
      （移行経路が実際に通ること。**往復で件数と並び順が一致する**こと）
- [ ] JSON 書き出し機能が**残っている**こと（常用導線からは外れているが到達可能）
- [ ] 上限超過時に日本語の理由が返る（常時表示の使用量バーは作らない）
- [ ] **本チケットで追加した全画面（ログイン / エラー / 移行導線）が幅 375px で横スクロールしない**
- [ ] **ログインボタンを含む操作要素のタップ領域が 44x44px 以上**
- [ ] `npm run build` / `npm run lint` / `npx tsc --noEmit` が通る
- [ ] **ユーザによる画面確認**（PC ブラウザ ＋ **実機スマホ**の両方。Claude 側では dev サーバを起動しない）
- [ ] [.claude/CLAUDE.md](../../../CLAUDE.md) の「ユーザデータは IndexedDB にしか無い」節と
      [.company/CLAUDE.md](../../CLAUDE.md) の「サーバ: 無し」「スタック」を同じコミットで更新
- [ ] [03-import-export.md](../../../docs/02-development-docs/03-import-export.md) を
      「書き出しはバックアップの主手段ではなく移行経路」という位置づけに同じコミットで更新
- [ ] [README.md](../../../../README.md) の保存・デプロイの記述を更新（広報部へ回すほどの分量なら pr に起票）

## 引き継ぎ

### 移行方針チケット → 本実装チケット（2026-08-04・開発部）

前提だった [2026-08-04-accounts-and-server-data-migration.md](./2026-08-04-accounts-and-server-data-migration.md)
が完了した（**未確認事項を残したままの完了**）。決定 1〜7・付録 A〜D はそちらが一次情報。
ここには**実装で迷いそうな点だけ**を抜き出す。

#### 1. 先に読むもの

- 移行方針チケットの **0-1（確認済みの事実）と 0-2（未確認事項）**。
  **この 2 つの区別を潰さないこと。** 未確認を確定として扱った実装はその上に積み上がって壊れる。
- `prisma/schema.prisma`（実ファイルで置いてある。`npx prisma validate` 済み・CLI 7.9.1）

#### 2. Next.js 16 での訂正（spec / 本チケットの記述が古い）

- **`middleware` は非推奨。`proxy.ts` を使う。** Proxy は Node.js ランタイム既定で、
  `runtime` 設定は使えない（設定するとエラー）。移行 codemod:
  `npx @next/codemod@canary middleware-to-proxy .`
  → 本チケット「作業」の「middleware で未ログインを `/login` へ」は **`proxy.ts` で**と読み替える
- **Proxy だけでは Server Function を守れない。** 公式ドキュメントが
  「Proxy の matcher が除外したパスでは Server Function 呼び出しも Proxy を通らない。
  **各 Server Function の中で認証・認可を検証すること**」と明記している。
  → **全 Server Action の先頭でセッション確認と `userId` 絞り込みを必ず書く。**
  完了条件「別アカウントの作品 id を URL に直接入れても 404」はここで担保する
- **Prisma 7 では接続 URL を `schema.prisma` に書けない**（`url` は廃止・P1012）。
  `prisma.config.ts` ＋ ドライバアダプタ構成になる。導入時にアダプタのパッケージ名を型定義で確認すること

#### 3. 実装順の指定（順序を守らないと移行が壊れる）

1. **書き出し UI に触るのは切替デプロイのコミット（Step 2）から。** それより前に
   一覧ヘッダ / 作品画面ヘッダのボタンを動かさない。移行元の端末で書き出せなくなる
   （移行方針チケット 決定 7 の表）
2. `io.ts` は**移行完了まで 1 行も消さない**。`downloadProject` / `toExportJson` /
   `parseProjectJson` / `withFreshIds` の 4 つとも残す
3. 切替コミットの直前に git タグ `local-final`。切替コミットで `persist` / `idbStorage` の
   読み書きを外す（**`del()` は呼ばない**）

#### 4. 実装の要点（決定の要約）

| 対象 | 実装 |
| --- | --- |
| 並び順 | `order Int`・1024 刻みの疎な値。**上下ボタンの隣接移動は 2 行の `order` 交換**（隙間を消費しないため）。DnD は前後の中点。読み出しは必ず `orderBy: [{ order: "asc" }, { id: "asc" }]`。**`order` に一意制約を張らない**（交換の途中で重複する） |
| 上限 | `src/lib/limits.ts`（純粋関数・新規）に集約し、**Server Action の入口で強制**。DB 制約にしない。クライアントは同じ関数で先出しの警告に使う。**上限超過でテキストを切り詰めない**（拒否して理由を返す） |
| id | 作品データは `newId()`（nanoid(12)）でアプリが採番。スキーマに `@default(cuid())` を置いていないので**必ず明示的に渡す**。旧 JSON の id は使わない |
| JSON 取り込み | **クライアントで `parseProjectJson` → サムネイルを Blob へ直アップロード → テキストだけの JSON を一時 Blob へ → Server Action には URL 1 本だけ渡す**。サーバが fetch して `parseProjectJson` → `withFreshIds` → 単一トランザクションで `createMany` × 5。**`bodySizeLimit` は既定 1 MB のまま変更しない** |
| 取り込みの受け口に足すもの | ①日付の妥当性検証（`normalizeProject` は文字列としか見ていない）②`order` の採番 ③上限の検証 |
| サムネイル | 旧 data URL は**再エンコードしない**（既に 640px / q0.82 で縮小済み）。300 KB 超のときだけ再圧縮。Blob キーは `u/{userId}/thumb/…`、ランダムサフィックスは既定のまま |
| 削除 | **必ず Blob → DB の順**。作品削除は cascade で消える前に `thumbnailUrl` を全件 SELECT しておく。Blob 削除に失敗したら中断（DB を触らない） |
| 書き出し | サーバ版でも **`thumbnail` は data URL に戻して**書き出す（削除直前の退避が主用途なので URL のままでは意味が無い）。`EXPORT_FORMAT` / `EXPORT_VERSION` は据え置き。進捗表示つき・同時 6 本程度に制限 |
| 一覧 | 作品一覧は `updatedAt DESC, id ASC`。`Project` に `order` 列は持たせない |

#### 5. 実装中に確認して企画へ返すもの（この環境では 1 件も実測できなかった）

移行方針チケットの **U-1〜U-10** がそのまま宿題。特に:

- **U-5 iOS の HEIC が `createImageBitmap` で読めるか**（スマホがメインなので、
  通らないと画像機能が実質使えない）— 実機で確認。**dev サーバは社長のターミナルで起動してもらう**
- **U-1 / U-2 Neon / Blob の無料枠の実値と超過時の挙動** — 想定（0.5 GB / 1 GB）と違えば
  **上限表と「ユーザ 6 人」を企画へ差し戻す**
- **U-7 `@vercel/blob` のクライアント直アップロードの API**（名前は未確認）。
  使えない場合の代替は「画像 1 枚ずつ Route Handler へ POST」（1 枚 ≤ 300 KB なので上限に当たらない。
  `bodySizeLimit` は Server Action 専用の設定なので Route Handler には効かない）
- **U-9 Auth.js v5 の既定セッション期間 / rolling 設定 / `email_verified` の取得可否**
- **U-10 PrismaAdapter が `VerificationToken` を要求するか**（不要と確認できたらスキーマから削る）

#### 6. 企画部の判断待ち（実装をブロックしないが、確定したら反映する）

移行方針チケットの付録 C-2〜C-5・C-7。実装上は下記を既定として進めてよい。

- 作品一覧は `updatedAt` 降順（C-2）
- `Scene.characterIds` の配列順は保持しない（C-3）。要ると言われたら中間表に `order` を足す
- デコード不能なサムネイルは**そのシーンのぶんだけ捨てて本文は取り込む**（C-4）
- 書き出した JSON が 50 MB を超えても書き出し自体は止めない（C-5）

#### 7. 相関図フィーチャからの申し送り（2026-08-04 追記・**着手前に必ず読む**）

[dev/tasks/2026-08-04-character-relationship-graph-data-migration.md](./2026-08-04-character-relationship-graph-data-migration.md)
の**決定 6** で、相関図のデータ（`Relationship` / `CharacterGroup` / `Character.x` `.y` `.groupId`）を
**この移行の Prisma スキーマに載せる形まで確定させてある**（干渉点 I-1 の解消）。
DB はまだ 1 つも作っていないので、**最初のマイグレーションに同梱すれば追加のマイグレーションは要らない**。

> ⏱ **時間的制約: `prisma migrate` を初めて実行する前に当てること。**
> 実行後に足すとマイグレーションが 1 本増える（秘書決裁 R-1 が避けたかったもの）。
> 2026-08-04 20:30 時点で `prisma/migrations/` は存在せず、`prisma/schema.prisma` は未適用。

- **スキーマ差分の全文**は同チケットの決定 6-1 / 6-2。
  `npx prisma validate`（7.9.1）で valid を確認済み。**`prisma/schema.prisma` 本体はまだ未適用**
- 本チケットの決定 1〜7 と**矛盾はゼロ**（整合表は決定 6-3）。ただし次の 3 点は**本チケット側の追記が要る**:
  1. **決定 3 のカスケード図**に 1 行追加 —
     `CharacterGroup` 削除時の `Character.groupId` は **`SetNull`**（キャラは消さない）。Cascade でない唯一の辺
  2. **付録 A の対応表**に 5 行追加 — `Character.x` / `.y` / `.groupId` / `Project.relationships` / `.characterGroups`
  3. **付録 B の書き出し組み立て**に追加 — `relationships` と `characterGroups` を **`order ASC` で**出す。
     取り込みの `createMany` は 5 本 → **7 本**（順序は characterGroups → characters → relationships）
- **`EXPORT_FORMAT` / `EXPORT_VERSION = 1` の据え置きは維持される**（干渉点 I-2 は「触らない」で解消）
- **上限表に相関データの行が無い**（企画部へ差し戻し済み・同チケット付録 D-3）。
  値が決まるまでは**上限の検証を実装しない**でよい（v1 のローカル版に上限は無い）
