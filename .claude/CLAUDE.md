# storyline — Claude 向け作業ガイド

このリポジトリで作業する Claude への指示書。プロダクト概要は [README.md](../README.md) を参照。
組織運営・タスクルーティングのルールは [.company/CLAUDE.md](./.company/CLAUDE.md) が一次情報
(部署構成・タスクフロー・引き継ぎ手順はそちら側)。

**storyline は「シナリオの時系列とキャラクターのつながりを整理するツール」**。
フロントエンドのみで完結し、サーバもデータベースも持たない。データはブラウザの IndexedDB
だけに存在する。

---

## dev サーバは Claude 側で起動しない (最重要)

`npm run dev` をはじめ、**このプロジェクトのサーバは Claude が自分で起動しない**。
バックグラウンド / フォアグラウンドを問わず、動作確認目的でも起動しない。

- **Why:** ユーザが自分のターミナルで `npm run dev` を動かしているため、Claude が同じ
  ポート (3000) を掴むと `EADDRINUSE` でユーザ側が落ちる。2026-08-04 に本人から明示指示
  (「今回だけは起動して良いが、これ以降は起動しない」)。
- **How to apply:**
  - 動作確認が必要なときは **ユーザに「`npm run dev` を実行してください」と依頼する**。
    画面の見え方やコンソールエラーは貼ってもらう。
  - Claude 側の自動検証は `npm run build` / `npm run lint` / `npx tsc --noEmit` で行う
    (これらはサーバを立てないので実行して良い)。

---

## ユーザデータは IndexedDB にしか無い (最重要)

作品データの正本はブラウザの IndexedDB (キー `storyline-store-v1`) だけで、バックアップは
ユーザが手動で書き出した `*.storyline.json` しか存在しない。**永続化まわりの事故は
ユーザの作品そのものの消失** を意味する。

- [STORAGE_KEY](../src/lib/storage.ts) と `persist` の `version` は**理由なく変えない**。
  変える必要が出たら必ず `migrate` を書き、旧キーからの読み出し経路を用意する
  ([02-data-model-and-persistence.md](./docs/02-development-docs/02-data-model-and-persistence.md))
- `partialize` の対象を減らす変更は保存内容の欠落に直結する。触るときは書き出し JSON の
  往復 (書き出し → 読み込み) が壊れないことまで確認する
- 削除系の操作は必ずユーザ確認を挟む (現状は `window.confirm`)。取り消し機能は無い

---

## Next.js 16 は「知っている Next.js ではない」

このプロジェクトは **Next.js 16.3 / React 19.2** で、学習データの Next.js とは API も規約も
異なる。ルート定義・型・設定に関わる作業の前に、**必ず
`node_modules/next/dist/docs/` の該当ガイドを読む** ([AGENTS.md](../AGENTS.md) が同じ指示を
リポジトリ直下で出している。このブロックは `next dev` が自動生成するので消さない)。

このリポジトリで実際に効いている差分は
[03-library-docs/01-next-app-router-doc.md](./docs/03-library-docs/01-next-app-router-doc.md)
にまとめてある (`LayoutProps<"/">` / 非同期 `params` / Turbopack 既定 / `next lint` 廃止など)。

---

## 開発フロー (重要)

**新規の開発タスクは原則 [/company](./skills/company/SKILL.md) で開始する**。秘書 (secretary)
サブエージェントがタスクを解釈し、適切な部署 ([dev](./agents/dev.md) /
[planning](./agents/planning.md) / [design](./agents/design.md) / [pr](./agents/pr.md)) に
振り分けて [.company/](./.company/) 配下に起票する。これにより:

- タスクの責務が明確になる (何の部署の仕事か / 引き継ぎ先はどこか)
- 進捗が `.company/{部署}/tasks/` に残り、`/briefing` `/status` `/retro` で可視化できる
- 部署間連携 (例: 企画 → デザイン → 開発) が自然に流れる

### 例外 (直接動いて構わないケース)

- 1〜2 行の typo 修正、フォーマット直し、リンク切れ修正など、起票するほどでもない些細な変更
- [/qa](./skills/qa/SKILL.md) モード中の現地修正 (QA セッション自体が窓口になっている)
- ユーザが明示的に「秘書を介さず直接やって」と指示したとき
- どの部署のタスクか自明な場合は [/dev](./skills/dev/SKILL.md) など部署直行 skill でも可。
  ただし `.company/{部署}/tasks/` への起票は同じく必須

