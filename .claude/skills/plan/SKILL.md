---
name: plan
description: 企画部 (planning) に直接タスクを指示する。機能企画・仕様策定・スコープ判断 (MVP/v2/将来)・優先度の見直し・「やらないこと」の宣言が対象。UI 設計は design / コード実装は dev に委譲。
argument-hint: <タスク内容>
model: sonnet
allowed-tools: Read, Write, Glob, Grep, Task
---

企画部にタスクを直接指示します。

planningサブエージェントを起動し、以下の指示を実行させてください:
$ARGUMENTS

## 起動条件

- 「何を作るか」の判断が必要 (「どう見せるか」は design)
- 機能要件・スコープ・優先度の判断
- 既存機能の要否・棚卸し

## 典型的な依頼パターン

| 種類 | 例 |
| --- | --- |
| 新機能仕様 | 「シーンに伏線タグを付ける機能の仕様」 |
| スコープ見直し | 「キャラクター相関図は MVP に入れるか判断して」 |
| 課題の言語化 | 「シーンが 100 件を超えたときに何が破綻するか整理して」 |
| やらないことの宣言 | 「共同編集を当面やらない理由を明文化して」 |
| 実現可能性の確認 | dev に確認チケットを起票する (実装には踏み込まない) |

## 前提として崩してはいけない制約

- **サーバを持たない** — 同期・共同編集・クラウド保存・アカウントを含む案は前提の変更。
  提案自体は可だが「前提を崩す判断が要る」と明記し、社長確認に回す
- **データはブラウザ内のみ** — データモデルを増やす案は移行コストと消失リスクを併記する
- **AI 機能は無い** — 入れるならサーバ / API キーの前提が新たに必要
- 想定利用者はまず作者自身

## 着手前に読む docs

- プロダクト全体方針 → [01-storyline-concept](../../docs/01-project-overview/01-storyline-concept.md)
- データモデルの制約 → [02-data-model-and-persistence](../../docs/02-development-docs/02-data-model-and-persistence.md)

## 仕様書の必須項目 (agent 定義より)

機能企画は次の 4 点を必ず明記:

1. **誰の・何の課題を・どう解決するか** (1 行で言える形に)
2. **優先度とスコープ** (MVP / v2 / 将来 の 3 段)
3. **やらないこと** (今回スコープ外と、その理由)
4. **データモデルへの影響** (型が増える / 変わるなら移行方針の要否)

## 出力先

| 種類 | 保存先 |
| --- | --- |
| 機能仕様書 (詳細) | `.claude/.company/planning/specs/` |
| 企画書 (上流) | `.claude/.company/planning/features/` |
| 利用状況・使い勝手の調査 | `.claude/.company/planning/ux-research/` |
| 他部署からの相談メモ | `.claude/.company/planning/inbox/` |
| 通常タスク | `.claude/.company/planning/tasks/` |

## モデル選定

引数または対応チケットに明示モデル指定 (haiku/sonnet/opus) があれば Agent の `model` override として渡す。
無ければ [planning](../../agents/planning.md) 既定 (`opus`)。難度ルーブリックは [secretary](../../agents/secretary.md) 参照。

## 下流引き継ぎ

- UI 仕様策定が必要 → [design](../design/SKILL.md)
- 技術的実現可能性・移行方針の確認 → [dev](../dev/SKILL.md)
- ユーザ向けの説明が必要 → [pr](../pr/SKILL.md)

引き継ぎは [/handoff](../handoff/SKILL.md) で双方向ポインタを張り、引き継ぎ品質バー (背景・成果物パス・次部署アクション・決定待ち・開放質問) を満たす。
