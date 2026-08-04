# アカウント制移行のデータ移行方針を確定する

- ステータス: **未着手**
- 優先度: **高**
- モデル: opus
- 起票日: 2026-08-04
- 更新日: 2026-08-04（JSON の扱いが (b) で社長確定したため、移行手段を JSON 経由に一本化）
- 依頼元: 社長（秘書経由・データモデル変更の特則により先行起票）
- 前提: [planning/2026-08-04-accounts-and-server-spec.md](../../planning/tasks/2026-08-04-accounts-and-server-spec.md) の完了（**2026-08-04 完了済み**）
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
     常に新規作品として追加（上書きは提供しない）・移行は PC で行う前提」となっている。
     この前提でサーバ側の受け口を設計すること
6. 失敗時の退避（移行前に必ず JSON を書き出させるか、インポートを冪等にするか）
   — spec の決定 4 の安全弁（`local-final` タグ / 切替前の全作品書き出し / IndexedDB を消さない）
   と矛盾しないこと
7. **JSON 書き出し UI を落とすタイミング**（(b) 確定下でむしろ重要）
   - (b) は「主手段から外す」であって「即時削除」ではない。**移行が完了する前に消さない**こと。
     消す順序を誤ると既存ユーザの作品を DB に運ぶ手段が消える（復旧不能）
   - `parseProjectJson` / `withFreshIds`（読み込み側）は**移行経路として残すため削除しない**
   - 将来 (a)（完全廃止）を再判断する場合の影響範囲: `src/lib/io.ts` の
     `downloadProject` / `toExportJson`、`src/app/page.tsx`、
     `src/app/projects/[projectId]/page.tsx` の書き出しボタン、
     および `.claude/docs/02-development-docs/03-import-export.md`

## 完了条件

- [ ] `dev/tech-debt/` ではなく本チケット内に、上記 7 点の決定と理由が記載されている
- [ ] 移行手段が JSON 経由（社長回答 (b)）で設計されており、IndexedDB 直読みの案が混入していない
- [ ] `prisma/schema.prisma` の草案が本チケットに貼られ、`npx prisma validate` が通ることを確認済み
- [ ] 既存の `Project` 型（[src/lib/types.ts](../../../../src/lib/types.ts)）の全フィールドが
      スキーマ上のどこに対応するか、対応表がある（欠落ゼロ）
- [ ] 書き出し JSON の往復（現行ローカル版で書き出し → サーバ版で読み込み）で情報が落ちないことを
      机上で確認（サムネイルの data URL → Blob 変換を含む）
- [ ] 書き出し UI を落とす時期が「移行完了後」と手順として書かれている（読み込み側は残すことも明記）
- [ ] 本実装チケットへ `## 引き継ぎ` を記載