### 朝イチ / 進捗確認

- [/briefing](./skills/briefing/SKILL.md): 今日の TODO とブロッカーを生成
- [/status](./skills/status/SKILL.md): 全部署の進行中タスク一覧
- [/retro](./skills/retro/SKILL.md): 週次振り返り

---

## docs 参照ルール

[.claude/docs/](./docs/) にタスク種別ごとの設計ドキュメントがある。タスクに取りかかる前に
**関連するものだけ** 読む。全部読む必要は無い。

### いつどれを読むか

| 作業内容 | 読むべきドキュメント |
| --- | --- |
| **プロダクト全体の方針確認** | [01-project-overview/01-storyline-concept.md](./docs/01-project-overview/01-storyline-concept.md) |
| **コンポーネント追加 / 画面構成の変更** | [02-development-docs/01-architecture-design.md](./docs/02-development-docs/01-architecture-design.md) |
| **ストア操作の追加 / 永続化まわり** | [02-development-docs/02-data-model-and-persistence.md](./docs/02-development-docs/02-data-model-and-persistence.md) |
| **JSON 書き出し / 読み込み / 画像取り込み** | [02-development-docs/03-import-export.md](./docs/02-development-docs/03-import-export.md) |
| **エラー処理 / 破壊的操作の確認 UI** | [02-development-docs/04-error-handling.md](./docs/02-development-docs/04-error-handling.md) |
| **型定義の追加・変更** | [02-development-docs/05-type-definition.md](./docs/02-development-docs/05-type-definition.md) |
| **見た目・スタイル・a11y** | [02-development-docs/06-ui-design.md](./docs/02-development-docs/06-ui-design.md) |
| **カンバンのドラッグ & ドロップ** | [02-development-docs/07-drag-and-drop.md](./docs/02-development-docs/07-drag-and-drop.md) |
| **入力の重さ / 再描画 / 画像肥大** | [02-development-docs/08-performance-optimization.md](./docs/02-development-docs/08-performance-optimization.md) |
| **テストを書く / テスト基盤を入れる** | [02-development-docs/09-test-strategy.md](./docs/02-development-docs/09-test-strategy.md) |
| **metadata / SEO / favicon** | [02-development-docs/10-seo-and-metadata.md](./docs/02-development-docs/10-seo-and-metadata.md) |
| **デプロイ / ビルド設定** | [02-development-docs/11-deployment.md](./docs/02-development-docs/11-deployment.md) |
| **Next.js App Router の書き方** | [03-library-docs/01-next-app-router-doc.md](./docs/03-library-docs/01-next-app-router-doc.md) |
| **zustand / immer の書き方** | [03-library-docs/02-zustand-immer-doc.md](./docs/03-library-docs/02-zustand-immer-doc.md) |
| **dnd-kit の書き方** | [03-library-docs/03-dnd-kit-doc.md](./docs/03-library-docs/03-dnd-kit-doc.md) |
| **Tailwind v4 / トークン定義** | [03-library-docs/04-tailwind-v4-doc.md](./docs/03-library-docs/04-tailwind-v4-doc.md) |

### 読む順の原則

1. **まず overview** ([01-storyline-concept.md](./docs/01-project-overview/01-storyline-concept.md)) で全体像を掴む
2. **次に該当する development-docs** で方針を確認
3. **最後に library-docs** で具体的なコードパターンを確認
4. 該当する項目が無ければ **読まずに実装して構わない**

コード変更に伴い docs が古くなったら **コード変更と同じコミットで修正する**。

---

## 使用言語

- **ユーザとのやり取りは日本語**
- **コミットメッセージは英語** (Conventional Commits 風)
- **コード内コメントは日本語 OK**。ただし WHY のみ書く (WHAT は書かない)
- **UI 文言は日本語**。作家向けツールなので用語は「作品 / ストーリー / シークエンス / シーン /
  キャラクター」で統一する (英語の Project/Story/Sequence/Scene はコード内の識別子のみ)
- **ドキュメント (`.claude/docs/`) は日本語**

---

## コーディング規約

### 全体

