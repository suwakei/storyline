---
name: qa
description: 実地テスト (QA) モード開始 (画面の報告 → 原因特定 → 修正)
argument-hint: <初期メモ (任意)>
model: opus
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task
disable-model-invocation: true
---

実地テスト (QA) モードを開始します。

## モード概要

ユーザがローカルでアプリを操作しながら、バグや気になる箇所を報告する。
Claude は報告を受けてコードを調査し、修正する。

## 開始手順

1. **dev サーバは Claude 側で起動しない**。ユーザに
   「`npm run dev` を実行して http://localhost:3000 を開いてください」と依頼する
2. 以下を表示して QA モード開始を宣言する:

```
🔍 QA モード開始
`npm run dev` を実行してアプリを操作し、気になる箇所を報告してください。

報告フォーマット (自由形式):
  どの画面で / 何が起きているか・何が気になるか

例:
  "作品一覧 JSON を読み込んでも一覧に出てこない"
  "カンバン シーンを別の列にドロップすると末尾に飛ぶ"
  "シーン編集 サムネイルを外しても画像が残る"
  "キャラクター 削除したキャラがカードのチップに残る"

終了: "done" または "完了" と入力
```

## 報告を受けたときの処理

### 1. 画面からソースを特定

| 画面 | URL | 探索起点 |
|------|-----|----------|
| 作品一覧 | `/` | [src/app/page.tsx](../../../src/app/page.tsx) |
| 作品画面 (カンバン) | `/projects/<id>` | [src/app/projects/[projectId]/page.tsx](../../../src/app/projects/[projectId]/page.tsx) |
| カンバンの列・カード | 同上 | [src/components/board/](../../../src/components/board/) |
| シーン編集ドロワー | 同上 | [src/components/SceneEditor.tsx](../../../src/components/SceneEditor.tsx) |
| キャラクター管理 | 同上 | [src/components/CharacterPanel.tsx](../../../src/components/CharacterPanel.tsx) |
| ストーリータブ | 同上 | [src/components/StoryTabs.tsx](../../../src/components/StoryTabs.tsx) |

症状の種類から層を絞る:

| 症状 | 疑う場所 |
| --- | --- |
| データが保存されない / 再読込で消える | [src/lib/store.ts](../../../src/lib/store.ts) の `persist` / `partialize`、[storage.ts](../../../src/lib/storage.ts) |
| 読み込み直後に何も出ない | `hydrated` フラグの扱い |
| ドラッグの挙動がおかしい | [Board.tsx](../../../src/components/board/Board.tsx) の `handleDragOver` / `handleDragEnd` と `data` 契約 |
| 入力が保存されない / 重い | `InlineText` / `SceneEditor` の draft + デバウンス経路 |
| JSON 読み込みが失敗する | [src/lib/io.ts](../../../src/lib/io.ts) の `parseProjectJson` / `normalize*` |
| 画像が重い・表示されない | [src/lib/image.ts](../../../src/lib/image.ts) |

### 2. 調査

- 特定したファイルを読み、報告された症状の原因を探す
- 必要に応じて関連ファイル (store / types / io) も読む
- ブラウザの DevTools で確認できる情報 (コンソールエラー、Application → IndexedDB の中身) が
  あればユーザに聞く

### 3. 修正

- CLAUDE.md のコーディング規約・サブエージェント委譲ルールに従う
  - `src/components/` → component-builder サブエージェント
  - `src/lib/` → store-builder サブエージェント
  - `src/app/` の配線・`globals.css`・些細な修正は直接編集
- **永続化・型・エクスポート形式に触る修正は、その場で当てずに影響範囲を先に説明する**
  (ユーザの作品データは IndexedDB にしか無い)
- 修正後は `npx tsc --noEmit` と `npm run lint` を通し、「ブラウザで確認してください」と返す
  (HMR で反映される)

### 4. 記録

修正ごとに内部で以下を記録しておく (会話内で保持):
- 報告内容 (画面 + 症状)
- 原因
- 修正ファイルと内容
- ステータス (修正済 / 要確認 / 再現せず)

## 終了時

ユーザが "done" / "完了" と言ったら、セッション中の修正サマリーを表示する:

```
📋 QA セッションサマリー
━━━━━━━━━━━━━━━━━━━━━
修正: N 件 / 要確認: N 件 / 再現せず: N 件

1. [修正済] カンバン — 列を跨いだドロップが末尾に飛ぶ
   原因: handleDragOver で挿入 index を APPEND 固定にしていた
   修正: src/components/board/Board.tsx

2. [修正済] シーン編集 — サムネイルを外しても残る
   原因: patch({ thumbnail: undefined }) が Object.assign で無視されていた
   修正: src/lib/store.ts

...
```

修正が 3 件以上になった場合、または永続化に関わる修正が含まれる場合は
`.claude/.company/dev/qa/YYYY-MM-DD-qa-session.md` にサマリーを保存する。

$ARGUMENTS
