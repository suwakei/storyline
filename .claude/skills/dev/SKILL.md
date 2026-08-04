---
name: dev
description: 開発部 (dev) に直接タスクを指示する。コード実装・バグ修正・リファクタ・型エラー解消・パフォーマンス改善・テスト追加が対象。「何を作るか」の判断は plan skill、UI 仕様策定は design skill 側。
argument-hint: <タスク内容>
model: sonnet
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
---

開発部にタスクを直接指示します。

devサブエージェントを起動し、以下の指示を実行させてください:
$ARGUMENTS

## 起動条件

- 仕様・UI が確定済みで実装に落とせる
- 既存バグの再現手順が明確
- どの層 (`src/lib/` / `src/components/` / `src/app/`) の作業か自明

上記を満たさない場合は [/company](../company/SKILL.md) に戻して秘書に仕分けを任せる。

## 典型的な依頼パターン

| 種類 | 例 |
| --- | --- |
| 実装 | 「シーンカードに場所アイコンを出す」「ストーリーの複製操作をストアに追加」 |
| バグ修正 | 「列を跨いでドロップするとシーンが末尾に飛ぶ」「読み込み直後にカードが出ない」 |
| リファクタ | 「Board の drag ハンドラを整理して分岐を減らす」 |
| パフォーマンス | 「シーン数 200 でタイトル入力が重い」 |
| テスト追加 | 「`parseProjectJson` の壊れ JSON 経路にテストを追加」(テスト基盤の導入から) |

## データモデル・永続化に触る依頼は要注意 (最優先)

`src/lib/types.ts` の型、`STORAGE_KEY`、`persist` の `version` / `partialize`、
エクスポート形式に触る依頼は、**実装前に移行方針を書き出してユーザに提示する**。
ユーザの作品データは IndexedDB にしか無く、壊すと復旧できない。
判断材料は [02-data-model-and-persistence.md](../../docs/02-development-docs/02-data-model-and-persistence.md)。

## 着手前に読む docs (関連するものだけ)

CLAUDE.md の docs テーブルから引く。dev が触る代表分:

- 画面構成・コンポーネント追加 → [01-architecture-design](../../docs/02-development-docs/01-architecture-design.md)
- ストア操作・永続化 → [02-data-model-and-persistence](../../docs/02-development-docs/02-data-model-and-persistence.md)
- 書き出し / 読み込み → [03-import-export](../../docs/02-development-docs/03-import-export.md)
- ドラッグ & ドロップ → [07-drag-and-drop](../../docs/02-development-docs/07-drag-and-drop.md)
- 入力の重さ・再描画 → [08-performance-optimization](../../docs/02-development-docs/08-performance-optimization.md)
- Next.js の書き方 → [01-next-app-router-doc](../../docs/03-library-docs/01-next-app-router-doc.md)

## サブエージェント委譲ルール (重要)

CLAUDE.md コーディング規約より:

| 対象 | 委譲先 |
| --- | --- |
| `src/components/` | [component-builder](../../agents/component-builder.md) |
| `src/lib/` | [store-builder](../../agents/store-builder.md) |
| `src/app/` の配線・`globals.css`・設定ファイル・些細な修正 | dev が直接編集 |

両層にまたがる場合は **store-builder → component-builder の順**。並列で回すときは
公開 API の契約を先に決めて両者へ明示する。

## 検証 (dev サーバは起動しない)

`npm run dev` は Claude 側で起動しない。検証は次の 3 つで行う:

```
npx tsc --noEmit
npm run lint
npm run build
```

画面での確認が必要な場合は、ユーザに「`npm run dev` を実行して確認してください」と依頼し、
確認してほしい観点を箇条書きで渡す。

## 完了時の記録

`.claude/.company/dev/tasks/YYYY-MM-DD-<slug>.md` に以下を記録:

- 症状・スコープ・根本原因 (バグ修正の場合)
- 変更ファイルと変更内容 (テーブル形式)
- 検証結果 (`tsc --noEmit` exit code / `lint` / `build` / ユーザ確認の要否)
- 残作業 (社長手番ならその旨明示)

レビュー指摘は `.claude/.company/dev/reviews/` / 技術的負債は `.claude/.company/dev/tech-debt/` に分離。

## 下流引き継ぎ

- UI 実装完了 → [design](../design/SKILL.md) にデザインレビュー依頼
- 仕様の穴が見つかった → [plan](../plan/SKILL.md) に差し戻し
- ユーザから見える変更が入った → [pr](../pr/SKILL.md) にリリースノート起票依頼

引き継ぎは [/handoff](../handoff/SKILL.md) を使う (双方向ポインタ + 引き継ぎ品質バー必須)。
