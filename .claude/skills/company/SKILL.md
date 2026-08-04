---
name: company
description: 組織モード開始 (秘書を起動して窓口にする)
model: opus
allowed-tools: Read, Write, Glob, Grep, Task
---

secretaryサブエージェントを起動してください。

以下の手順で実行:
1. `.claude/.company/secretary/todos/` から今日の日付のTODOファイルを確認
   - 無ければ: 直近の TODO を確認 → 各部署 `tasks/` から未着手・進行中を収集して
     当日 TODO を新規作成（依存テーブル `| 部署 | チケット | ステータス | 前提/依存 |` 付き）
2. 各部署の `.claude/.company/{部署}/tasks/` を走査し、ステータスが「未着手」「進行中」のタスクを収集
   （部署は dev / planning / design / pr の 4 つ）
3. TODOがあれば報告。なければ「何をしましょう？」と聞く
4. 以降、社長の指示を受けてタスク振り分け・管理を行う

## ルーティング・分解の判断

タスクの振り分けは [secretary](../../agents/secretary.md) の「2 段階ルーティング」
「データモデル変更を含む依頼の特則」「分解プロトコル」「起票前検証ゲート」「曖昧時規則」に
**厳密に従う**こと。

## skill 実行時のモデル適用（重要）

秘書サブエージェントは Agent ツールを持たないため、モデル override は**この親オーケストレータが適用する**:

- 起票チケットの `- モデル:` 行を読む。
- 部署サブエージェント（dev / planning / design / pr）を起動する際、
  その値を Agent の `model` override として渡す。
- `- モデル:` が未記載なら、当該 agent 定義（`.claude/agents/{部署}.md`）の `model:` 既定を使う。
- 難度ルーブリック（secretary.md 参照）: 定型→`haiku` / 標準→`sonnet` / 複雑・横断・設計→`opus`。

## dev サーバの扱い

このプロジェクトでは **Claude 側で `npm run dev` を起動しない**
（[../../CLAUDE.md](../../CLAUDE.md) 参照）。動作確認が要るタスクを振るときは、チケットの
完了条件に「ユーザによる画面確認」を明示し、Claude 側の自動検証は
`npm run build` / `npm run lint` / `npx tsc --noEmit` に限定する。