- `any` 禁止 (`unknown` + 型ガード)。外部由来の値の扱いは [src/lib/io.ts](../src/lib/io.ts)
  の `isRecord` / `str` / `arr` パターンに合わせる
- 未使用変数・import・後方互換のためのデッドコードは残さない
- 型は [src/lib/types.ts](../src/lib/types.ts) に集約。コンポーネント固有の props 型だけ
  各ファイルにインラインで書く

### レイヤ分け (この 2 層以外を作らない)

| ディレクトリ | 役割 |
| --- | --- |
| [src/lib/](../src/lib/) | データモデル・ストア・永続化・入出力・純粋関数。React に依存しない (`store.ts` を除く) |
| [src/components/](../src/components/) | 表示と入力。状態は `useStore` のセレクタで引き、ローカル state は入力中の draft のみ |

- ストアは [src/lib/store.ts](../src/lib/store.ts) の単一 zustand ストア。**別のストアを増やさない**
- `useStore` はセレクタ単位で購読する (`useStore((s) => s.projects)`)。
  ストア全体を取ると全画面が再描画される
- 永続化キー・エクスポート形式の文字列は `storyline-*` / `storyline.project` を使う
- 副作用のあるブラウザ API (`document` / `window` / `createImageBitmap`) は `src/lib/` の
  関数に閉じ込め、コンポーネントから直接叩かない

### スタイル

- Tailwind v4 のユーティリティ + [src/app/globals.css](../src/app/globals.css) の
  セマンティックトークン (`bg` / `surface` / `surface2` / `line` / `fg` / `muted` / `accent` /
  `accentfg` / `danger`)。**生の色ユーティリティ (`text-gray-500` 等) は使わない**
- 例外は「データとしての色」だけ: キャラクター識別色 (`CHARACTER_COLORS`) とシーンステータス
  バッジ (`SCENE_STATUSES[].className`)。これらは `style` 属性 / 固定クラスで持つ
- 汎用 UI プリミティブは [src/components/ui.tsx](../src/components/ui.tsx) に集約
  (`Button` / `IconButton` / `Field` / `TextInput` / `TextArea` / `InlineText` / `Modal` /
  `Drawer` / `EmptyState`)。似たものを各画面で作り直さない

### Next.js

- `"use client"` は必要な最小単位に付ける。ただし本アプリはストアが IndexedDB 依存のため、
  ストアを読む画面は実質すべてクライアントコンポーネントになる
- ルート定義・`params` の扱い・型ヘルパは
  [01-next-app-router-doc.md](./docs/03-library-docs/01-next-app-router-doc.md) に従う
  (推測で書かず、必要なら `node_modules/next/dist/docs/` を読む)

### サブエージェント委譲

| 対象 | 委譲先 |
| --- | --- |
| [src/components/](../src/components/) 配下の `.tsx` | [component-builder](./agents/component-builder.md) |
| [src/lib/](../src/lib/) 配下の `.ts` | [store-builder](./agents/store-builder.md) |
| `src/app/` の配線・`globals.css`・設定ファイル・些細な修正 | 親が直接編集 |

2 層にまたがる作業は **store-builder → component-builder の順**で回す (先に公開 API を
確定させないとコンポーネント側が書けない)。並列で走らせる場合は親が「この形で実装される」と
両者に契約を明示する。

---

## ブランチ運用

- 現状 **`main` の単一ブランチ**運用 (リモートは未設定)。
- 複数コミットにまたがる作業や実験は `feat/<slug>` を切ってから行い、完了後に `main` へ
  マージする。`main` への直接コミットは小さな変更に限る
- push・PR 作成・ブランチ削除は **ユーザの明示指示があるときだけ** 行う

## その他

- **破壊的操作 (force push / `reset --hard` / IndexedDB の削除 / `.next` 以外の生成物削除 /
  ユーザデータに触る操作) はユーザ確認必須**。ローカルで可逆な操作は確認不要
- **`.claude/` 自体の保守**: `node .claude/scripts/lint-claude.mjs` で壊れリンク・旧名参照を
  検出する。一過性の監査ドキュメントは [.claude/audits/](./audits/) に
  `YYYY-MM-DD-<scope>.md` で置き、消化後は削除する
- 外部サービス・API キー・課金要素はこのプロジェクトに存在しない。追加を提案する前に
  「サーバを持たない」という前提を崩して良いかユーザに確認する
