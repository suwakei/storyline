# アカウント制移行のデータ移行方針を確定する

- ステータス: **完了**（2026-08-04 開発部・未確認事項を残したままの完了）
- ⚠ **無料枠の実値・Blob の API・実機の挙動はこの環境で確認できていない**。
  [0-2](#0-2-未確認のまま残したこと推測を確定として書かない) の U-1〜U-10 を確定値として扱わないこと
- 優先度: **高**
- モデル: opus
- 起票日: 2026-08-04
- 更新日: 2026-08-04（**開発部が決定 1〜7 を確定。`prisma/schema.prisma` 草案は `npx prisma validate` 済み**）
- 成果物: [prisma/schema.prisma](../../../../prisma/schema.prisma) ＋ 本チケットの
  [決定](#決定2026-08-04-開発部)節（決定 1〜7 / 付録 A〜D）
- 依頼元: 社長（秘書経由・データモデル変更の特則により先行起票）
- 前提: [planning/2026-08-04-accounts-and-server-spec.md](../../planning/tasks/2026-08-04-accounts-and-server-spec.md) の完了（**2026-08-04 完了済み。同日に企画部が全文精査して確定**）
- 決裁記録: [2026-08-04-accounts-and-server-decisions.md](../../secretary/decisions/2026-08-04-accounts-and-server-decisions.md)

## 概要

保存先を IndexedDB から Postgres へ移す。ユーザの作品データは現状ブラウザにしか無く、
移行に失敗すると復旧手段が `*.storyline.json` の手動バックアップしかない。**実装を書く前に
移行手順と失敗時の退避方法を確定させる** のがこのチケットの目的。

[.claude/CLAUDE.md](../../../CLAUDE.md) の「ユーザデータは IndexedDB にしか無い」節が
そのまま該当する作業。

**2026-08-04 追記（確定事項）**: 社長の「json で書き出すのはやめて」は解釈 **(b)** で確定した
（回答日 2026-08-04）。すなわち **JSON はバックアップの主手段としては廃止するが、既存
IndexedDB データをサーバへ持ち込む「移行経路」としては残す**。
したがって **移行手段は JSON 経由に一本化**する。IndexedDB を直接読んでサーバへ送る案（旧 (c)）は
**不採用**であり、本チケットで設計しない。

## 決めること

1. Prisma スキーマ（`User` / Auth.js の `Account`・`Session` + `Project` / `Story` / `Sequence` /
   `Scene` / `Character` / シーン⇔キャラの中間テーブル）
2. 並び順の持ち方（現状は配列の添字。DB では `order` 列が要る。連番か疎な間隔値か）
   — スマホでの並べ替え（縦リスト・上下移動）でも破綻しない形にすること
3. カスケード削除の範囲（作品を消したときにどこまで落とすか）
4. サムネイルの移行（data URL → Vercel Blob。既存 JSON 内の data URL をどう吸い上げるか）
5. 既存ローカルデータの吸い上げ手順 — **JSON 経由で確定（社長回答 (b)）**
   - 書き出し JSON → ログイン後インポート、の一本道で設計する
   - [src/lib/io.ts](../../../../src/lib/io.ts) の `parseProjectJson` / `withFreshIds` を
     サーバ側の受け口でそのまま再利用できるかを確認する（できない場合は何が足りないか）
   - spec の決定 3 では「作品 0 件の EmptyState を移行導線に流用・複数ファイル選択可・
     常に新規作品として追加（上書きは提供しない）」となっている。この前提で受け口を設計すること
6. 失敗時の退避（移行前に必ず JSON を書き出させるか、インポートを冪等にするか）
   — spec の決定 4 の安全弁 4 つと矛盾しないこと
7. **JSON 書き出し UI を落とすタイミング**（(b) 確定下でむしろ重要）
   - (b) は「主手段から外す」であって「即時削除」ではない。**移行が完了する前に消さない**こと。
     消す順序を誤ると既存ユーザの作品を DB に運ぶ手段が消える（復旧不能）
   - `parseProjectJson` / `withFreshIds`（読み込み側）は**移行経路として残すため削除しない**
   - 将来 (a)（完全廃止）を再判断する場合の影響範囲: `src/lib/io.ts` の
     `downloadProject` / `toExportJson`、`src/app/page.tsx`、
     `src/app/projects/[projectId]/page.tsx` の書き出しボタン、
     および `.claude/docs/02-development-docs/03-import-export.md`

## 完了条件

- [x] `dev/tech-debt/` ではなく本チケット内に、上記 7 点の決定と理由が記載されている
      → [決定](#決定2026-08-04-開発部) 1〜7
- [x] 移行手段が JSON 経由（社長回答 (b)）で設計されており、IndexedDB 直読みの案が混入していない
      → [決定 5](#決定-5-既存ローカルデータの吸い上げ手順50-mb-の受け口)。IndexedDB を読むコードは書かない
- [x] `prisma/schema.prisma` の草案が本チケットに貼られ、`npx prisma validate` が通ることを確認済み
      → [決定 1](#決定-1-prisma-スキーマ)。**実行済み・valid**（Prisma CLI 7.9.1 / 2026-08-04）
- [x] 既存の `Project` 型（[src/lib/types.ts](../../../../src/lib/types.ts)）の全フィールドが
      スキーマ上のどこに対応するか、対応表がある（欠落ゼロ）
      → [付録 A](#付録-a-project-型の全フィールド対応表欠落ゼロ)。28 フィールド全件を対応付け
- [x] 書き出し JSON の往復（現行ローカル版で書き出し → サーバ版で読み込み）で情報が落ちないことを
      机上で確認（サムネイルの data URL → Blob 変換を含む）
      → [付録 B](#付録-b-書き出し-json-の往復机上確認)。**2 点だけ「落ちる」ものがあり明記した**
      （`characterIds` の配列順 / 作品一覧の並び順）。本文・件数・階層は落ちない
- [x] **spec 5 章の「移行の受け入れ条件」4 項目を満たす設計になっている**
      → [付録 B](#付録-b-書き出し-json-の往復机上確認) の判定表。ただし条件 1 の「作品の並び順」は
      **作品一覧の並び順のことか、書き出しファイル内の並び順のことか**で解釈が割れる。
      前者なら仕様変更の提案が要る（[付録 C-2](#付録-c-企画部への差し戻し報告)）
- [x] **サムネイル込みの旧 JSON（1 ファイル最大 50 MB 想定）が取り込める経路になっている**
      （Server Action のボディ上限を踏まないこと）
      → [決定 5](#決定-5-既存ローカルデータの吸い上げ手順50-mb-の受け口)。Server Action に渡すのは
      URL 1 本（数百バイト）で、`bodySizeLimit` は既定 1 MB のまま触らない。
      **ただし `@vercel/blob` のクライアントアップロード API の詳細は未確認**（[未確認一覧](#0-2-未確認のまま残したこと推測を確定として書かない) U-7）
- [x] 書き出し UI を落とす時期が「移行完了後」と手順として書かれている（読み込み側は残すことも明記）
      → [決定 7](#決定-7-json-書き出し-ui-を落とすタイミング)
- [x] 本実装チケットへ `## 引き継ぎ` を記載
      → [dev/tasks/2026-08-04-accounts-and-server-impl.md](./2026-08-04-accounts-and-server-impl.md)

**チェックできなかった項目はない。ただし上記のうち 3 項目は「設計として成立」までで、
実測が要る前提を含む**（無料枠の実値・Blob の API・実機の挙動）。
何が確認済みで何が未確認かは次節に分けて書いた。**この区別を潰さないこと。**

---

## 決定（2026-08-04 開発部）

### 0-1. 確認済みの事実（この環境で実際に確かめたもの）

| # | 事実 | 確かめ方 |
| --- | --- | --- |
| C-1 | Server Action のリクエストボディ上限は**既定 1 MB**。`experimental.serverActions.bodySizeLimit` で変更できる。上限は**生の HTTP ボディ**に効き、`multipart/form-data` の境界・パートヘッダも数える | `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md` と `01-app/02-guides/server-actions.md` を実際に読んだ |
| C-2 | Next.js 16 で **`middleware` は非推奨、`proxy.ts` にリネーム**された。Proxy は **Node.js ランタイム既定**で、`runtime` 設定は使えない（設定するとエラー） | `01-app/03-api-reference/03-file-conventions/proxy.md`（"Runtime" 節 / Version History の `v16.0.0` 行） |
| C-3 | **Server Function は Proxy だけでは守れない。** 公式ドキュメントが「Proxy の matcher がパスを除外すると、そのパス上の Server Function 呼び出しも Proxy を通らない。**Proxy に頼らず各 Server Function の中で認証・認可を検証すること**」と明記している | 同上 proxy.md の "Good to know" |
| C-4 | **Prisma 7 では `datasource` に `url` を書けない**（P1012 エラー）。接続 URL は `prisma.config.ts` へ移し、`PrismaClient` にはドライバアダプタを渡す | 最初 `url = env("DATABASE_URL")` で `npx prisma validate` を実行してエラーを踏んだ |
| C-5 | 本チケットの `prisma/schema.prisma` 草案は **valid**（Prisma CLI **7.9.1**） | `npx --yes prisma@latest validate --schema prisma/schema.prisma` → `The schema at prisma/schema.prisma is valid 🚀`。`package.json` には依存を足していない（npx の一時取得のみ） |
| C-6 | `parseProjectJson` / `withFreshIds`（[src/lib/io.ts](../../../../src/lib/io.ts)）は **ブラウザ API に依存しない純粋関数**なので、サーバ側でもそのまま呼べる。`downloadProject`（`document` / `URL.createObjectURL`）と `fileToThumbnail`（`createImageBitmap` / `canvas`）は**クライアント専用** | 現物コードを読んだ |
| C-7 | `Scene.thumbnail` は `str(source.thumbnail)` で受けているだけなので、**data URL でも https URL でも同じ経路を通る**（型は `string`）。取り込み側の改修なしで Blob URL を通せる | 同上 |
| C-8 | モバイルの並べ替えは**同一シークエンス内の隣接移動のみ**（`moveScene(..., index ± 1)` / `moveSequence(..., index ± 1)`）。シークエンス跨ぎの移動はモバイルには無い | `src/components/board/MobileSequenceList.tsx` |
| C-9 | `prisma/` を足しても `npm run build` / `npm run lint` / `npx tsc --noEmit` はすべて通る | 3 つとも実行済み（exit 0） |

### 0-2. 未確認のまま残したこと（推測を確定として書かない）

**この環境には Neon も Vercel Blob も実機の iPhone も無く、Web 検索ツールも無い。**
以下は**すべて未確認**であり、下の設計は「未確認のまま進めても壊れない形」に寄せてある。

| # | 未確認事項 | 何が変わりうるか | どう確かめるか |
| --- | --- | --- | --- |
| U-1 | **Neon / Vercel Blob の無料枠の実値**（spec は 0.5 GB / 1 GB と書いているが、企画部も未確認の**想定値**） | 上限表と**ユーザ 6 人**の根拠が丸ごと変わる | Neon / Vercel のダッシュボードで実値を見る（`vercel install neon` / Blob ストア作成の直後） |
| U-2 | 無料枠を超えたときの挙動（課金か・停止か・スロットルか） | 許可リストの緊急度、上限の置き方 | 同上（プランのページ） |
| U-3 | **Vercel のプラットフォーム側のリクエストボディ上限の値**（Next.js の `bodySizeLimit` とは別物。Next のドキュメントには書かれていない） | Route Handler 経由のアップロード可否 | Vercel のドキュメント / 実際に大きめの POST を投げてみる |
| U-4 | Vercel Blob で**非公開 / 署名付き URL**が無料枠で使えるか | spec 7 の「v1 は公開 URL」判断（Q8） | Blob ストア作成後に SDK / ダッシュボードで確認 |
| U-5 | **iOS のカメラロール画像（HEIC）が `createImageBitmap` で読めるか**／選択時に JPEG へ変換されるか | サムネイル機能が実質使えるかどうか。**スマホがメインなので致命的** | 実機 iPhone で `<input type="file" accept="image/*">` から選ぶ。dev サーバは社長のターミナルで起動 |
| U-6 | スマホのファイル選択で `accept="application/json,.json"` が効くか | 移行導線（PC 推奨線のままで済むか） | 実機で `/` の読み込みボタンを押す |
| U-7 | **`@vercel/blob` のクライアント直アップロードの API 名と手順**（`upload()` / `handleUpload()` という名前は記憶ベース。**確認していない**） | 決定 5 の実装の書き方（**経路の成立性は API 名に依存しない**。下の代替案も用意した） | パッケージ導入後に `node_modules/@vercel/blob` の型定義を読む |
| U-8 | Prisma 7 + Neon で使うドライバアダプタのパッケージ名と接続の書き方 | 実装の初期セットアップ | 導入時に Prisma の同梱ドキュメント / 型定義を読む |
| U-9 | Auth.js v5 の**既定セッション期間**・rolling 延長の設定方法・`email_verified` の取得可否 | spec 4-2（30 日）と決定 10（許可リスト）の実装 | パッケージ導入後に型定義を読む |
| U-10 | Auth.js の PrismaAdapter が `VerificationToken` モデルを要求するか（Google のみの構成でも） | スキーマから 1 モデル削れるか | アダプタ導入後に確認。**未確認なので今回は残す判断にした**（空テーブルのコストはほぼゼロ、無くて落ちる方が高くつく） |

> **spec 14-2「未確認事項」の実測は、この環境では 1 件もできなかった。**
> 企画部への回答は「未実施」であり、実施可能になるのは
> 社長がアカウント（Neon / Blob / Google Cloud）と実機を用意した後になる。

---

### 決定 1. Prisma スキーマ

**草案は [prisma/schema.prisma](../../../../prisma/schema.prisma) として実ファイルで置いた。
`npx prisma validate`（CLI 7.9.1）で valid を確認済み（C-5）。全文:**

```prisma
generator client {
  provider = "prisma-client-js"
}

// Prisma 7 では接続 URL を schema に書けない (`url` は廃止)。
// URL は prisma.config.ts に置き、PrismaClient にはドライバアダプタを渡す。
datasource db {
  provider = "postgresql"
}

// --- 認証 (Auth.js / @auth/prisma-adapter の標準スキーマに準拠) ---

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())

  accounts Account[]
  sessions Session[]
  projects Project[]
}

model Account {
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// Google のみの構成では書き込まれない。email / Magic Link を足したときに要るので
// アダプタの標準スキーマどおり残す (空テーブルのコストはほぼゼロ)。
model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@id([identifier, token])
}

// --- 作品データ (src/lib/types.ts の写し) ---
// id は @default(cuid()) を付けない。src/lib/factory.ts の newId() (nanoid(12)) で
// アプリ側が採番する。取り込みで withFreshIds() をそのまま使うため、また id の形式を
// 1 種類に保つため (Auth.js 側のモデルはアダプタが行を作るので cuid のまま)。

enum SceneStatus {
  idea
  draft
  done
}

model Project {
  id      String @id
  userId  String
  title   String
  summary String @default("")
  // updatedAt は @updatedAt にしない。
  // (1) 取り込み時に旧 JSON の値をそのまま復元する必要がある
  // (2) 子孫 (シーン等) の編集でも進めたいが、@updatedAt は自分の行の更新しか見ない
  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())

  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  stories    Story[]
  characters Character[]

  // 一覧は「最近編集した順」で全件取得する (ページングしない)
  @@index([userId, updatedAt(sort: Desc)])
}

model Story {
  id        String @id
  projectId String
  title     String
  summary   String @default("")
  order     Int

  project   Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sequences Sequence[]

  @@index([projectId, order])
}

model Sequence {
  id      String @id
  storyId String
  title   String
  summary String @default("")
  order   Int

  story  Story   @relation(fields: [storyId], references: [id], onDelete: Cascade)
  scenes Scene[]

  @@index([storyId, order])
}

model Scene {
  id         String      @id
  sequenceId String
  title      String      @default("")
  summary    String      @default("")
  timeLabel  String      @default("")
  place      String      @default("")
  status     SceneStatus @default(idea)
  memo       String      @default("")
  // Vercel Blob の URL。ローカル版の Scene.thumbnail (data URL) から意味が変わる。
  // 未設定は null (書き出し JSON では キーごと省略する)
  thumbnailUrl String?
  order        Int

  sequence Sequence         @relation(fields: [sequenceId], references: [id], onDelete: Cascade)
  cast     SceneCharacter[]

  @@index([sequenceId, order])
}

model Character {
  id        String @id
  projectId String
  name      String @default("")
  color     String
  role      String @default("")
  note      String @default("")
  order     Int

  project Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  scenes  SceneCharacter[]

  @@index([projectId, order])
}

// Scene.characterIds の中間表。
// scene と character が同じ作品に属することは DB では強制できないので
// (複合 FK にするには projectId の非正規化が要る)、Server Action 側で担保する。
model SceneCharacter {
  sceneId     String
  characterId String

  scene     Scene     @relation(fields: [sceneId], references: [id], onDelete: Cascade)
  character Character @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@id([sceneId, characterId])
  @@index([characterId])
}
```

> `prisma generate` / `migrate` / DB 接続は**実行していない**（`DATABASE_URL` が無いため）。
> `package.json` にも依存を追加していない（`npx` の一時取得のみ）。

決めた点と理由:

| 論点 | 決定 | 理由 |
| --- | --- | --- |
| 上限（件数・文字数）の担保場所 | **Server Action の入口（バリデーション層）だけで担保する。DB 制約にしない** | 上限は企画判断で動く値（現に 20 MB → 50 MB で動いた）。DB 制約にすると変更のたびにマイグレーションが要る。日本語のエラー文言も DB からは返せない。実装は `src/lib/limits.ts`（純粋関数）に集約し、クライアント（先出しの警告）とサーバ（強制）で同じ関数を使う |
| DB に置く制約 | `User.email` の一意、`Account` の複合主キー、各 FK と `onDelete: Cascade` のみ | これらは「同一性が壊れると復旧できない」もの。可変な業務ルールとは性質が違う |
| id の採番 | 作品データ（Project / Story / Sequence / Scene / Character）は **`@default(cuid())` を付けず、`newId()`（nanoid(12)）でアプリが採番**。Auth.js のモデルは cuid のまま | (1) 取り込みで `withFreshIds()` をそのまま使える（[決定 5](#決定-5-既存ローカルデータの吸い上げ手順50-mb-の受け口)） (2) id の形式が 1 種類に揃う (3) URL（`/projects/[projectId]`）が短いままになる。旧 JSON の id は**主キーに持ち込まない**（引き継ぎの注意点どおり） |
| `SceneStatus` | **Postgres の enum**（`idea` / `draft` / `done`） | 3 値は 3 年変わっていない設計の芯。文字列型にして自由に増やせるようにする理由がない。増やすときはマイグレーション 1 本で済む |
| `Project.updatedAt` | **`@updatedAt` を使わず、アプリが明示的に入れる** | (1) 取り込み時に旧 JSON の `updatedAt` を復元する必要がある (2) 現行はシーン編集でも作品の `updatedAt` が進む（`editProject`）。`@updatedAt` は自分の行の更新しか見ないので、どのみち明示的に触ることになる |
| `Scene.thumbnail` | **列名を `thumbnailUrl` にする**（`String?`） | data URL → Blob URL で**意味が変わる**（引き継ぎ 3）。同じ名前のまま中身だけ変えると、読む側が data URL を期待したままになる。名前で気付かせる |
| キャラクターの所属整合 | シーンとキャラクターが同じ作品に属することは **DB では強制せず、Server Action 側で担保** | 複合 FK にするには `Scene` と `Character` に `projectId` を非正規化する必要があり、列と更新経路が増える。取り込みも編集も `projectId` で絞ったクエリしか書かないので、アプリ側で足りる |
| `VerificationToken` | **残す**（Google のみなら空のまま） | U-10 が未確認。アダプタが要求した場合に落ちる方が高くつく。不要と確認できたら削る |
| 一覧のインデックス | `@@index([userId, updatedAt(sort: Desc)])` | 作品一覧は**全件を最近編集順**で引く（ページングしない・spec 7） |

### 決定 2. 並び順（`order` 列の持ち方）

**決定: `order Int` を Story / Sequence / Scene / Character に持たせ、値は「疎な整数（1024 刻み）」で採番する。
一意制約は張らず、読み出しは常に `ORDER BY order ASC, id ASC`。
モバイルの上下ボタンによる隣接移動は「2 行の `order` を交換」で実装する。**

| 操作 | やること | 書き込む行数 |
| --- | --- | --- |
| 初期採番（取り込み・新規作成） | 配列の添字 × 1024（0, 1024, 2048, …） | — |
| 末尾に追加 | `max(order) + 1024` | 1 |
| **上下ボタン（隣接移動・同一親）** | **隣の行と `order` の値を交換する** | 2 |
| 任意位置へ移動（PC の DnD・シークエンス跨ぎ） | 移動先の前後の中点。先頭なら `first - 1024`、末尾なら `last + 1024`。跨ぐときは親 FK も更新 | 1 |
| 中点が取れない（`next - prev <= 1`） | その親の子だけ 1024 刻みで振り直してから再試行（1 トランザクション、最大 200 行） | ≤ 200 |

**なぜ連番（0,1,2,…の詰め直し）にしないか**

- spec 1-2 が「**編集した 1 件単位で送る**」と決めている。連番だと 1 回の並べ替えで最大 200 行の
  UPDATE と、それに対応する送信が発生する。モバイル回線で 1 回のドラッグに 200 行ぶんの往復は割に合わない。
- 楽観的更新と相性が悪い。連番はサーバ側で全体を再計算するので、クライアントが「確定後の値」を
  自分で決められない。疎な値なら**クライアントが新しい `order` を計算して即座に画面へ反映**できる。

**なぜ上下ボタンだけ「交換」なのか（ここが「スマホで破綻しない形」の核心）**

- 中点方式のまま ▼▲▼▲… と押されると、**同じ隙間を押すたびに半分にする**。1024 刻みなら
  10 回程度の往復操作で隙間が枯れて振り直しに落ちる。指で連打できる UI なので現実に起きる。
- 隣接移動は「2 つの `order` を入れ替える」だけで意味が完全に一致し、**隙間を一切消費しない**。
  何万回押しても振り直しが起きない。書き込みは 2 行で、送信量も実質変わらない。
- 交換の途中で `order` が一時的に重複するため、**`@@unique([sequenceId, order])` は張れない**
  （Postgres の一意制約は既定で即時評価。DEFERRABLE 宣言は Prisma からは扱いにくい）。
  代わりに `@@index` だけ張り、**読み出しのタイブレークを `id ASC` に固定**して順序を決定的にする。

**なぜ LexoRank / 小数文字列にしないか**

- 1 シークエンス 200 件・1 作品 2,000 件・利用者 6 人という規模で、Int（±約 21 億）が
  枯れる筋がない。文字列ランクは比較・生成・デバッグのコストだけ増える。
- 振り直しのフォールバックは残すが、**実運用では発火しない見込み**（発火しても最大 200 行・1 トランザクション）。

**`Project` に `order` は持たせない。** 作品一覧の並び替え UI は存在せず、現行の並びは
「挿入順（新しいものが先頭）」でしかない。DB では `updatedAt DESC, id ASC` で並べる。
→ **一覧の並び順が現行と変わる**ので企画へ報告する（[付録 C-2](#付録-c-企画部への差し戻し報告)）。

**`Character` には `order` を持たせる。** 並べ替え UI は無いが、順序が無いと
受け入れ条件 1 の「キャラクターの件数と並び順が一致」を満たせず、識別色の割り当て順
（`CHARACTER_COLORS[index]`）とも噛み合わなくなる。

### 決定 3. カスケード削除の範囲

**DB 側（`onDelete: Cascade`）**

```
User ─┬─ Account          （アカウント削除で消える）
      ├─ Session          （同上）
      └─ Project ─┬─ Story ── Sequence ── Scene ── SceneCharacter
                  ├─ Character ───────────────────┘
                  │     └─ Relationship（from / to の両方向とも Cascade）
                  ├─ Relationship
                  └─ CharacterGroup
                        └─ Character.groupId は **SetNull**（キャラは消さない）
```

> **追記（2026-08-04・相関図フィーチャ）**: 下段 3 行は
> [character-relationship-graph-data-migration の決定 6](./2026-08-04-character-relationship-graph-data-migration.md#決定-6-prisma-スキーマの受け皿干渉点-i-1)
> で追加したもの。**`CharacterGroup` → `Character.groupId` の `SetNull` が、この図で唯一
> Cascade でない辺**（グループは分類であって所有ではないため、枠を消してもキャラは残る）。
> スキーマは [prisma/schema.prisma](../../../../prisma/schema.prisma) に**適用済み**。

- `Character` を消すと `SceneCharacter` が落ちる ＝ 現行 `deleteCharacter` の
  「幽霊チップを外す」ループ（[store.ts](../../../../src/lib/store.ts)）と等価。**アプリ側のループは不要になる**。
- 論理削除・ゴミ箱は作らない（spec 8）。

**Blob は DB のカスケードでは消えない。順序は必ず Blob → DB（spec 8）**

| 操作 | 手順 |
| --- | --- |
| サムネイルの差し替え | 旧 URL を控える → **Blob 削除** → `thumbnailUrl` を新 URL で更新 |
| シーン削除 | `thumbnailUrl` を読む → **Blob 削除** → 行削除 |
| 作品削除 | その作品配下の `thumbnailUrl` を**全件 SELECT**（cascade で消える前に必ず先に読む） → **Blob 一括削除** → `project.delete()` |
| アカウント削除 | 全作品ぶんの `thumbnailUrl` を SELECT → **Blob 一括削除** ＋ `u/{userId}/` プレフィックスの掃き掃除 → `user.delete()` |

- **Blob 削除に失敗したら中断して DB を触らない。** DB に URL が残っていればやり直せる。
  逆順にすると参照ごと消えて、孤児 Blob を手で消すこともできなくなる（spec 8 の理由そのまま）。
- Blob のキーは `u/{userId}/…` を先頭に付ける。アカウント削除のときだけプレフィックス一覧で
  取りこぼしを掃除できるようにするため。作品単位の削除は**プレフィックスではなく DB の URL** を正とする
  （作品 id を Blob のキーに含めないので、プレフィックスでは作品単位に絞れない。
  含めない理由は取り込み手順の都合。[決定 4](#決定-4-サムネイルの移行data-url--vercel-blob)）。

### 決定 4. サムネイルの移行（data URL → Vercel Blob）

**決定: 旧 JSON の data URL は「クライアントでバイナリに戻して、そのまま Blob へ直アップロード」する。
原則として再エンコードしない。**

1. 旧 JSON の data URL は、**既に `fileToThumbnail` が長辺 640px / JPEG q0.82 に縮小した後のもの**
   （[image.ts](../../../../src/lib/image.ts)）。ここでもう一度デコード→再エンコードすると**劣化を重ねるだけ**なので、
   既定は「そのまま送る」。
2. 例外として、バイナリ化した結果が **300 KB を超えていたら再圧縮**する（spec 7 の「まず再圧縮」）。
   旧データにこのサイズはまず無いが、手で編集された JSON がありうるので栓は要る。
3. データ URL のデコード自体に失敗したら（壊れた base64・未知の MIME）、
   **そのシーンのサムネイルだけ捨てて本文の取り込みは続行**し、完了時に
   「N 件のサムネイルは読み込めませんでした」と出す。
   → **これは「途中で失敗したらその作品は作らない」（spec 5）の例外**。理由は
   [付録 C-4](#付録-c-企画部への差し戻し報告) に書いて企画へ報告する。
4. デコード・再圧縮・アップロードは**すべてクライアント**で行う。サーバに 50 MB の base64 を
   渡さないため（[決定 5](#決定-5-既存ローカルデータの吸い上げ手順50-mb-の受け口)）。
   ブラウザ API を使う処理は規約どおり `src/lib/` の関数に閉じる（`image.ts` の隣に置く）。
5. Blob のキーは `u/{userId}/thumb/…`、**ランダムサフィックスは既定のまま残す**。
   spec 7 の「推測できない URL だから公開でも許容する」という判断の前提が、
   キーが推測できないことに依存しているため。
6. 縮小の長辺 640px をモバイル実寸で上げるかどうか（spec の宿題）は**デザイン部の判断待ち**。
   上げる場合も 800px を超えないこと。**移行の設計はこの値に依存しない**（旧データは 640px で
   確定済みで、上げても遡って高精細にはならない）。

### 決定 5. 既存ローカルデータの吸い上げ手順（50 MB の受け口）

> **移行手段は JSON 経由の一本道。IndexedDB を直接読むコードは書かない**（社長回答 (b)）。

#### 5-1. なぜ「Server Action に JSON を渡す」実装が必ず落ちるか

Server Action のボディ上限は**既定 1 MB**（C-1・実測ではなく公式ドキュメントで確認）。
50 MB の JSON はここで確実に落ちる。検討して**捨てた案**は次の 2 つ。

| 捨てた案 | 捨てた理由 |
| --- | --- |
| `bodySizeLimit: '50mb'` に上げる | (1) 設定は**アプリ全体の Server Action に効く**。日常の保存経路にも 50 MB の窓を開けることになる (2) Vercel のプラットフォーム側にも別の上限がある（U-3・値は未確認だが 50 MB より小さい可能性が高い） (3) サーバのメモリ上で 50 MB の base64 を JSON.parse することになる |
| テキストをチャンク分割して複数回の Server Action で送る | 「**1 ファイル = 1 作品 = ひとまとまり**」（spec 5）を守るには、途中状態をどこかに置く必要がある。staging テーブル（＝データモデルが増える）か「取り込み中」フラグ（＝中途半端な作品が見えうる）のどちらかになる。放置されたチャンクが無料枠を食い続ける掃除問題も付いてくる |

#### 5-2. 採用する経路（テキストも Blob を経由させる）

**Server Action に渡すのは URL 1 本（数百バイト）だけ。`bodySizeLimit` は既定 1 MB のまま触らない。**

```
[ブラウザ]
 1. <input type="file" multiple> で *.storyline.json を選ぶ
 2. ファイルごとに: file.text() → parseProjectJson()      ← io.ts をそのまま再利用 (C-6)
 3. サムネイル: data URL → バイナリ → (>300KB なら再圧縮) → Blob へ直アップロード
                  → 返ってきた URL で scene.thumbnail を差し替える   ← 決定 4
 4. 画像を URL に差し替え終えた「テキストだけの JSON」を
    一時 Blob (tmp/{userId}/import-{id}.json) へアップロード
 5. Server Action importProjectFromBlob(tmpUrl) を呼ぶ   ← ボディは URL 1 本
[サーバ]
 6. セッション確認 → tmpUrl が自分の tmp/{userId}/ 配下かを検証
 7. fetch(tmpUrl) → text → parseProjectJson() → withFreshIds()  ← io.ts をそのまま再利用
 8. 上限を検証（件数・文字数）→ order を採番 → **単一トランザクション**で
    createMany を 5 本（characters / stories / sequences / scenes / sceneCharacters）
 9. 一時 Blob を削除 → projectId を返す
[ブラウザ]
10. 失敗した場合: そのファイルでアップロード済みの Blob と一時 Blob を後始末アクションで削除し、
    「<ファイル名> は取り込めませんでした（理由）」を出す。他のファイルの取り込みは続ける
```

**この形にした理由**

- **ボディ上限を一切踏まない**。上限を上げる設定変更が要らないので、日常の保存経路の安全性も下がらない。
- **原子性がタダで手に入る**。作品はサーバ側の 1 トランザクションでしか生まれないので、
  「途中で失敗したらその作品は作らない」が自然に成立する。staging テーブルも状態フラグも要らない。
- **経路が 1 本**。ファイルサイズによる分岐（小さければ直送、大きければ Blob 経由）を作らない。
  分岐は「大きいファイルでしか通らない側」のバグが移行当日まで見つからない。
- 一時 Blob の寿命は数秒。コミット後に削除し、失敗時もクライアントが後始末を呼ぶ。
  取りこぼしは `tmp/` プレフィックスを一覧して手で消せる（**定期削除の仕組みは作らない**・spec 13）。

**U-7（クライアント直アップロードの API）が使えなかった場合の代替**:
画像 1 枚ずつを **Route Handler** へ POST する（1 枚 ≤ 300 KB なので、どのボディ上限にも当たらない）。
`bodySizeLimit` は Server Action にだけ効く設定なので（C-1）、Route Handler はこの制約と無関係。
テキスト JSON も同じ Route Handler にストリームで渡して Blob に置けば、経路の形は変わらない。

#### 5-3. `parseProjectJson` / `withFreshIds` はそのまま再利用できるか（引き継ぎの宿題）

**結論: 2 つとも改造なしでサーバ側の受け口に使える（C-6）。ただし受け口側に 3 つ足りない。**

| 関数 | 判定 | 補足 |
| --- | --- | --- |
| `parseProjectJson` | **そのまま使える** | ブラウザ API 非依存。想定外の値を既定値へ落とす設計なので、外部由来 JSON の受け口としてサーバでも要件を満たす |
| `withFreshIds` | **そのまま使える。しかもサーバ側で呼ぶべき** | id の振り直しと `characterIds` の張り替えを 1 か所でやってくれる。**クライアントではなくサーバで呼ぶ**（クライアントが送ってくる id を信用しないため）。これで「旧 JSON の id を主キーにしない」が既存コードのまま満たせる |

**足りないもの（受け口に新しく書く）**

1. **日付の妥当性検証**。`normalizeProject` は `createdAt` / `updatedAt` を**文字列としてしか**見ていない
   （`str(source.createdAt, base.createdAt)`）。`"abc"` のような値がそのまま通るので、
   DB へ入れる前に `new Date(x)` が Invalid Date なら現在時刻へ落とす処理が要る。
2. **`order` の採番**。io.ts は配列順しか持たないので、配列の添字 × 1024 を振る処理が要る（[決定 2](#決定-2-並び順order-列の持ち方)）。
3. **上限の検証**。件数・文字数の検証は io.ts の責務ではない（`src/lib/limits.ts` に置く）。
   **上限超過時にテキストを勝手に切り詰めない**。本文を黙って削るのは復旧不能な損失なので、
   拒否して「どの上限に当たったか」を返す。

#### 5-4. 取り込み UI（spec 5 の前提どおり）

- 作品 0 件の EmptyState を移行導線に流用。`<input multiple>`。
- **常に新規作品として追加**。現行 [page.tsx](../../../../src/app/page.tsx) の
  「既に開いています。上書きしますか？」の `window.confirm` 分岐は**廃止**する。
- 1 ファイル単位で成否を分け、失敗したファイル名を画面に出す。
- 取り込み結果は「取り込んだ作品名の一覧」で見せる。**安全弁 ②（書き出したファイル数 = 作品件数）の
  突合相手になる**ため、件数が数えられる形にする。

### 決定 6. 失敗時の退避

**決定: 取り込みは冪等にしない（常に新規追加）。代わりに「1 ファイル = 1 トランザクション」の
原子性で守る。**

| 論点 | 決定 | 理由 |
| --- | --- | --- |
| 冪等にするか | **しない**。同じファイルを 2 回読めば 2 件できる | 冪等にする ＝ 2 回目に上書きするということ。上書きは不可逆で、最新の編集が消える。重複は片方を消せば回復できる。**可逆な失敗を選ぶ**（spec 5 と同じ判断） |
| 途中失敗 | **1 行も残さない**（サーバ側の単一トランザクション） | 中途半端な作品を残さない（spec 5）。やり直しは「もう一度同じファイルを選ぶ」だけ |
| 移行前の退避 | **spec の安全弁 ②（全端末で全作品を書き出す）をリリースゲートとして扱う**。開発側は書き出し UI を[決定 7](#決定-7-json-書き出し-ui-を落とすタイミング) の順序でしか触らない | 書き出しが済む前に切替 UI を触ると、移行元の端末から書き出す手段が消える |
| `local-final` タグ | 切替コミットの**直前**に打つ | 安全弁 ①。ただし spec が書いたとおり成立条件つき（同一プロファイル / 同一オリジン / サイトデータ未削除 / dev 環境保有者のみ）で、**主役ではない** |
| IndexedDB | **`del()` を呼ばない**。`persist` / `idbStorage` の読み書きコードは切替コミットで外すが、データは残す | 安全弁 ③ |
| 孤児 Blob | ブラウザが途中で落ちるとアップロード済み Blob が残りうる。**定期削除の仕組みは作らない**（spec 13）。`u/{userId}/` の一覧と DB の URL の差分で手動掃除できることだけ確認しておく | 自動削除は誤って生きた画像を消すリスクの方が高い |

### 決定 7. JSON 書き出し UI を落とすタイミング

**決定: 下の順序で進める。Step 2 より前に書き出し UI に一切触らない。`io.ts` は 1 行も消さない。**

| Step | やること | 書き出し UI の状態 |
| --- | --- | --- |
| **0**（切替前・ローカル版のまま） | 社長が端末・ブラウザを洗い出す（Q4）→ **全端末で全作品を書き出す** → 「書き出したファイル数 = 作品一覧の件数」を端末ごとに突合 | **現状のまま**（一覧ヘッダの「JSONを読み込む」・作品カードの「書き出す」・作品画面ヘッダの「書き出す」を全部残す）。**ここで UI を動かすと移行元から書き出せなくなる** |
| **1** | 切替コミットの直前に git タグ `local-final` | 同上 |
| **2** | 切替デプロイ（サーバ版）。ここで初めて**移設**する: 一覧ヘッダの読み込みボタン → EmptyState ＋ アカウントメニュー / 作品画面ヘッダの書き出し → 削除確認モーダル ＋ 作品カード | **移設であって削除ではない。** `downloadProject` / `toExportJson` / `parseProjectJson` / `withFreshIds` はすべて残す |
| **3** | 全端末ぶんの JSON を取り込む → 作品件数を突合 | 同上（移行が終わるまで到達可能に保つ） |
| **4** | 取り込み完了を社長が確認した後で、(a)（機能ごと廃止）を**別チケットで**判断 | 判断が下りるまでは残す |

- **読み込み側（`parseProjectJson` / `withFreshIds`）は (a) に進んでも消さない。**
  サーバ版の取り込み経路そのものであり、他アカウントへの作品移譲の唯一の手段でもある（spec 13）。
- (a) に進む場合の影響範囲は起票時の記載どおり（`downloadProject` / `toExportJson` /
  `src/app/page.tsx` / `src/app/projects/[projectId]/page.tsx` / `03-import-export.md`）。

---

### 付録 A. `Project` 型の全フィールド対応表（欠落ゼロ）

[src/lib/types.ts](../../../../src/lib/types.ts) の 5 つの interface・計 28 フィールドすべてを対応付けた。

| ローカル（型 / フィールド） | DB | 変換 |
| --- | --- | --- |
| `Project.id` | `Project.id` | **再採番**（`withFreshIds`）。旧 id は捨てる |
| `Project.title` | `Project.title` | そのまま |
| `Project.summary` | `Project.summary` | そのまま |
| `Project.createdAt`（ISO 文字列） | `Project.createdAt`（timestamptz） | `new Date(iso)`。Invalid なら現在時刻 |
| `Project.updatedAt`（ISO 文字列） | `Project.updatedAt`（timestamptz） | 同上 |
| `Project.characters[]` | `Character[]`（`projectId`） | 配列の添字 → `order`（× 1024） |
| `Project.stories[]` | `Story[]`（`projectId`） | 同上 |
| （新規） | `Project.userId` | ログイン中のユーザ |
| （配列としての作品の並び） | **列を持たない** | 一覧は `updatedAt DESC, id ASC`（[C-2 で企画へ報告](#付録-c-企画部への差し戻し報告)） |
| `Story.id` | `Story.id` | 再採番 |
| `Story.title` / `Story.summary` | 同名 | そのまま |
| `Story.sequences[]` | `Sequence[]`（`storyId`） | 添字 → `order` |
| `Sequence.id` | `Sequence.id` | 再採番 |
| `Sequence.title` / `Sequence.summary` | 同名 | そのまま |
| `Sequence.scenes[]` | `Scene[]`（`sequenceId`） | 添字 → `order` |
| `Scene.id` | `Scene.id` | 再採番 |
| `Scene.title` / `Scene.summary` / `Scene.timeLabel` / `Scene.place` / `Scene.memo` | 同名 | そのまま |
| `Scene.status`（`"idea"\|"draft"\|"done"`） | `Scene.status`（enum `SceneStatus`） | 値は同一。未知の値は `parseProjectJson` が `idea` に落とす |
| `Scene.characterIds[]` | `SceneCharacter` 行（`sceneId` × `characterId`） | id は張り替え（`withFreshIds`）。**配列の順序は保持しない**（付録 B） |
| `Scene.thumbnail?`（data URL） | `Scene.thumbnailUrl`（`String?`・**Blob の URL**） | **意味が変わる**。取り込み時に data URL → Blob（[決定 4](#決定-4-サムネイルの移行data-url--vercel-blob)）。未設定は `null` |
| `Character.id` | `Character.id` | 再採番 |
| `Character.name` / `Character.color` / `Character.role` / `Character.note` | 同名 | そのまま |
| （無し） | `Character.order` | 配列の添字 × 1024 |
| （無し） | `Story.order` / `Sequence.order` / `Scene.order` | 同上 |
| **`Character.x?`**（相関図の論理座標） | `Character.x`（`Float?`） | 未設定は `null`。`Int` にしないのは往復で丸めが起きないようにするため |
| **`Character.y?`** | `Character.y`（`Float?`） | 同上。**`x` と `y` は両方揃って初めて有効**（DB では強制せず、取り込み / 書き出し側で担保） |
| **`Character.groupId?`** | `Character.groupId`（`String?`） | `CharacterGroup.id`。id は張り替え（`withFreshIds`）。グループ削除時は **`SetNull`** |
| **`Project.relationships[]`** | `Relationship[]`（`projectId`） | 配列の添字 → `order`（× 1024）。`fromId` / `toId` は張り替え。**張り替えられなかったものは捨てる** |
| **`Project.characterGroups[]`** | `CharacterGroup[]`（`projectId`） | 同上（添字 → `order`） |

> **追記（2026-08-04・相関図フィーチャ）**: 下 5 行は
> [character-relationship-graph-data-migration の決定 6](./2026-08-04-character-relationship-graph-data-migration.md#決定-6-prisma-スキーマの受け皿干渉点-i-1)
> による追加。**取り込みの `createMany` は 5 本 → 7 本になる**（`characterGroups` と
> `relationships` が増える）。**実行順は `characterGroups` → `characters` → `relationships`**
> （FK の解決順。逆にすると外部キー違反で落ちる）。

`SCENE_STATUSES` / `CHARACTER_COLORS`（[types.ts](../../../../src/lib/types.ts)）は表示用の定数で、
DB へは移さない（`className` は Tailwind のクラス名なので、DB に入れる類のものではない）。

### 付録 B. 書き出し JSON の往復（机上確認）

**書き出しの形は現行と 1 バイトも変えない。`EXPORT_FORMAT = "storyline.project"` /
`EXPORT_VERSION = 1` は据え置く**（ローカル版が書き出した JSON をサーバ版が読めることが生命線）。

サーバ版の書き出しは DB から次の形に組み立て直す:

```
Project { id, title, summary, createdAt(ISO), updatedAt(ISO),
          characters:      Character[order ASC],      // x / y / groupId を含む
          relationships:   Relationship[order ASC],   // 相関図 (2026-08-04 追加)
          characterGroups: CharacterGroup[order ASC], // 相関図 (2026-08-04 追加)
          stories:         Story[order ASC] → sequences[order ASC] → scenes[order ASC] }
```

> **追記（2026-08-04・相関図フィーチャ）**: `relationships` / `characterGroups` は
> **必ず `order ASC` で並べて出す**（配列順の保持そのものが仕様。
> [相関図 spec 10-1](../../planning/specs/2026-08-04-character-relationship-graph-spec.md)）。
> `Character.x` / `y` / `groupId` は **`null` ならキーごと省略する**
> （`thumbnail` と同じ流儀。未配置・未所属を「キーが無い」で表す）。
> **`EXPORT_FORMAT` / `EXPORT_VERSION = 1` は据え置きのまま**で足りる
> （[相関図 決定 3-1](./2026-08-04-character-relationship-graph-data-migration.md#3-1-export_format--export_version--1-は据え置く上げない)）。

- `thumbnailUrl` が `null` のときは **`thumbnail` キーごと省略**する（現行 `createScene` の
  `...(thumbnail ? { thumbnail } : {})` と同じ形）。`null` を出しても `str()` が空文字にするので
  実害は無いが、往復でファイルが変わらない方が差分を取って検証できる。

#### サムネイルは data URL に戻して書き出す（企画の希望どおり・覆さない）

| 論点 | 決定 |
| --- | --- |
| 書き出し時の `thumbnail` | **Blob URL を fetch して data URL に戻す**。URL のまま出さない |

**理由 1（決定的）**: 書き出しが最も要る瞬間は「作品削除 / アカウント削除の直前」（spec 8 のモーダルに
書き出しボタンがある）。ここで URL だけの JSON を渡すと、**削除の数秒後に全部 404 になり、
退避の意味が消える**。「書き出した JSON 単体で復元できること」は、この場面では機能要件そのもの。

**理由 2**: URL のまま出すと、同じ `format` / `version` のファイルに「data URL 入り」と
「URL 入り」の 2 種類が混ざる。読む側は `str()` で素通しするので、**壊れていることに気付けない**
（画像が出ないだけ）。バージョンを上げれば区別できるが、`EXPORT_VERSION` を上げると
ローカル版（`local-final`）が読めなくなる恐れがあり、移行期間中は動かしたくない。

**コストと緩和**: サムネイル 400 枚の作品なら fetch 400 回・約 40 MB のダウンロード →
base64 化して約 55 MB の JSON になる。モバイルでは重いので、**進捗表示つき・同時 6 本程度に制限**する。
1 枚の取得に失敗したらそのシーンの `thumbnail` を落として続行する（全体を落とさない）。
Blob の URL は内容ごとに固有なので長い `Cache-Control` が効き、直前まで開いていた作品なら
ブラウザキャッシュから取れる見込み。

#### spec 5 章「移行の受け入れ条件」4 項目の判定

| 条件 | 判定 | 根拠 |
| --- | --- | --- |
| 1. 往復で件数と**並び順**が一致 | **満たす**（ファイル内について） | `order` 列（[決定 2](#決定-2-並び順order-列の持ち方)）で保持し、読み出しは `order ASC, id ASC` 固定。**「作品の並び順」を一覧の並びと解釈するなら別**（[付録 C-2](#付録-c-企画部への差し戻し報告)） |
| 2. `characterIds` が張り替え後も同じ人物を指す | **満たす** | `withFreshIds` の `characterIdMap`（既存コード）で張り替え、中間表に落とす。**ただし配列の順序は保持しない**（下記） |
| 3. 画像が表示される | **満たす設計**（実測は実装時） | data URL → Blob（[決定 4](#決定-4-サムネイルの移行data-url--vercel-blob)）。再エンコードしないので画質も変わらない |
| 4. 取り込み前後で作品件数が一致 | **満たす** | 1 ファイル = 1 作品 = 1 トランザクション。失敗したファイル名を出すので、件数の食い違いが黙って起きない |

#### 往復で「落ちる」もの（2 点だけ。隠さず書く）

1. **`Scene.characterIds` の配列順**。中間表に順序列を作らないので、書き出しは
   `Character.order` 昇順に整列した並びになる。受け入れ条件 2 は「同じ人物を指すこと」なので
   合格だが、**シーンカードのキャラチップの表示順が変わる**（`SceneCard` / `MobileSceneRow` は
   `characterIds` の順に描画している）。→ [付録 C-3](#付録-c-企画部への差し戻し報告)
2. **作品一覧の並び順**。挿入順 → `updatedAt` 降順に変わる。→ [付録 C-2](#付録-c-企画部への差し戻し報告)

本文・件数・階層構造・ステータス・サムネイル画像そのものは落ちない。

### 付録 C. 企画部への差し戻し・報告

| # | 内容 | 企画に判断してほしいこと |
| --- | --- | --- |
| **C-1** | **無料枠の検算はできなかった。** この環境に Neon / Vercel のアカウントもネットワーク経由の確認手段も無い（U-1・U-2）。**「Neon 0.5 GB / Blob 1 GB」は依然として未確認の想定値**であり、それを 1 人あたり約 75 MB で割った**「ユーザ 6 人」も未確認のまま**。spec 7 の「要確認」は消せない | 実値の確認は社長がアカウントを作った後（Q3）。**それまで「6 人」を確定値として他文書に転記しないこと** |
| **C-2** | **作品一覧の並び順**を「挿入順（新しいものが先頭）」から **`updatedAt` 降順**へ変える。`Project` に `order` 列を持たせないための判断（並べ替え UI が無い列を作らない）。スマホでは「最近触った作品が上」の方が理に適う | (a) この変更を受け入れるか (b) 受け入れ条件 1 の「**作品**の並び順」は一覧の並びを指すのか、書き出しファイル内の並びを指すのか |
| **C-3** | **`Scene.characterIds` の配列順は保持しない**（中間表に順序列を作らない）。シーンカードのキャラチップの表示順が、キャラクター一覧の順に揃う形へ変わる | 順序の保持が要るなら中間表に `order` 列を足す（コストは小さい）。要否の判断 |
| **C-4** | **spec 5「途中で失敗したらその作品は作らない」に例外を 1 つ置きたい。** data URL のデコード自体に失敗した画像は、**そのサムネイルだけ捨てて本文は取り込む**（完了時に件数を通知）。理由: 壊れた画像は何度やり直しても直らないので、作品ごと拒否すると**その作品を永久に移行できない**。本文が失われる方が損害が大きい | この例外を認めるか |
| **C-5** | **サーバ版が書き出した JSON が、インポート上限 50 MB を超えうる。** 画像 100 MB/ユーザの上限まで使った作品を data URL に戻して書き出すと 50 MB を超える（付録 B）。50 MB は「旧ローカル版の JSON を通すため」の値なので、**自分が書き出したファイルを自分で読めない**状態が理屈の上では起きる | (a) 50 MB は「クライアント側の sanity check」と割り切って超過時は警告のみで続行にするか (b) 上限値を見直すか |
| **C-6** | **spec 4「判定は middleware で行う」は Next.js 16 では書き換えが要る。** `middleware` は非推奨で `proxy.ts` にリネームされている（C-2）。さらに公式ドキュメントが「**Proxy に頼らず各 Server Function 内で認証・認可を検証すること**」と明記している（C-3） | spec 4 の文言を「`proxy.ts` でリダイレクト、認可は各 Server Action 内で必ず検証」に更新。**所有者チェックを middleware でやらない**という既存の判断はそのまま正しい |
| **C-7** | **上限に当たると移行そのものが弾かれうる。** 旧データが上限（例: 1 シークエンス 200 シーン、memo 2,000 字）を超えていた場合、取り込みは拒否になる。データは JSON に残るので不可逆ではないが、**移行不能**にはなる。テキストの切り詰めは行わない（本文を黙って削らない） | 上限に当たった実データが出たら、spec 7 の表を更新して上限を緩める運用でよいか |

### 付録 D. 社長へ確認したいこと

- **Q4（最高・変わらず）**: 切替日 ＋ ローカル版を開いたことのある端末・ブラウザの洗い出し ＋
  全端末での事前書き出しの了承。**[決定 7](#決定-7-json-書き出し-ui-を落とすタイミング) の Step 0 が終わらないと Step 2 に進めない**（リリースゲート）。
- **Q3 / Q6 / Q8 は開いたまま**。特に Q3（無料枠の実値）は開発側でも確認できなかった（付録 C-1）。
- **追加 1**: `npx` で入る Prisma は **7.9.1** で、**接続 URL を `schema.prisma` に書けない**（C-4）。
  実装時は `prisma.config.ts` ＋ ドライバアダプタ構成になる（U-8）。
  Prisma 6 系に固定する選択肢もあるが、新しい方に合わせる前提で草案を書いた。異論があれば実装前に。
- **追加 2**: `serverActions.bodySizeLimit` は**既定 1 MB のまま据え置く**方針にした
  （[決定 5](#決定-5-既存ローカルデータの吸い上げ手順50-mb-の受け口)）。移行のために全体の窓を広げない。

---

## 引き継ぎ

### 背景（企画部 → 開発部・2026-08-04）

アカウント制・サーバ移行の仕様が確定した。ゲートだった planning チケットは完了。

- 成果物: [planning/specs/2026-08-04-accounts-and-server-spec.md](../../planning/specs/2026-08-04-accounts-and-server-spec.md)
- 元チケット: [planning/tasks/2026-08-04-accounts-and-server-spec.md](../../planning/tasks/2026-08-04-accounts-and-server-spec.md)

社長の追加指示により、初回決裁から前提が 2 点変わっている（決裁記録の「追記」節）。
本チケットに効くのは主に後者:

1. **スマホがメイン想定**（モバイルファースト）。PC とスマホで仕様が競合したらスマホ優先
2. **「json で書き出すのはやめて」は解釈 (b) で確定**。
   [src/lib/io.ts](../../../../src/lib/io.ts) の `downloadProject` / `parseProjectJson` /
   `withFreshIds` は**全部残す**。常用導線から外すだけ。**移行完了前に 1 行も消さない**

### ⚠ 企画部の精査で変わった点（2026-08-04・草案から差し替え済み）

spec の初版は秘書が代筆した草案で、企画部の検証を通していなかった。同日に企画部が全文精査し、
**下記 5 点が本チケットの設計に直接効く形で変わっている**。草案を先に読んでいた場合は
上書きすること。

| 変更 | 旧（草案） | 新（確定） | 効いてくる箇所 |
| --- | --- | --- | --- |
| 移行元の端末 | 「**PC 前提**。スマホには移行すべきデータが存在しない」 | **誤りとして訂正**。IndexedDB は端末・ブラウザごとに独立するので、スマホでローカル版を開いていればそこにしか無い作品がある。**旧データがある端末ごとに書き出す**。読み込みの推奨線が PC なのは変わらない | 移行手順・リリース手順 |
| インポート JSON 上限 | 20 MB | **50 MB**。旧 JSON は data URL サムネイルを含み base64 で約 1.33 倍。サムネイル付き 150 シーンで 20 MB を超え、**移行自体が弾かれる**恐れがあった | 受け口の設計・分割送信 |
| 画像 300 KB 超 | 拒否 | **まず再圧縮**（品質 → 長辺の順に落とす）。それでも超えたものだけ拒否 | サムネイル移行・アップロード |
| ユーザ数 | 上限なし（見積りの前提が 5 人と書かれているだけ） | **6 人を上限として明示**（DB が律速。7 人で無料枠 512 MB 想定を超える） | 上限バリデーション・許可リスト |
| 取り込みの失敗単位 | 未定義 | **1 ファイル = 1 作品 = ひとまとまり**。途中失敗したらその作品は作らない（中途半端な作品を残さない）。複数ファイルのうち 1 つが失敗しても他は取り込み、失敗ファイル名を出す | 受け口のトランザクション設計 |

### 確定したこと（本チケットの判断に直接効くもの）

| 論点 | 確定内容 |
| --- | --- |
| 移行経路 | JSON 経由（決裁どおり）。専用ウィザードは作らない。作品 0 件の EmptyState を導線に流用 |
| インポートの意味論 | **常に新規作品として追加**。上書きは提供しない。id はユーザ内で新規採番（`withFreshIds` 相当）。同じファイルを 2 回読むと 2 件できる（片方を消せる＝可逆）を許容する |
| 複数ファイル | ファイル選択は `multiple`。1 回の操作で複数作品を取り込める。**1 ファイル単位で成否を分ける** |
| 移行を行う端末 | **旧データが入っている端末ごとに書き出す**（IndexedDB は端末・ブラウザごとに独立）。読み込みの推奨線は PC。スマホからの読み込みは塞がないが動作保証しない（ここだけモバイル優先の適用対象外） |
| サムネイル | 旧 JSON 内の data URL は取り込み時に Blob へ移す。**DB に data URL を残さない**。原本画像は絶対にアップロードしない（クライアントで縮小してから送る） |
| ローカル版の廃止 | 並行運用の猶予期間なし。`persist` / `idbStorage` の読み書きは切替コミットで削除。ただし `del()` は呼ばず IndexedDB のデータ自体は残す |
| 失敗時の退避（安全弁 4 つ） | ①切替前コミットに git タグ `local-final`（**成立条件つき**: 同一ブラウザプロファイル / 同一オリジン / サイトデータ未削除 / dev 環境保有者のみ。「猶予は無期限」ではない） ②**切替デプロイ前に旧データがある全端末で全作品を JSON 書き出し＝リリースゲート**（「書き出したファイル数 = 作品一覧の件数」で突合） ③IndexedDB を消さない ④**切替後は旧版（`local-final`）で編集しない**（読み出し・書き出し専用） |
| 上限（サーバ側で強制） | **ユーザ 6 人**、作品 20 / ユーザ、ストーリー 20 / 作品、シークエンス 50 / ストーリー、シーン 200 / シークエンス・2,000 / 作品・5,000 / ユーザ、キャラクター 100 / 作品、サムネイル 1 枚 / シーン かつ縮小後 300 KB（**超えたら再圧縮してから判定**）、画像合計 100 MB / ユーザ、取り込む元画像 20 MB、**インポート JSON 1 ファイル 50 MB**。テキスト長は spec 7 章の表 |
| 一望性 | **ページング・無限スクロールを作らない**。ボードは開いているストーリーのシーンを一括取得。上限（1 シークエンス 200 / 作品 2,000）はこの一括取得を成立させるための値でもある |
| 保存の粒度 | 楽観的更新 ＋ **編集した 1 件（シーン / キャラクター / 作品）単位**で送る。作品まるごとを毎回送らない。**保存に失敗しても画面の入力を消さない**（spec 1-2。詳細は本実装チケット） |
| 削除の範囲と順序 | 作品削除でストーリー・シークエンス・シーン・キャラクター・中間行・**Blob 上の画像**まで落とす。アカウント削除では加えて `Account` / `Session` / `User` も削除。**順序は Blob → DB**（逆にすると孤児 Blob が無料枠を食い、参照も失われて手で消せない）。論理削除・ゴミ箱は作らない |

### 次にやってほしいこと

1. Prisma スキーマ確定時に、**上限値をスキーマ / バリデーション層のどちらで担保するか**を決める
   （企画としては Server Action の入口での検証を想定。DB 制約は必須としない）
2. `order` 列の持ち方を決める（現行は配列の添字で `order` を持たない設計。
   [01-storyline-concept.md](../../../docs/01-project-overview/01-storyline-concept.md) の
   「`order` フィールドを持たない」は**ローカル版の設計原則**であり、DB では列が要る。
   ただし**シーンが実日付を持たない設計は移行後も維持する**）
3. `Project` 型（[src/lib/types.ts](../../../../src/lib/types.ts)）の全フィールド対応表を作る際、
   `Scene.thumbnail` が「data URL」から「Blob の URL」へ意味が変わる点を明記する。
   書き出し JSON の互換をどうするか（data URL に戻して書き出すのか、URL のまま出すのか）は
   **本チケットで決めてほしい**。企画の希望は「書き出した JSON 単体で復元できること」＝
   書き出し時に data URL へ戻す方式だが、転送量・実装コスト次第で覆して良い（要報告）
4. 上限値の根拠（spec 7 章の概算表）を、Neon / Blob の**実際の無料枠**で検算する。
   想定（0.5 GB / 1 GB）と違えば企画へ差し戻してほしい。
   **特に「ユーザ 6 人」は無料枠の実値に直結する**（1 人あたり最悪 約 75 MB で割った値）
5. **spec 14-2「未確認事項」の実測**（Blob の非公開/署名付き URL の可否、iOS の HEIC、
   スマホでの `accept` の効き、Auth.js の既定セッション期間と `email_verified`）。
   結果を企画へ返してほしい

### 注意点

- **Server Action のボディ上限に注意**。Next.js の `serverActions.bodySizeLimit` は既定 1 MB
  （`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md`
  で確認済み）、Vercel のリクエストボディ上限も別途ある。**50 MB の JSON をそのまま
  Server Action へ渡す実装は必ず落ちる**。クライアントで `parseProjectJson` してから、
  画像は Blob へクライアントアップロード、テキストは分割して送る等の設計が要る。
  ここは移行の成否を分けるので先に潰してほしい
- `EXPORT_FORMAT = "storyline.project"` と `EXPORT_VERSION = 1` は**理由なく変えない**。
  ローカル版で書き出した JSON をサーバ版が読めることが移行の生命線
- 旧 JSON の id をそのまま DB の主キーにしない（他ユーザと衝突しうる）
- Neon の無料プランはアイドルで compute がサスペンドする。初回アクセスが遅くなるため、
  UI 側の「読み込み中」表示は残す前提で設計してほしい
- 画像のデコード可否（iOS の HEIC 等）は実測が必要。**スマホがメイン想定なので、
  ここが通らないと画像機能が実質使えない**。読めない形式は
  「この画像は読み込めません。JPEG か PNG を選んでください」で拒否する
- 縮小の長辺 640px（[src/lib/image.ts](../../../../src/lib/image.ts) の `MAX_EDGE`）は
  PC のカード幅 288px を前提にした値。モバイル実寸では不足しうるので再検証が要る
  （**上げる場合も 800px を超えないこと**。超えると Blob の見積りが崩れる）
- 現行の `src/app/page.tsx` の import は**単一ファイル選択**（`multiple` なし）で、
  id 衝突時に `window.confirm` で上書き / 別作品を選ばせている。サーバ版では
  **この分岐ごと廃止**して常に新規採番にする

### 開放質問（社長回答待ち。本チケットの作業は止めなくてよい）

- **Q4（最高）** 切替日 ＋ **ローカル版を開いたことのある端末・ブラウザの洗い出し** ＋
  全端末での事前書き出しの了承（安全弁 ② はリリースゲート）
- Q3（高） Neon / Blob の無料枠の実値（0.5 GB / 1 GB という想定で合っているか）
- Q6（高） 上限値 ＋ **利用者 6 人まで**という制約で足りるか
- Q8（低） サムネイルが「URL を知っていれば見られる」状態を受け入れるか

全リストは [spec の 14 章](../../planning/specs/2026-08-04-accounts-and-server-spec.md) を参照。
