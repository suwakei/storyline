---
name: handoff
description: 部署間の引き継ぎ (引き継ぎメモ + 次部署へのタスク起票)
argument-hint: <from部署> <to部署> <タスク内容>
model: sonnet
allowed-tools: Read, Write, Edit, Glob, Grep
disable-model-invocation: true
---

部署間の引き継ぎを実行します。

引数: $ARGUMENTS（"from部署 to部署 タスク内容" の形式）

以下を実行:
1. 引き継ぎ元の部署のタスクファイルに `## 引き継ぎ` セクションを追加
   - **双方向ポインタ必須**: 末尾に `→ 引き継ぎ先: {引き継ぎ先ファイルパス}` を記載
2. 引き継ぎ先の部署に新しいタスクファイルを作成
   - **双方向ポインタ必須**: ヘッダに `← 引き継ぎ元: {引き継ぎ元ファイルパス}` を記載
   - `- モデル:` 行を難度ルーブリック（[secretary](../../agents/secretary.md) 参照）で付与
3. `## 引き継ぎ` は [secretary](../../agents/secretary.md) の「引き継ぎ品質バー」を満たすこと:
   ① 背景 ② 成果物パス ③ 次部署の具体アクション ④ 決定待ち（あれば decisions リンク）
   ⑤ 次フェーズへの開放質問
4. 秘書のTODOを更新（依存テーブルに引き継ぎ関係を反映）
