# アカウント制・サーバ移行の実装

- ステータス: **未着手**
- 優先度: **高**
- モデル: opus
- 起票日: 2026-08-04
- 更新日: 2026-08-04（モバイルファースト化と JSON 存廃の分岐を完了条件に反映）
- 依頼元: 社長
- 前提: [planning/2026-08-04-accounts-and-server-spec.md](../../planning/tasks/2026-08-04-accounts-and-server-spec.md) の完了 ＋ [dev/2026-08-04-accounts-and-server-data-migration.md](./2026-08-04-accounts-and-server-data-migration.md) の完了 ＋ 下記ブロッカーの解消
- 決裁記録: [2026-08-04-accounts-and-server-decisions.md](../../secretary/decisions/2026-08-04-accounts-and-server-decisions.md)

## 概要

確定した仕様と移行方針に従い、Google ログイン + Postgres 保存へ実装を切り替える。
これによりスマホ・複数端末から同じ作品を触れるようになる（本チケットが移行の本体）。

**2026-08-04 追記**: 社長の想定利用がスマホメインになったため、本チケットで新規に増える画面
（ログイン / エラー / 移行導線）も**スマホ幅 375px を基準に作る**。PC はそれを広い画面に
広げたもの、という順序で実装すること。

## ブロッカー（社長作業。揃うまで完了できない）

- [ ] `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`（Google Cloud で OAuth クライアント作成）
- [ ] `DATABASE_URL`（GitHub → Vercel 連携 → `vercel install neon`）
- [ ] `BLOB_READ_WRITE_TOKEN`（Vercel Blob ストア作成）

揃うまでは、スキーマ・Server Actions・UI 配線まで書いて `npm run build` /
`npx tsc --noEmit` / `npx prisma validate` で検証する。

## 作業

- Prisma 導入とマイグレーション
- Auth.js v5 + Google Provider、middleware で未ログインを `/login` へ
- Server Actions で CRUD。**全クエリを `userId` で絞る**（他人の作品に触れないこと）
- [src/lib/store.ts](../../../../src/lib/store.ts) を「サーバデータのキャッシュ + 楽観更新」に作り替え。
  zustand ストアは 1 つのまま増やさない
- サムネイルを Vercel Blob へ（[src/lib/image.ts](../../../../src/lib/image.ts) の縮小は流用）
- 既存ローカルデータの移行導線（移行方針チケットで確定した手段に従う）
- JSON 書き出し／読み込みの扱いを spec の決定 7 に合わせる
  （残す / UI 上の位置づけを下げる / 移行完了後に削除、のいずれか）

## 完了条件

- [ ] 未ログインで `/` と `/projects/*` にアクセスすると `/login` へ飛ぶ
- [ ] 別アカウントの作品 id を URL に直接入れても 404 になる（ログイン済みでも他人の作品は見えない）
- [ ] 作品の作成・シーンの追加編集・並べ替えが DB に永続化され、別端末で再ログインすると同じ状態が見える
- [ ] サムネイルが Blob に保存され、DB には URL のみが入る
- [ ] 既存ローカルデータの移行が、移行方針チケットで確定した手段で実際に通る
      （シーン・キャラ・サムネイルが復元できること）
- [ ] **本チケットで追加した全画面（ログイン / エラー / 移行導線）が幅 375px で横スクロールしない**
- [ ] **ログインボタンを含む操作要素のタップ領域が 44x44px 以上**
- [ ] JSON 書き出しを廃止する結論だった場合、削除が**移行導線の動作確認後**に行われている
      （順序を逆にしない）
- [ ] `npm run build` / `npm run lint` / `npx tsc --noEmit` が通る
- [ ] **ユーザによる画面確認**（PC ブラウザ ＋ **実機スマホ**の両方。Claude 側では dev サーバを起動しない）
- [ ] [.claude/CLAUDE.md](../../../CLAUDE.md) の「ユーザデータは IndexedDB にしか無い」節と
      [.company/CLAUDE.md](../../CLAUDE.md) の「サーバ: 無し」「スタック」を同じコミットで更新
- [ ] JSON の扱いを変えた場合は
      [03-import-export.md](../../../docs/02-development-docs/03-import-export.md) も同じコミットで更新
- [ ] [README.md](../../../../README.md) の保存・デプロイの記述を更新（広報部へ回すほどの分量なら pr に起票）
</content>
