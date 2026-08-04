---
name: design
description: デザイン部 (design) に直接タスクを指示する。UI 仕様策定・画面の情報設計・デザイントークン・既存 UI のデザインレビューが対象。コード実装は dev skill、機能の要否判断は plan skill 側。
argument-hint: <タスク内容>
model: sonnet
allowed-tools: Read, Write, Glob, Grep, Task
---

デザイン部にタスクを直接指示します。

designサブエージェントを起動し、以下の指示を実行させてください:
$ARGUMENTS

## 起動条件

- UI/UX の判断が必要 (新規 or 既存改修)
- 情報密度・レイアウト・可読性の判断
- 「使いにくい」という曖昧な報告の原因を UI 側から診断する

## 管轄範囲

1. **カンバン画面**: シークエンス列・シーンカード・ストーリータブ
2. **編集パネル**: シーン編集ドロワー・キャラクター管理ドロワー・モーダル
3. **作品一覧**: カード・統計表示・空状態
4. **デザイントークン**: [globals.css](../../../src/app/globals.css) のセマンティックカラーと
   [ui.tsx](../../../src/components/ui.tsx) プリミティブの見た目

## 典型的な依頼パターン

| 種類 | 例 |
| --- | --- |
| 新規 UI 仕様 | 「キャラクター相関図パネルの詳細スペック (配置・色・操作)」 |
| 既存 UI レビュー | 「実装されたシーン編集ドロワーのデザインレビュー」 |
| 情報設計 | 「シーンカードに出す項目の優先順位を決め直す」 |
| トークン拡張 | 「警告色 (warning) をセマンティックトークンに追加すべきか判断」 |
| 使いにくさの診断 | 「シークエンスが 10 列を超えると迷子になる。UI 側の対策案」 |

## 着手前に読む docs

- UI 方針・トークン一覧 → [06-ui-design](../../docs/02-development-docs/06-ui-design.md)
- 画面遷移・ドロワー/モーダルの使い分け → [01-architecture-design](../../docs/02-development-docs/01-architecture-design.md)
- Tailwind v4 のトークン定義方法 → [04-tailwind-v4-doc](../../docs/03-library-docs/04-tailwind-v4-doc.md)

## 設計原則 (agent 定義より)

- 一望性が最優先。カードの情報を増やすより、並べて全体が読めることを優先
- 編集は流れを止めない (保存ボタンを押させない / モーダルよりドロワー)
- 色はセマンティックトークン経由。例外はキャラ識別色とステータスバッジのみ
- ライト / ダーク両対応必須
- 情報を足す提案は「何を削るか」とセットで出す

## 出力先

| 種類 | 保存先 |
| --- | --- |
| UI 仕様書 | `.claude/.company/design/ui-specs/` |
| ワイヤーフレーム | `.claude/.company/design/wireframes/` |
| デザイントークン | `.claude/.company/design/style-guide/` |
| 通常タスク | `.claude/.company/design/tasks/` |

## モデル選定

引数または対応チケットに明示モデル指定 (haiku/sonnet/opus) があれば Agent の `model` override として渡す。
無ければ [design](../../agents/design.md) 既定 (`sonnet`)。難度ルーブリックは [secretary](../../agents/secretary.md) 参照。

## 下流引き継ぎ

- UI 仕様確定 → [dev](../dev/SKILL.md) に実装依頼 (ui-specs/ のファイルパスを引き継ぎ先に明示)
- 情報を増やす仕様 → [dev](../dev/SKILL.md) にデータモデルへの影響を確認
- 機能の要否そのものに疑問 → [plan](../plan/SKILL.md) に差し戻し
- 引き継ぎは [/handoff](../handoff/SKILL.md) で双方向ポインタを張る
