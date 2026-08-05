# 相関図のデータモデル追加と移行方針を確定する

- ステータス: **完了**（2026-08-04 開発部）
- ⚠ **コードは 1 行も変更していない**（方針のみ）。実装は
  [dev/tasks/2026-08-04-character-relationship-graph-impl.md](./2026-08-04-character-relationship-graph-impl.md)。
- ⚠ **`persist` の `version` は上げない**という結論になった。理由は
  [決定 2](#決定-2-永続化storage_key--version--migrate--partialize)。
  **上げると旧ビルド（`local-final`）を開いた瞬間に IndexedDB が空で上書きされる**（[C-5](#0-1-確認済みの事実この環境で実際に確かめたもの)）。
- 優先度: **高**
- モデル: opus
- 起票日: 2026-08-04
- 更新日: 2026-08-04（開発部が決定 1〜7 ＋ 付録 A〜E を確定）
  - **追記 2026-08-04**: design の UI 仕様確定を受けて **R14 / R15 / R16 を追加判定**（[5-5](#5-5-design-ui-仕様確定後の再判定2026-08-04u-1-を解消)）。
    **React Flow 推奨は維持**。既定配置を design の**4 列固定**へ差し替え（[4-3](#4-3-描画の導出新規-srclibgraphts)）。
    作業ツリーの変化に伴う前提の再確認は [C-21 / C-22](#0-1-確認済みの事実この環境で実際に確かめたもの) と [7-1](#7-1-作業ツリーの変化による影響2026-08-04-2045-時点)。
  - **追記 2026-08-04（社長判断）**: **E-1 承認 —— `@xyflow/react` の依存追加が認められ、実装方式は React Flow で確定**。
    ただし**`npm install` は本実装の着手時にまとめて行う**（並行セッションが `package-lock.json` を
    触っているため）。**本実装の着手は `accounts-and-server` が一段落してから**。
  - **追記 2026-08-04（実ファイル適用）**: **[決定 6](#決定-6-prisma-スキーマの受け皿干渉点-i-1) のスキーマ差分を
    [prisma/schema.prisma](../../../../prisma/schema.prisma) 本体に適用済み**。
    もはや机上の設計ではない。`npx prisma validate`（7.9.1）で valid を確認（[C-24](#0-1-確認済みの事実この環境で実際に確かめたもの)）。
- 成果物: **本チケットの [決定](#決定2026-08-04-開発部)節**（決定 1〜7 / 付録 A〜E）
- 依頼元: 社長（秘書経由・**データモデル変更の特則により本実装より先に起票**）
- 前提: [planning/tasks/2026-08-04-character-relationship-graph-spec.md](../../planning/tasks/2026-08-04-character-relationship-graph-spec.md) — **2026-08-04 完了。ゲートは開いている**
- 決裁記録: [secretary/decisions/2026-08-04-character-relationship-graph-decisions.md](../../secretary/decisions/2026-08-04-character-relationship-graph-decisions.md)
- 引き継ぎ先: [dev/tasks/2026-08-04-character-relationship-graph-impl.md](./2026-08-04-character-relationship-graph-impl.md)

## 概要

相関図は **[src/lib/types.ts](../../../../src/lib/types.ts) の型追加を必ず伴う**
（`Character` への座標追加、あるいは新規 `Relationship` / `Group` / Layout 型）。
ユーザの作品データはブラウザの IndexedDB にしか無く、バックアップはユーザが手で書き出した
`*.storyline.json` だけ。`STORAGE_KEY` / `persist` の `version` / `partialize` /
エクスポート形式を壊すと**作品そのものが復旧不能**になる。

**実装を書く前に、既存作品を壊さずに新しいデータを載せる手順を確定させる**のがこのチケット。
[.claude/CLAUDE.md](../../../CLAUDE.md) の「ユーザデータは IndexedDB にしか無い」節が
そのまま該当する。

社長が **実装方式の選定を dev / design に委任**しているため、その比較・提案も本チケットで行う
（秘書決裁 D-6。design は方式を決め打ちせず UI 要件だけを出す）。

## 着手前に必ず読むもの

1. 確定した spec 本稿（[planning/specs/2026-08-04-character-relationship-graph-spec.md](../../planning/specs/2026-08-04-character-relationship-graph-spec.md)）の
   **10 章「データモデルに要求する追加項目」**・**6 章「書き出し JSON と旧 JSON 互換」**・
   **11 章「参照整合性」**・**12 章「移行コストとデータ消失リスク」**
2. [dev/tasks/2026-08-04-accounts-and-server-data-migration.md](./2026-08-04-accounts-and-server-data-migration.md)
   の**決定 1〜7 と付録 A / B**（**完了済み**）。相関図はここで確定した Prisma スキーマ草案
   ([prisma/schema.prisma](../../../../prisma/schema.prisma)) と書き出し形式の決定に**直接干渉する**
3. [02-development-docs/02-data-model-and-persistence.md](../../../docs/02-development-docs/02-data-model-and-persistence.md)
   と [02-development-docs/03-import-export.md](../../../docs/02-development-docs/03-import-export.md)
4. [決裁記録](../../secretary/decisions/2026-08-04-character-relationship-graph-decisions.md) の
   「参照ビジュアル」節（社長提示画像の唯一の記録）と「既存フィーチャとの干渉」（I-1〜I-3）

## 決めること

1. **型の置き場所と形** — `Character` に座標を持たせるのか、`Project` 直下に
   `relationships` / `groups` / レイアウト情報を別に持つのか。
   spec が要求した項目を [src/lib/types.ts](../../../../src/lib/types.ts) のどこに置くか
2. **`persist` の `version` を上げる必要があるか**。上げるなら `migrate` をどう書くか。
   **`STORAGE_KEY` は変えない**（変える理由が出た場合は旧キーからの読み出し経路を必ず用意する）
3. **`partialize` への影響**。保存対象を**減らさない**こと。新しいフィールドが保存対象に
   入っているかを明示する
4. **書き出し JSON への含め方と互換** — `EXPORT_FORMAT = "storyline.project"` /
   `EXPORT_VERSION = 1` は `accounts-and-server` の決定で**据え置き**とされている
   （ローカル版の JSON をサーバ版が読めることが移行の生命線）。
   この制約下で相関データを足せるか、上げる必要があるかを判断する
   - **旧 JSON（相関データ無し）の読み込み**で既存作品が壊れないこと
   - **新 JSON を旧ローカル版（`local-final`）が読んだとき**に落ちないか（前方互換の判定）
   - [src/lib/io.ts](../../../../src/lib/io.ts) の `parseProjectJson` / `normalizeProject` /
     `withFreshIds` に何を足すか（`withFreshIds` は id 張り替えを行うため、
     **エッジが参照する `Character.id` の張り替え漏れは相関の破壊に直結する**）
5. **`accounts-and-server` の Prisma スキーマ草案との整合**（干渉点 I-1）。
   相関データを DB でどう持つか（テーブル構成・`order` の要否・`onDelete: Cascade` の範囲）。
   既存草案の決定（id はアプリ採番 / 上限はバリデーション層 / カスケードの向き）と矛盾させない
6. **実装方式の比較と推奨**（社長委任事項） — React Flow（`@xyflow/react`）導入 vs
   既存 dnd-kit + 自前 SVG。design が出した **UI 要件リスト**を満たせるかで判定する。
   依存追加のコスト（バンドルサイズ・ライセンス・Next.js 16 / React 19.2 との相性・
   タッチ操作の挙動）を根拠として示す
7. **進行順の確認**（秘書決裁 R-1） — 秘書の既定は「(a) 現行のローカル版に先に載せる」。
   **企画部が spec で追認済み**。その前提で設計しつつ、5 で DB 側の受け皿も同時に設計して
   二重工事を避ける

## 完了条件

- [x] 上記 **7 点**の決定と理由が本チケット内に記載されている（`dev/tech-debt/` に流さない）
      → [決定 1〜7](#決定2026-08-04-開発部)
- [x] `STORAGE_KEY` を変更していない。`persist` の `version` を上げる場合は
      **`migrate` の擬似コードと、旧バージョンのデータが失われないことの説明**がある
      → [決定 2](#決定-2-永続化storage_key--version--migrate--partialize)。
      **`STORAGE_KEY` も `version` も変えない**という結論。`version` を上げた場合に何が起きるかを
      zustand の実装を読んで確認した上で、上げない理由を書いた（[C-5](#0-1-確認済みの事実この環境で実際に確かめたもの)）
- [x] **`partialize` の対象を減らしていない**ことを明示的に確認した記述がある
      → [決定 2 の「`partialize`」](#2-3-partialize-は-1-文字も変えない)。**現行のまま 1 文字も変えない**
- [x] **旧 JSON（相関データ無しの既存ファイル）を読み込んでも既存作品が壊れない**ことを
      机上で確認し、往復（書き出し → 読み込み）で落ちるものがあれば**隠さず列挙**している
      → [付録 A](#付録-a-spec-6-章旧-json-の読み込み9-行の実装対応表) / [付録 B](#付録-b-往復書き出し--読み込みの机上確認)。
      **往復で落ちるものが 1 件ある**（旧版経由の往復）
- [x] **spec 6 章の「旧 JSON の読み込み」表 9 行すべて**に対して、実装上どう満たすかが書かれている
      → [付録 A](#付録-a-spec-6-章旧-json-の読み込み9-行の実装対応表)。9 行 ＋ spec に無い 3 行を追加
- [x] エッジ / グループが参照する `Character.id` が `withFreshIds` の張り替え後も
      **同じ人物を指す**ことが説明されている
      → [決定 4-2](#4-2-withfreshids-の張り替えここを落とすと静かに壊れる)。
      **`{ ...project }` のスプレッドで旧 id が素通しになる**罠を明記
- [x] キャラクター削除時に、そのキャラを指すエッジ・グループ所属が**幽霊参照として残らない**
      方針が書かれている（現行 `deleteCharacter` の扱いに合わせる）
      → [決定 4-1](#4-1-削除時の掃除ストア)
- [x] [prisma/schema.prisma](../../../../prisma/schema.prisma) 草案および
      `accounts-and-server-data-migration` の決定 1〜7 と**矛盾する箇所がゼロ**、
      または矛盾点が列挙されて企画 / 秘書へ差し戻されている
      → [決定 6](#決定-6-prisma-スキーマの受け皿干渉点-i-1)。**矛盾ゼロ**。整合表を全 7 決定について作成し、
      追加スキーマは `npx prisma validate`（7.9.1）で valid を確認（[C-9](#0-1-確認済みの事実この環境で実際に確かめたもの)）
- [x] 実装方式の**比較表**（React Flow / 自前 SVG）があり、推奨と理由・依存追加のコストが
      書かれている。design の UI 要件リストの各項目に対して満たす / 満たさないが判定されている
      → [決定 5](#決定-5-実装方式react-flow-か自前-svg-か)。
      ⚠ **design の UI 要件リストはまだ存在しない**（design チケットは未着手）。
      spec 8 / 14 章と design チケットの完了条件から **dev が要件 R1〜R13 を起こして判定**した。
      **design の仕様が出た時点で再判定が要る**（[U-1](#0-2-未確認のまま残したこと推測を確定として書かない)）
- [x] **確認できたこと / 未確認のまま残したことが節として分かれている**
      → [0-1](#0-1-確認済みの事実この環境で実際に確かめたもの) / [0-2](#0-2-未確認のまま残したこと推測を確定として書かない)
- [x] 本チケットで実ファイルに触れた場合、`npm run build` / `npm run lint` /
      `npx tsc --noEmit` がすべて通ることを確認済み（**dev サーバは起動しない**）
      → **`src/` と `prisma/` のファイルは 1 つも変更していない**。`npm run build` は
      バンドルサイズの実測基準を取るためだけに実行し、成功を確認（[C-8](#0-1-確認済みの事実この環境で実際に確かめたもの)）
- [x] 本実装チケットへ `## 引き継ぎ` を記載
      → [dev/tasks/2026-08-04-character-relationship-graph-impl.md](./2026-08-04-character-relationship-graph-impl.md)

---

## 決定（2026-08-04 開発部）

### 0-1. 確認済みの事実（この環境で実際に確かめたもの）

| # | 事実 | 確かめ方 |
| --- | --- | --- |
| C-1 | **`toExportJson` は `project` をそのまま包むだけ**。相関データを `Project` 配下に置く限り**書き出し側の変更は不要**（企画部の見立ては正しい） | [src/lib/io.ts](../../../../src/lib/io.ts) の現物コード（28〜36 行） |
| C-2 | **`parseProjectJson` はエンベロープの `version` を一切読んでいない**。見ているのは「`isRecord`」「`project` キーの有無」「`stories` キーの有無」の 3 つだけ | 同上（155〜169 行）。→ **`EXPORT_VERSION` を上げても既存のどのビルドも検知できない**（[決定 3](#決定-3-書き出し-json-と読み込みの互換干渉点-i-2)の決め手） |
| C-3 | **`io.ts` に数値を安全に読むヘルパが無い**。あるのは `str` / `isRecord` / `arr` の 3 つだけ（企画部の申し送りどおり） | 同上（62〜68 行） |
| C-4 | **zustand の `persist` は「すべての state 更新」で `partialize` → JSON 化 → `storage.setItem` を実行する**。デバウンスも差分書き込みも無い | `node_modules/zustand/esm/middleware.mjs` 358〜369 行（`api.setState` と `config` に渡す `set` の**両方**が `setItem()` を呼ぶ）。zustand は **5.0.14** |
| C-5 | **`persist` の `version` を上げると、旧ビルドを開いた瞬間に IndexedDB が空で上書きされる**。順序は ①保存 version ≠ 現 version かつ旧ビルドに `migrate` が無い → `console.error` して `persistedState = undefined` ②既定 `merge` が初期状態（`projects: []`）を返す ③`set(state, true)` 自体は書き戻さない ④**しかし直後の `onRehydrateStorage` → `setHydrated()` がラップされた `set` を通るので `setItem()` が走り、`{ projects: [] }` で上書きされる** | 同 `middleware.mjs` 396〜431 行 ＋ [src/lib/store.ts](../../../../src/lib/store.ts) の `onRehydrateStorage: () => (state) => state?.setHydrated()`。**コードを読んで確認（実行はしていない → [U-2](#0-2-未確認のまま残したこと推測を確定として書かない)）** |
| C-6 | `persist` の `merge` の型は **`(persistedState: unknown, currentState: S) => S`**。既定は浅いマージ `{ ...currentState, ...persistedState }`。**version に関係なく毎回呼ばれる** | `node_modules/zustand/middleware/persist.d.ts` 59 行 ＋ `middleware.mjs` 335〜338 行 |
| C-7 | `merge` の戻り値は **`set(stateFromStorage, true)`（replace = true）** で適用される。→ **独自 `merge` が `...current` を落とすとストアのアクション関数ごと消える** | `middleware.mjs` 421 行 |
| C-8 | 現行アプリのクライアント JS は **660 KB raw / 205 KB gzip**（`.next/static/**/*.js` 13 ファイルの合計） | `npm run build`（成功）後に実測。バンドル比較の基準値。**2026-08-04 20:15 時点の作業ツリー**（`accounts-and-server` / モバイル縦リストの作業中の変更を含む）で測った値なので、比較するときは**同じ手順で測り直して差分を見る**こと |
| C-9 | 相関データを足した Prisma スキーマは **valid**（Prisma CLI **7.9.1**） | [決定 6](#決定-6-prisma-スキーマの受け皿干渉点-i-1) のスキーマを**スクラッチパッド上のコピー**に適用して `npx --yes prisma@latest validate`。**`prisma/schema.prisma` 本体は変更していない** |
| C-10 | `@xyflow/react` の最新は **12.11.2 / MIT**。実行時依存は `classcat ^5.0.3` / **`zustand ^4.4.0`** / `@xyflow/system 0.0.79`。peer は `react >= 17` | `npm view @xyflow/react`（レジストリ照会） |
| C-11 | `@xyflow/system 0.0.79` の実行時依存は **`d3-drag` / `d3-selection` / `d3-zoom` / `d3-interpolate`**（＝パン・ズーム・ドラッグは d3 実装）。`@types/d3-*` が **`dependencies` 側**に入っている | 配布 tarball の `package.json` と `dist/esm/index.js` の import |
| C-12 | 実測サイズ: `@xyflow/react` の ESM エントリ **231,171 B raw / 51,910 B gzip**、`@xyflow/system` **151,889 B raw / 34,994 B gzip**（いずれも d3・classcat・zustand を**含まない**）。CSS は `base.css` 13,585 B / `style.css` 18,596 B | `npm pack` でスクラッチパッドに取得して計測（**`npm install` はしていない**。`package.json` / `node_modules` は無変更） |
| C-13 | `@xyflow/react` の配布 ESM は **1 行目が `"use client"`**。`colorMode` prop（`ColorMode`）が存在する。`onNodeDragStop` / `onConnect` / `onNodesChange` / `fitView` / `panOnDrag` / `nodesDraggable` / `connectionMode` の各 prop、`ReactFlowProvider` / `Handle` / `Panel` / `ViewportPortal` / `EdgeLabelRenderer` / `MarkerType` / `applyNodeChanges` / `getNodesBounds` / `useReactFlow` / `Background` / `Controls` / `MiniMap` / `NodeToolbar` の各 export が存在する | 配布物の `dist/esm/index.d.ts` / `types/component-props.d.ts` を実際に読んだ |
| C-14 | **`@xyflow/react` も `useStore` という名前を export している**（プロジェクトの `useStore` と衝突しうる） | 同上 |
| C-15 | `tsconfig.json` に `exactOptionalPropertyTypes` は無い（`strict` のみ）。→ `x?: number` に `undefined` を代入しても型エラーにならない | [tsconfig.json](../../../../tsconfig.json) |
| C-16 | **`useViewport(): Viewport`** が存在し、`Viewport = { x: number; y: number; zoom: number }`。型定義のコメントに「このフックを使うコンポーネントは **viewport が変わるたびに再描画される**」「**`ReactFlowProvider` か `ReactFlow` の子でしか使えない**」と明記されている | 配布 tarball の `dist/esm/hooks/useViewport.d.ts` / `@xyflow/system` の `types/general.d.ts` |
| C-17 | **`useStore<StateSlice>(selector, equalityFn?)`** が存在し、`ReactFlowState` に **`transform: Transform`**（`[x, y, zoom]`）がある。→ **`(s) => s.transform[2] < 0.6` のような真偽値セレクタで購読できる** | `dist/esm/hooks/useStore.d.ts` / `dist/esm/types/store.d.ts` |
| C-18 | **`NodeProps` に zoom は含まれない。** 実体は `@xyflow/system` の `NodeProps` で、`id` / `data` / `width` / `height` / `type` / `dragging` / `selected` / `draggable` / `selectable` / `deletable` / `zIndex` / `isConnectable` / `positionAbsoluteX` / `positionAbsoluteY` など。**倍率はフックで読むしかない** | `dist/esm/types/nodes.d.ts` → `@xyflow/system` の `types/nodes.d.ts` |
| C-19 | ビューポート操作の関数一式が存在する: `getZoom` / `getViewport` / `zoomTo` / `setCenter` / `fitBounds` / **`screenToFlowPosition`** / **`flowToScreenPosition`**（`useReactFlow()` 経由） | `dist/esm/types/general.d.ts`（`ViewportHelperFunctions`） |
| C-20 | **`ViewportPortal`** は「ノード / エッジと同じ座標系に自前の要素を描く（＝ズームとパンの影響を受ける）」ためのもの。**`Panel`** は「viewport の上に重ねる」もので、位置指定は `PanelPosition`（四隅など）**のみ**。任意座標には使えない | `dist/esm/components/ViewportPortal/index.d.ts` / `Panel/index.d.ts` |
| C-21 | **作業ツリーの前提確認（2026-08-04 20:45）**: `prisma/migrations/` は**まだ存在しない**。`src/lib/` の 5 ファイル（`types` / `factory` / `io` / `store` / `storage`）は**いずれも未変更**（`git diff` が空）。→ **本チケットの決定 1〜4 はそのまま適用できる** | `ls prisma/` / `git diff --stat src/lib/*.ts` |
| C-22 | **作品画面の実装位置が変わった。** `src/app/projects/[projectId]/page.tsx` は 11 行のサーバコンポーネント（`requireSession` を呼んで `<ProjectWorkspace projectId />` を返すだけ）になり、**ヘッダ / `StoryTabs` / `Board` / `MobileSequenceList` / `SceneEditor` / `CharacterPanel` は新規の [`src/components/ProjectWorkspace.tsx`](../../../../src/components/ProjectWorkspace.tsx)（`"use client"`）へ移った** | 現物コードを読んだ（`accounts-and-server` の本実装が並行して入れたもの） |
| C-23 | ダークモードは **`@media (prefers-color-scheme: dark)`** で実装されている（`.dark` クラス方式ではない） | [globals.css](../../../../src/app/globals.css) 15 行 |
| C-24 | **決定 6 の差分を [prisma/schema.prisma](../../../../prisma/schema.prisma) 本体に適用し、valid を確認した**（2026-08-04 20:55）。出力: `Loaded Prisma config from prisma.config.ts.` / `Prisma schema loaded from prisma/schema.prisma.` / `The schema at prisma/schema.prisma is valid 🚀` | `npx --yes prisma@7.9.1 validate --schema prisma/schema.prisma`。**`npm install` は打っていない**（`npx` の一時取得のみ。`package.json` / `package-lock.json` は無変更） |
| C-25 | 適用後のスキーマは **`prisma format` 済みの状態と一致する**（追加した `Character` / `Relationship` / `CharacterGroup` / `enum` の各ブロックについて）。**ただし `Project` と `Scene` の既存ブロックは元から整形されておらず**、将来 `prisma format` を実行すると**その 2 つだけ再整列される** | スクラッチパッドへコピーして `prisma format` を掛け、本体と diff した（本体は書き換えていない） |

### 0-2. 未確認のまま残したこと（推測を確定として書かない）

| # | 未確認事項 | 何が変わりうるか | どう確かめるか |
| --- | --- | --- | --- |
| ~~**U-1**~~ | ~~design の UI 仕様がまだ存在しない~~ → **2026-08-04 に解消。** design の UI 仕様が確定し、要件 22 項目のうち R1〜R13 に無かった 3 件を **R14 / R15 / R16 として判定した**（[5-5](#5-5-design-ui-仕様確定後の再判定2026-08-04u-1-を解消)） | **結論は変わらず React Flow 推奨**。design へ 1 件だけ差し戻した（[付録 D-6](#付録-d-企画部--秘書への差し戻し)） | 完了 |
| **U-2** | C-5（version を上げると旧ビルドが空で上書きする）を**実際に再現していない**。zustand のソースを読んだ結論 | 「上げない」判断の根拠の強さ。**ただし上げない判断自体は、上げる実益がゼロ（[決定 2](#決定-2-永続化storage_key--version--migrate--partialize)）なので U-2 の結果に依存しない** | 検証用に別の `STORAGE_KEY` を使う一時ビルドで再現する（**本番キー `storyline-store-v1` では絶対に試さない**） |
| **U-3** | **React Flow の実機タッチ挙動**（375px でノードのドラッグとキャンバスのパンを取り違えないか・ピンチズームが効くか・iOS Safari のゴムバンドと干渉しないか） | 決定 5 の推奨そのもの。ここが通らなければ自前 SVG に戻す | 社長のターミナルで `npm run dev` → iPhone 実機。**dev / design 共同**（spec 16 章） |
| **U-4** | **React Flow を入れたときのバンドル実増分**（tree-shaking 後）。C-12 はパッケージ単体の実測で、アプリのバンドル差分ではない | 依存追加の是非 | 本実装で導入した後に `npm run build` の前後差を C-8 と比較する |
| **U-5** | **`base.css` / `style.css` が Tailwind v4 のセマンティックトークンと衝突しないか**。React Flow は独自の CSS 変数とクラス（`.react-flow__*`）を持ち込む | ライト / ダーク両対応とコントラスト 4.5:1 の担保方法（`colorMode` prop に任せるか、`base.css` だけ入れて見た目は全部自前クラスにするか） | 導入後に実画面で確認。design のレビュー対象 |
| **U-6** | **ノードが 30 個・エッジ 100 本規模でのモバイル描画性能**、および既存ボード（シーン数百件）と同居したときの体感 | spec 16 章の dev 宿題 | 実機。相関図は別モードなので同時描画はしない前提だが、モード切替のたびのマウント / アンマウント負荷は測る |
| **U-7** | **相関データの件数上限**（サーバ版）。根拠となる無料枠の実値が未確定（`accounts-and-server` U-1） | Prisma 側のバリデーション値 | 企画部へ差し戻し済み（[付録 D](#付録-d-企画部--秘書への差し戻し)）。実値は社長が Neon / Blob のアカウントを作った後 |
| **U-8** | **React Flow が React 19.2 / Next.js 16.3（Turbopack）で実際に動くか**。peer は `react >= 17` なので**宣言上は満たす**が、動作は確認していない | 決定 5 | 本実装で導入した直後に `npm run build` と実画面で確認する。**ここで落ちたら即座に自前 SVG へ切り替える**（切り替えコストは[決定 5-4](#5-4-方式が変わっても捨てない部分)のとおり小さい） |
| **U-9** | **R15 の透明な当たり判定が、React Flow が測るノードサイズ（`measured`）に混ざらないか。** 混ざるとエッジのクリップ位置と `fitView` の外接矩形が狂う | design 要件 ⑮ / 要件 ⑤（エッジをノード矩形の境界でクリップ） | 実装時に `node.width` / `node.height` を明示して測定に頼らない形にし、エッジの端点がノードの見た目の境界に来るかを目視で確認する |
| **U-10** | **`useViewport()` による毎フレーム再描画が 30 ノード / 60 エッジで滑らかか**（型定義が「viewport が変わるたびに再描画される」と明記・C-16）。エッジの線幅・矢じりのクランプ（R14）は連続値が要るのでこの経路を通る | 決定 5 の推奨 | 実機。**ノードは真偽値購読（C-17）で毎フレーム再描画を避けられる**ので、まずエッジ側だけ連続値にして測る |
| **U-11** | **React Flow の `colorMode` と本アプリのダークモード方式が噛み合うか。** 本アプリは `@media (prefers-color-scheme: dark)`（C-23）で、`.dark` クラスを持たない | U-5 と同じ（見た目の担保方法） | `base.css` だけ入れて配色は全部自前トークンで組む方針なら、そもそも `colorMode` に依存しない。実装時に確認 |

---

### 決定 1. 型の最終形

**決定: 企画部の要求どおり [src/lib/types.ts](../../../../src/lib/types.ts) に置く。座標は `Character` 直下。
`Project.relationships` / `Project.characterGroups` は `?` を付けず「必ず存在する配列」にする。**

```ts
export type RelationshipDirection = "forward" | "both" | "none";

/** 相関図の関係 (ラベル付き有向エッジ)。向きは矢印の描き方だけを変え、データは常に fromId → toId */
export interface Relationship {
  id: string;
  /** Character.id。toId と同じ値は不正 (自己ループは持たない) */
  fromId: string;
  /** Character.id */
  toId: string;
  label: string;
  direction: RelationshipDirection;
}

/** 相関図のグループ枠。枠の位置と大きさはメンバーの外接矩形から毎回算出するので持たない */
export interface CharacterGroup {
  id: string;
  name: string;
}

export interface Character {
  id: string;
  name: string;
  color: string;
  role: string;
  note: string;
  /** 相関図の論理座標。x と y は対でだけ意味を持つ。未設定 = まだ作者が動かしていない */
  x?: number;
  y?: number;
  /** 所属する CharacterGroup.id。未設定なら未所属 (同時に属せるのは最大 1 つ) */
  groupId?: string;
}

export interface Project {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  characters: Character[];
  /** 相関図の関係。旧データには存在しないので、読み込み経路で必ず空配列を補う */
  relationships: Relationship[];
  characterGroups: CharacterGroup[];
  stories: Story[];
}
```

| 論点 | 決定 | 理由 |
| --- | --- | --- |
| 座標の置き場所 | **`Character` 直下（`x` / `y`）**。別のレイアウト型を作らない | 企画部の判断材料に同意。`withFreshIds` の id 張り替えと `deleteCharacter` の掃除が**既存経路のまま**で済み、「キャラは居るのに座標が無い / 座標だけ残る」という不整合が**型として作れなくなる**。別配列にすると不整合の種類が 2 つ増え、掃除箇所も 2 つ増える |
| `x` / `y` の型 | **`number` の任意（`?`）**。`{ x, y }` のオブジェクトにまとめない | `Character` が 1 階層深くなるだけで、往復の壊れやすさは変わらない。JSON も浅い方が手で直せる。**「両方揃って初めて有効」は型では表せない**ので、読み取りを 1 か所（`readNodePosition()`）に集約して担保する（[決定 3-3](#3-3-読み込み側に足すヘルパ)） |
| `groupId` の持ち方 | **`Character` 側に持つ**（`CharacterGroup.memberIds` にしない） | 企画部の指定どおり。「1 キャラは最大 1 グループ」が**型として保証**される。メンバー配列だと同じ id が 2 つの配列に載る状態を実行時にしか防げない |
| `Project.relationships` / `characterGroups` | **`?` を付けない（必須）** | `?` にすると全参照箇所で `?? []` が要り、**1 か所忘れただけで「関係が 0 本」に見える**。型で必須にしておけば、既存データに無いという事実は**読み込み経路 1 か所の責任**に閉じる（[決定 2](#決定-2-永続化storage_key--version--migrate--partialize)）。`stories` / `characters` が既に同じ扱いなので一貫する |
| フィールド名 | `relationships` / `characterGroups`（企画推奨どおり） | `groups` は汎用すぎる |
| 配列の順序 | **保つ**（並べ替え UI は作らない） | 関係リストの表示順が開くたびに変わらないため（spec 10-1） |
| `RelationshipDirection` | **`type` のユニオンとして `types.ts` に置く**（`SceneStatus` と同じ） | [05-type-definition.md](../../../docs/02-development-docs/05-type-definition.md)「データモデルは `interface`、ユニオンは `type`」 |

**`createProject` は `relationships: []` / `characterGroups: []` で初期化する**（[factory.ts](../../../../src/lib/factory.ts)）。
`createCharacter` は **`x` / `y` / `groupId` を初期化しない**（未配置・未所属が既定であり、キーを作らない方が JSON が小さい）。

---

### 決定 2. 永続化（`STORAGE_KEY` / `version` / `migrate` / `partialize`）

#### 2-1. `STORAGE_KEY` は変えない。**`persist` の `version` も 1 のまま上げない**

**これが本チケットで最も重要な決定。**

`version` を 2 に上げて `migrate` を書く案を検討し、**却下した**。理由は 2 つ。

**理由 1（決定的）: 上げると `local-final` へのロールバックが「データ消失の経路」に変わる。**

C-5 のとおり、zustand の `persist` は「保存されている version ≠ 現ビルドの version かつ現ビルドに `migrate` が無い」とき、
**保存データを無視して初期状態（`projects: []`）で起動する**。ここまでなら「消えたように見えるだけ」だが、
本アプリの `onRehydrateStorage` は `setHydrated()` を呼び、それが**ラップされた `set` を通って `setItem()` を発火する**。
結果、**旧ビルドを開いた数ミリ秒後に IndexedDB が `{ projects: [] }` で上書きされる**。

- 旧ビルド（`version: 1`）は `accounts-and-server` の安全弁 ①（切替前コミットの git タグ `local-final`）そのもの。
  **安全弁を使った瞬間に作品が消える**設計にはできない。
- 「新ビルドで開いた作品が、旧ビルドを一度開いただけで消える」という事故は、
  ユーザ（社長）が原因を推測できない種類の事故になる。

**理由 2: 上げる実益がゼロ。** `version` を上げる目的は「古い形のデータを新しい形へ変換すること」だが、
今回の変更は**追加のみ**で、変換すべき既存フィールドが 1 つも無い。やることは
「無い配列を空配列にする」だけであり、それは `migrate`（version 不一致時にしか走らない）より
**`merge`（毎回走る）**でやる方が正しい。

> **副次的な確認**: `migrate` が走った場合だけ、`hydrate` の中で `setItem()` が呼ばれて
> **保存データが即座に新 version で上書きされる**（`middleware.mjs` 424〜426 行）。
> つまり `version` を上げると、**新ビルドを 1 回開いただけで後戻りできなくなる**。
> `merge` 方式ならユーザが 1 回目の編集をするまで保存データは元のまま残る。

#### 2-2. 代わりに `merge` で「配列が必ず存在する」ことを保証する

```ts
// src/lib/store.ts の persist オプションに追加する (version は 1 のまま)
{
  name: STORAGE_KEY,          // "storyline-store-v1" — 変えない
  version: 1,                 // 上げない
  storage: createJSONStorage(() => idbStorage),
  partialize: (state) => ({ projects: state.projects }) as StoreState,   // 変えない
  merge: (persisted, current) => ({
    ...current,               // ← 必須。落とすとアクション関数ごと消える (C-7)
    projects: hydrateProjects(persisted, current.projects),
  }),
  onRehydrateStorage: () => (state) => state?.setHydrated(),             // 変えない
}
```

`hydrateProjects` の擬似コード（[io.ts](../../../../src/lib/io.ts) に置き、`store.ts` から import する）:

```ts
/**
 * 保存済み state から projects を取り出し、相関データの「型としての整合」だけを保証する。
 * 参照の整合 (存在しないキャラを指すエッジ等) は描画の導出側で落とす (決定 4-3)。
 * この関数は絶対に例外を投げてはならない (投げると hydrated が永久に false になる → 2-4)。
 */
export function hydrateProjects(persisted: unknown, fallback: Project[]): Project[] {
  if (!isRecord(persisted) || !Array.isArray(persisted.projects)) return fallback;
  return persisted.projects.filter(isRecord).map((source) => {
    // 速い道: 自分のアプリが書いた正常なデータ。相関の 2 配列だけ足して素通しする
    if (isStoredProject(source)) {
      return {
        ...source,
        relationships: sanitizeRelationships(source.relationships),
        characterGroups: sanitizeCharacterGroups(source.characterGroups),
      };
    }
    // 遅い道: 形が壊れている (手で IndexedDB を編集した等)。捨てずに io.ts の正規化で修復する
    return normalizeProject(source);
  });
}

/** 浅い型ガード。中身までは見ない (io.ts の filter に付ける type predicate と同じ流儀) */
function isStoredProject(value: Record<string, unknown>): value is Project {
  return (
    typeof value.id === "string" &&
    Array.isArray(value.stories) &&
    Array.isArray(value.characters)
  );
}
```

- **`as` を使わないこと。** `Project` として返すために `as` を書きたくなるが、
  **浅い型ガード（type predicate）**で表現できる。
  [05-type-definition.md](../../../docs/02-development-docs/05-type-definition.md) が
  「`as` を使ってよいのは現状 2 箇所だけ」としているので、**3 箇所目を作らない**。
- **1 件も捨てない。** `filter` で落とすと、その直後の `setItem` で
  **落とした作品が IndexedDB からも消える**。形が壊れているものは `normalizeProject` で修復して残す
  （このパスは手で IndexedDB を編集した場合しか通らないので、重くても構わない）。
- 速い道では **`stories` / `characters` の中身を参照のまま持ち回る**。
  検証し直す価値が無い（自分のアプリが書いた値）うえ、全走査すると起動が重くなる。
  `normalizeProject` を全件に流用**しない**理由は 2-5。
- **計算量は O(作品数 + キャラ数 + 関係数)**。**シーンを 1 件も走査しない**。
  起動時にサムネイル込みの全データを作り直すことは避ける。

#### 2-3. `partialize` は 1 文字も変えない

```ts
partialize: (state) => ({ projects: state.projects }) as StoreState
```

- 相関データは **`Project` の中**に入るので、保存対象は現行のままで**自動的に含まれる**。
- **保存対象を減らす変更は一切しない**（`projects` が外れると作品そのものが消える）。
- `hydrated` が保存対象外である現行の性質にも依存し続ける（毎回 `false` から始まる）。

#### 2-4. `merge` は絶対に例外を投げてはならない

`hydrate()` の `.catch` は `postRehydrationCallback(undefined, e)` を呼ぶ。本アプリのコールバックは
`(state) => state?.setHydrated()` なので、**`state` が `undefined` だと `setHydrated` が呼ばれず、
画面は「読み込み中…」のまま永久に止まる**（`middleware.mjs` 431〜436 行 ＋ store.ts）。
`merge` の中で `.map` / `.filter` を使うときは、必ず `Array.isArray` で確かめてから触ること。

#### 2-5. `io.ts` の `normalizeProject` を hydration に流用しない

流用すると、**相関図と無関係な副作用**が起動時に発生する:

- `stories` が空の作品に既定ストーリーが 1 本生える
- `id` が空の要素に新しい id が振られる
- 未知の `status` が `idea` に落ちる

いずれも「壊れたデータの修復」であり、**外部由来 JSON には正しいが、自分が保存したデータに
黙って適用してよい処理ではない**。しかも全シーンを走査するので起動が重くなる。
**外部由来（`io.ts`）と自前保存（`merge`）で厳しさを変える**のが本チケットの方針。

#### 2-6. ドラッグ中にストアを更新しない（データではなく挙動の決定だが、永続化に直結する）

C-4 のとおり、**`persist` はすべての state 更新で全作品を JSON 化して IndexedDB に書く**。
ノードのドラッグ中に毎フレーム座標をストアへ書くと、**サムネイル込みの全作品を毎フレーム直列化する**ことになる。

- **座標のストア反映は「ドラッグ終了時（drag stop）に 1 回だけ」**。ドラッグ中の位置は
  コンポーネント側のローカル state に持つ（既存の「ローカル draft → デバウンス → ストア反映」と同じ原則）。
- これは spec 2 章の「**動かしたノードだけ保存する**」「見ただけで `updatedAt` を進めない」とも一致する。
- **相関図を開いただけ・パン / ズームしただけでは 1 バイトも書かない。**

---

### 決定 3. 書き出し JSON と読み込みの互換（干渉点 I-2）

#### 3-1. `EXPORT_FORMAT` / `EXPORT_VERSION = 1` は据え置く（**上げない**）

企画部の判断を追認する。ただし根拠は企画部が書いたもの（追加のみだから）に**もう 1 つ決定的なものを足す**:

- **C-2: `parseProjectJson` はエンベロープの `version` を読んでいない。** 見ているのは
  `project` キーと `stories` キーの有無だけ。したがって `EXPORT_VERSION` を 2 に上げても、
  **既にリリースされているどのビルドも「新しい形式だ」と気づけない**。
  バージョンを上げる唯一の実益（読む側が分岐できる）が、この実装では**存在しない**。
- 一方、上げるコストは実在する: `accounts-and-server` の決定（ローカル版の JSON をサーバ版が読めることが
  移行の生命線）に触れ、サーバ版の受け口に version 分岐を作る動機を生む。
- **結論: 据え置き。干渉点 I-2 は「触らない」で解消。**

将来 version を上げる必要が出るのは「**既存フィールドの意味が変わるとき**」だけで、そのときは
**同じコミットで `parseProjectJson` に version の読み取りを足す**こと（今は読んでいない、が前提条件になる）。

#### 3-2. 書き出し側は変更不要（C-1 で検証済み）

`toExportJson` は `{ format, version, exportedAt, project }` を組み立てるだけで、`project` を素通しする。
相関データが `Project` 配下にある限り**自動的に載る**。企画部の見立ては正しい。

- `x` / `y` / `groupId` が未設定のキャラクターは、キーを作らなければ `JSON.stringify` に現れない。
  → **未配置キャラが増えても書き出しサイズは増えない**。
- サイズ影響は spec 12 章の概算どおり（関係 100 件で 20 KB 程度）。上限は設けない。

#### 3-3. 読み込み側に足すヘルパ

```ts
// 1. 数値ガード (企画部の申し送り 1。as は使わない)
const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

// 2. 向きの型ガード (as を使わない。既存の status の as を増やさない)
const isDirection = (value: unknown): value is RelationshipDirection =>
  value === "forward" || value === "both" || value === "none";

// 3. 座標の読み取り。x と y が両方そろって初めて採用する
function readNodePosition(source: Record<string, unknown>): { x: number; y: number } | undefined {
  const x = num(source.x);
  const y = num(source.y);
  return x !== undefined && y !== undefined ? { x, y } : undefined;
}
```

- `Number.isFinite` は `NaN` / `Infinity` / `-Infinity` / 非数値をすべて弾く（spec 6 章の要求）。
- **`isDirection` を型ガードにすることで `as` を 1 つも増やさない。**
  [05-type-definition.md](../../../docs/02-development-docs/05-type-definition.md) は
  「`as` を使ってよい場所は現状 2 箇所だけ」としており、**3 箇所目を作らない**。
  （既存の `status` の `as` を同じ形に寄せるかは本チケットのスコープ外。触らない）

#### 3-4. `normalizeProject` の処理順（**間違えると全部落ちる**）

依存関係があるので、順序を固定する:

```
1. characterGroups を正規化        → knownGroupIds を作る
2. characters を正規化             → 座標と groupId を読む (knownGroupIds が要る)
                                   → knownCharacterIds を作る
3. relationships を正規化          → fromId / toId を knownCharacterIds で絞る
4. stories を正規化                → 既存どおり knownCharacterIds で絞る
```

- **グループを先に読まないと、全キャラクターの `groupId` が「未知のグループ」として捨てられる。**
- `normalizeCharacter` は現在 `arr(source.characters).map(normalizeCharacter)` と**ポイントフリーで呼ばれている**
  （第 2 引数に配列の index が渡る前提）。引数が増えるので
  **`.map((c, i) => normalizeCharacter(c, i, knownGroupIds))` に書き換える**こと。
  ここを直し忘れると `knownGroupIds` に index が渡り、型エラーにはなるが**似た形なので見落としやすい**。
- 関係・グループの **id は一意にする**（既出の id なら `newId()` を振り直す）。
  エッジの id が重複すると `filter((r) => r.id !== id)` が **2 本まとめて消す**削除事故になる。
  （キャラクター / シーンの id 重複は既存の潜在問題で、本チケットでは触らない → [付録 D](#付録-d-企画部--秘書への差し戻し) D-4）

---

### 決定 4. 参照整合性（削除時の掃除・id 張り替え・描画時の防御）

**3 層で守る。1 層でも欠けると「静かな消失」か「幽霊参照」になる。**

| 層 | 責務 | 何を守るか |
| --- | --- | --- |
| ストアの削除操作 | 削除と同時に参照を掃除する | 日常操作で幽霊が生まれない |
| `io.ts`（正規化 ＋ `withFreshIds`） | 外部由来 JSON の参照を捨てる / 張り替える | 取り込みで壊れない |
| 描画の導出（`graph.ts`） | 存在しない参照を**描かない** | 上の 2 層をすり抜けた場合の最後の砦 |

#### 4-1. 削除時の掃除（ストア）

| 操作 | 掃除する対象 |
| --- | --- |
| `deleteCharacter` | **既存のシーン掃除ループに加えて**、`project.relationships` から `fromId === id \|\| toId === id` を除去する。（所属グループは `Character` 側に持つのでキャラごと消えて自然に解消する） |
| `deleteCharacterGroup`（新規） | そのグループを指す**キャラクターの `groupId` を外す**。**キャラクター自体は消さない**（spec 11 章） |
| `deleteRelationship`（新規） | その関係のみ。キャラクターにもグループにも影響しない |

- **キャラクター削除の確認文言を更新する必要がある。** 現行は
  `「〇〇」を削除します。各シーンからも外れます。よろしいですか？`
  （[CharacterPanel.tsx](../../../../src/components/CharacterPanel.tsx) 68 行）。
  相関図の関係も消えるので、**それが伝わる文言に変える**こと（正確な文言はデザイン部の管轄）。
  dev としての要求は「**掃除処理と同じコミットで文言を直す**」の 1 点。
  ここを直さないと「知らないうちに相関が消えた」体験になる。
- `groupId` を外す実装は `Object.assign(character, { groupId: undefined })`。
  既存のサムネイル削除（`{ thumbnail: undefined }`）と同じ流儀で、
  [02-data-model-and-persistence.md](../../../docs/02-development-docs/02-data-model-and-persistence.md)
  §2 が明記している immer の性質に依存する。

#### 4-2. `withFreshIds` の張り替え（**ここを落とすと静かに壊れる**）

現行の `withFreshIds` は最後に **`{ ...project, id, characters, stories }`** を返している。
つまり **`relationships` と `characterGroups` を明示的に上書きしないと、旧 id を指したまま素通しされる**。

- **`normalize*` の追加漏れは「消える」（気づける）が、`withFreshIds` の漏れは「壊れた参照が残る」**。
  描画層が防御していれば画面には出ないが、**その状態で書き出すと壊れた JSON が生まれる**。
  失敗の質が違うので、両方を別々に確認すること。

張り替えの順序と内容:

```
1. characterGroups を新 id で作り直し、groupIdMap (旧 → 新) を作る
2. characters を新 id で作り直し、characterIdMap を作る
   + groupId は groupIdMap.get(old) で引き直す。引けなければ未所属にする
3. relationships を新 id で作り直し、fromId / toId を characterIdMap で引き直す
   + どちらか一方でも引けなければ、その関係を捨てる
4. stories 以下は現行どおり (characterIds の張り替え)
```

- 取り込みの経路は [page.tsx](../../../../src/app/page.tsx) の
  `parseProjectJson()` → （id 衝突時のみ）`withFreshIds()` の順。
  **正規化で不正な参照は既に捨てられている**ので、3 の「引けなければ捨てる」が発火するのは
  正規化を通さず `withFreshIds` を呼んだ場合だけ。それでも書く（サーバ版はサーバ側で
  `withFreshIds` を呼ぶ設計になっており、経路が増える）。

#### 4-3. 描画の導出（新規 `src/lib/graph.ts`）

React に依存しない純粋関数として置く（レイヤ規約どおり `src/lib/`）。

```ts
/** 相関図の描画モデルを Project から毎回導出する。データは 1 バイトも増やさない */
export function buildRelationshipGraph(project: Project, layout: LayoutOptions): {
  nodes: { character: Character; x: number; y: number; placed: boolean }[];
  edges: Relationship[];      // 存在しないキャラを指すものは除外済み・自己ループも除外済み
  groups: { group: CharacterGroup; memberIds: string[] }[];
};

/** 未配置ノードの決定的な既定位置 (乱数を使わない・重ならない) */
export function defaultNodePosition(index: number, total: number, layout: LayoutOptions): { x: number; y: number };
```

- **既定配置は design の指定に差し替えた（2026-08-04）。**
  当初 dev が提案した `cols = Math.ceil(Math.sqrt(total))` は **採らない**。

  ```
  x = 40 + (index % 4) × 200
  y = 40 + Math.floor(index / 4) × 120        // index は Project.characters 配列上の位置
  ```

  | 論点 | 内容 |
  | --- | --- |
  | **なぜ dev の当初案が誤りだったか** | `ceil(sqrt(total))` は**列数がキャラ数に依存する**。キャラを 1 人足した瞬間に列数が変わり、**既存の未配置ノードが全部動く**。spec 2 章は「末尾追加なので既存の未配置ノードの位置はずれない」を要件にしているので、**n 依存は要件違反**。design の指摘が正しい |
  | 列数 4 の根拠（design） | 375px は縦長なので、図が縦に伸びる方が zoom-to-fit の倍率が上がる。30 人 = 4 列 × 8 行 → 論理 880 × 1020 → 375 × 503 の viewport に fit して**約 0.43**。6 列だと約 0.29 |
  | ピッチ 200 × 120 の根拠（design） | ノード論理サイズ **160 × 60** に対し横 40 / 縦 60 の間隔。zoom 0.6 でスクリーン 120 × 72px |
  | `LayoutOptions` | 形は変えない。`{ originX: 40, originY: 40, cols: 4, nodeW: 160, nodeH: 60, gapX: 40, gapY: 60 }` で上式と一致する |

  乱数を使わないので**同じデータなら毎回同じ位置**、格子なので**重ならない**（spec 2 章の要件）。
- `placed`（＝ `x`/`y` を持っているか）を返すのは、**保存していないノードを書き込まない**ため。
  導出側が既定位置を計算しても、その値は**ストアに書かない**。
- ここでの参照フィルタが**最後の砦**。`merge`（決定 2-2）は型としての整合しか見ないので、
  「旧ビルドでキャラを消したせいで残った幽霊エッジ」はここで初めて落ちる。
  **落としたことをユーザに通知しない**（spec 6 章「エラー表示も警告も出さない」）。

---

### 決定 5. 実装方式（React Flow か、自前 SVG か）

> **結論: `@xyflow/react`（React Flow）を推奨する。ただし「社長の依存追加承認」と
> 「design の UI 仕様が出た時点での再判定」を条件とする。**
> 判定不能・未検証の項目は下表に明示した。**この結論は U-1 / U-3 / U-8 の結果で覆りうる。**

#### 5-1. 前提の訂正: 「既存の dnd-kit を流用する」は成り立たない

チケットの選択肢は「既存 dnd-kit + 自前 SVG」だが、**dnd-kit はこの用途にほぼ寄与しない**。

- dnd-kit が返すのは**スクリーン座標の delta** であり、キャンバスの拡大率・パン量を知らない。
  ズーム中は `delta / scale` の補正が要り、パンとの同時進行も自前で扱うことになる。
- dnd-kit の中心概念（`DragOverlay` / `SortableContext` / 衝突判定）は「並べ替え」のためのもので、
  相関図に必要なのは「自由座標への移動」だけ。使うと**設計を曲げてまで乗せる**形になる。
- 実際に自前で書くなら **Pointer Events（`setPointerCapture`）を直接使う**のが素直。
  つまり自前案の実体は「**dnd-kit 流用**」ではなく「**パン・ズーム・ドラッグを全部自分で書く**」。

**この訂正が方式判定の重心を動かす。**「既存資産の再利用」という自前案の利点は、実際にはほぼ存在しない。

#### 5-2. UI 要件と方式の判定

⚠ **design の UI 要件リストはまだ存在しない**（U-1）。以下は **dev が spec 8 / 14 章と
design チケットの完了条件から起こした暫定要件**であり、design の仕様確定後に再判定する。

| # | 要件（出典） | React Flow | 自前 SVG |
| --- | --- | --- | --- |
| R1 | ノードのドラッグ配置（PC マウス / 375px タッチ）（spec 2・8） | **○** `onNodeDragStop` で確定値を取れる。ドラッグ実装は d3-drag（C-11・C-13） | △ Pointer Events で自前。**タッチの取りこぼし・`touch-action` 指定が要る** |
| R2 | 背景ドラッグでパン / ピンチ・ホイールでズーム / 開いたら全体が収まる（spec 2・8） | **○** d3-zoom（`panOnDrag` / `fitView`・C-13） | **✗→自前** ピンチ（2 本指）・ホイール・慣性の抑制まで全部自作。**本フィーチャで最も壊れやすい箇所** |
| R3 | ノード → ノードのドラッグ結線（PC の高速手段。spec 8 で**必須ではない**） | **○** `Handle` ＋ `onConnect`（C-13） | △ 仮エッジの追従描画とドロップ判定を自前 |
| R4 | タップ 2 段階の結線（375px の必須経路。spec 8） | ○ React Flow の機能ではないが、通常 UI ＋ ストア操作で実装（差は無い） | ○ 同左 |
| R5 | ラベル付き有向エッジ・向き 3 値（spec 1） | **○** `MarkerType` / `EdgeLabelRenderer` / 既定のベジエ経路（C-13）。3 値は `markerStart` / `markerEnd` の有無で表現 | ○ SVG `<marker>` と経路計算を自前（直線なら容易） |
| R6 | グループ枠（メンバーの外接矩形から自動算出・単層・左上ラベル）（spec 7） | △ **React Flow の親ノード機能は使わない**（枠の座標を持つことになり spec 7 に反する）。`ViewportPortal` ＋ `getNodesBounds` に自前描画（C-13） | ○ 自前計算（同じ計算量） |
| R7 | フォーカス表示 ↔ 全体表示のワンタップ往復（spec 8） | ○ 渡す配列を絞るだけ | ○ 同左 |
| R8 | 関係リスト（図の外の一覧から追加 / 編集 / 削除）（spec 8） | ○ 通常 UI | ○ 同左 |
| R9 | ライト / ダーク両対応・セマンティックトークン準拠・コントラスト 4.5:1 | △ `colorMode` prop あり（C-13）が、`base.css` が独自 CSS 変数を持ち込む。**トークンと二重管理になりうる（U-5）** | **○** 全部自前クラスなのでトークン準拠が最も素直 |
| R10 | タップ領域 44×44px 以上 | ○ ノードは自前コンポーネント | ○ |
| R11 | 375px で横スクロールが出ない | ○ | ○ |
| R12 | 未配置ノードの決定的な既定配置（spec 2） | ○ 導出側の責務（[決定 4-3](#4-3-描画の導出新規-srclibgraphts)）。方式に依存しない | ○ |
| R13 | 動かしたノードだけ保存 / 開いただけで `updatedAt` を進めない（spec 2） | ○ `onNodeDragStop` でのみ commit | ○ drag end でのみ commit |
| **R14** | **ズームに追従しない要素を混在できる**（グループラベルは固定サイズ、矢じり 5〜10px・線幅 1〜2px をクランプ）（design 要件 ②） | **○** `useViewport()` / `useStore((s) => s.transform[2])` / `getZoom()` で倍率を読み、逆スケールを掛ける（C-16 / C-17 / C-19）。ただし**追従しない要素を素で描く機能は無い**ので、逆スケールは自前計算 | **○** 変換行列を自分で持つので最も素直 |
| **R15** | **ノードの当たり判定をズーム倍率を問わず最小 44×44 スクリーン px**（design 要件 ⑮） | **△** 逆スケールした透明領域で作れるが、**React Flow が測る node のサイズに影響させない**手当てが要る（`node.width` / `height` を明示する）。**未検証**（U-9）。さらに下記の幾何的な限界は方式に関係なく残る | **△** 同じ手当てが要る（自前なら当たり判定を描画と別に持てるぶん素直）。幾何的な限界は同じ |
| **R16** | **ズームに応じてノードの描画内容を差し替える**（LOD・0.6 が境）（design 要件 ⑨） | **○** `NodeProps` に zoom は**含まれない**ことを型定義で確認（C-18）。代わりに `useStore((s) => s.transform[2] < 0.6)` という**真偽値セレクタ**で購読でき、**境界を跨いだときだけ再描画**できる（C-17） | **○** 自分の状態なので自明 |

**差がつくのは R1 / R2 / R3（＝タッチとビューポート）と R9（＝スタイル）だけ**で、
残りはどちらでも同じ量の自前実装になる。**R14 / R16 は「自前の方が素直」だが、React Flow でも
公開 API で成立する**（下記 5-5）。

#### 5-3. 推奨と、その理由

**React Flow を推奨する。決め手は R2。**

1. **この環境では検証できない部分に、実績のある実装を当てられる。**
   本プロジェクトには**テスト基盤が無く**（[09-test-strategy.md](../../../docs/02-development-docs/09-test-strategy.md)）、
   Claude は **dev サーバを起動できず**、**実機も無い**。
   パン / ズーム / ピンチ / ドラッグの取り違えは**まさに実機でしか壊れが見つからない**領域で、
   ここを自前で書くと**バグの検出手段が「社長の実機確認」だけ**になる。
   React Flow の該当部分は d3-zoom / d3-drag（C-11）で、この領域では最も枯れた実装。
2. **自前案の「既存資産の再利用」という利点が実在しない**（5-1）。
3. **spec が要求する storyline 固有の部分（フォーカス表示・関係リスト・グループ枠・既定配置・
   タップ 2 段階の結線）はどちらでも自前**。React Flow を入れても「storyline らしさ」を
   ライブラリに預けることにはならない。

**コスト（実測値。C-10 / C-11 / C-12）**

| 項目 | 値 |
| --- | --- |
| ライセンス | **MIT**（コア）。有償の Pro コンポーネントは**使わない** |
| 増える実行時依存 | `@xyflow/react` / `@xyflow/system` / `classcat` / `d3-drag` / `d3-selection` / `d3-zoom` / `d3-interpolate` ＋ **`zustand@4`**（React Flow の依存が `^4.4.0` のため、プロジェクトの zustand 5 とは**別コピーが入れ子で入る**） |
| JS サイズ（パッケージ単体の実測） | `@xyflow/react` 231 KB raw / **51.9 KB gzip**、`@xyflow/system` 152 KB raw / **35.0 KB gzip**（d3・classcat・zustand を含まない） |
| CSS | `base.css` 13.6 KB（必須）／ `style.css` 18.6 KB（既定テーマ・任意） |
| 比較基準 | 現行アプリのクライアント JS 合計 **660 KB raw / 205 KB gzip**（C-8） |
| **実バンドル増分** | **未計測（U-4）**。tree-shaking 後の値は導入しないと分からない。**「+87 KB gzip」と断定しない** |

**緩和策（本実装で必ずやる）**

- **相関図モードのコンポーネントを `next/dynamic` で遅延読み込みする。**
  作品画面の既定は「構成」（spec 5 章）なので、**相関図を開かない限りバンドルを取りに行かない**。
  ボード画面の初期表示コストを増やさない。
- `style.css` は入れず、**`base.css` だけを入れて見た目は自前クラス**で作る方向で試す（U-5 で検証）。
- **`useStore` の名前衝突（C-14）に注意**。React Flow の `useStore` は import しない。
  誤って import すると型は通るのに作品データが取れない、という分かりにくい事故になる。

**アーキテクチャ規約との整合**

- 規約「**ストアは 1 つ。新しいストアやコンテキストを増やさない**」は**アプリの状態管理の話**であり、
  ライブラリが内部に持つ状態は対象外と解釈する。ただし次を**本実装の拘束条件**とする:
  - **作品データの正本は常に [src/lib/store.ts](../../../../src/lib/store.ts)**。
    React Flow には**導出した `nodes` / `edges` を毎回渡す（controlled 運用）**。
  - **React Flow の内部 state を作品データのミラーとして保持しない。**
    `useNodesState` / `useEdgesState`（ライブラリ側に配列を持たせるヘルパ）は**使わない**。
  - ストアへの書き込みは **drag stop・結線確定・ラベル確定・削除**の 4 契機だけ（決定 2-6）。
- `@xyflow/react` の配布物は 1 行目が `"use client"`（C-13）なので、App Router 上で
  クライアント境界の扱いに追加の細工は要らない見込み（**動作は U-8 で未検証**）。

#### 5-4. 方式が変わっても捨てない部分

**U-3 / U-5 / U-8 で React Flow が使えないと分かった場合に備え、方式に依存しない部分を分離しておく。**

- `src/lib/types.ts` の型（決定 1）・`io.ts` の正規化（決定 3）・`graph.ts` の導出と既定配置（決定 4-3）・
  ストアの操作（付録 C）は **React Flow が入っても入らなくても同一**。
- したがって**データ層を先に実装し、描画方式は最後に決めても手戻りしない**。
  本実装は `src/lib/` → `src/components/` の順で回す規約とも一致する。
- 切り替えが必要になった場合の影響範囲は**相関図キャンバスのコンポーネント 1 つ**に閉じる。

**社長に承認を求める形**: 「相関図の描画に `@xyflow/react`（MIT）を追加したい。
現行のクライアント JS は 205 KB gzip で、追加分は**未計測だが数十 KB 規模**。
ただし相関図を開いたときだけ読み込む形にする」（[付録 E](#付録-e-社長へ確認したいこと)）。

#### 5-5. design UI 仕様確定後の再判定（2026-08-04・**U-1 を解消**）

design の UI 仕様（[ui-specs/2026-08-04-character-relationship-graph.md](../../design/ui-specs/2026-08-04-character-relationship-graph.md)
17 章）が確定し、**要件 22 項目**が出た。R1〜R13 に含まれていなかった 3 件を
**R14 / R15 / R16 として上表に追加**した。判定に使った事実は
[C-16〜C-20](#0-1-確認済みの事実この環境で実際に確かめたもの)（**`npm install` はせず、配布 tarball の型定義を読んで確認**）。

> **結論: React Flow 推奨は維持する。** R14 / R16 は公開 API で成立し、R15 も成立するが手当てが要る。
> **決め手だった R2（タッチのパン / ピンチ / ズーム）は動いていない。**

**R14（ズームに追従しない要素）** — design が「最優先の判定項目」と位置づけた項目。

- 倍率を読む手段が 3 つ確認できた: `useViewport(): {x, y, zoom}`（C-16）/
  `useStore((state) => state.transform[2])`（C-17）/ `useReactFlow().getZoom()`（C-19）。
  加えて `flowToScreenPosition` / `screenToFlowPosition` もある（C-19）。
- したがって**線幅は `clamp(1.5 × zoom, 1, 2) / zoom`、矢じりは `clamp(10 × zoom, 5, 10) / zoom` を
  論理値として渡す**ことで、design の指定（スクリーン 1〜2px / 5〜10px）を満たせる。
- グループのラベル（固定サイズ）は **`ViewportPortal`（変換される層・C-20）に置いて `scale(1/zoom)` を掛ける**か、
  **変換されない層に `flowToScreenPosition` で座標を投影して置く**かの 2 通り。どちらも成立する。
  - `Panel`（C-20）は変換されない層だが**四隅への配置しか指定できない**ので、
    任意座標のグループラベルには使えない。
- **懸念（U-10）**: `useViewport()` は型定義のコメントに
  「**viewport が変わるたびに再描画される**」と明記されている（C-16）。パン中・ピンチ中に
  毎フレーム再描画されるので、**30 ノード / 60 エッジで滑らかかは実機で測るまで分からない**。
  緩和策は「連続値が要るのはエッジと グループラベルだけ」に絞ること（ノードは R16 の真偽値購読で足りる）。

**R15（当たり判定 44×44 スクリーン px）** — △。2 つの理由。

1. **React Flow はノードを「変換される層の中の絶対配置 div」として描くので、当たり判定も倍率と一緒に縮む。**
   44px を保つには逆スケールした透明領域を重ねることになるが、その領域が
   **React Flow が測るノードサイズ（`measured`）に混ざるとエッジのクリップ位置と `fitView` の外接矩形が狂う**。
   回避は `node.width` / `node.height` を明示して測定に頼らないこと。**未検証（U-9）。**
2. **これは方式に関係なく成立しない領域がある（幾何の問題・design へ差し戻す → [付録 D-6](#付録-d-企画部--秘書への差し戻し)）。**
   design の既定配置は縦ピッチ 論理 120px。最小ズーム 0.3 では**スクリーン 36px** しかないので、
   **44px の当たり判定は必ず隣と重なる**。design は「重なるのは作者が密着させて置いた場合だけ」と
   書いているが、**既定配置のままでも最小ズームでは重なる**。
   ただし design 自身が「誤タップで起きるのは選択の変化だけで破壊的ではない」と結論しており、
   **落とすかどうかの判断だけ差し戻す**（実装は「重なったら後勝ち」で進めてよい）。

**R16（LOD）** — ○。`NodeProps` の型を確認したところ **zoom は含まれない**（C-18）ので、
ノード側で倍率を読む必要がある。ここで効くのが `useStore(selector, equalityFn?)`（C-17）で、
**`(s) => s.transform[2] < 0.6` という真偽値を購読すれば、0.6 を跨いだ瞬間だけ再描画される**。
`useViewport()` を使うと毎フレーム再描画になるので、**LOD には使わないこと**。

- design 8-2 ② の「縮小表現ではノード移動と結線を禁止」は、
  導出する `nodes` の `draggable` / `connectable` を LOD の真偽値で切り替えれば足りる。
- **`<ReactFlowProvider>` で包み、キャンバス本体を子コンポーネントに分ける必要がある**
  （`useViewport` の型定義に「`ReactFlowProvider` か `ReactFlow` の子でしか使えない」と明記・C-16）。
- **`useStore` の名前衝突（C-14）がここで現実の問題になる。** 同じファイルで
  アプリの `useStore`（`@/lib/store`）と React Flow の `useStore` を両方使うことになるため、
  **どちらかを別名 import する**こと（例: `import { useStore as useFlowStore } from "@xyflow/react"`）。

---

### 決定 6. Prisma スキーマの受け皿（干渉点 I-1）

**決定: 相関データのテーブルを今このタイミングで確定させる。`accounts-and-server` の決定 1〜7 と
矛盾はゼロ。[prisma/schema.prisma](../../../../prisma/schema.prisma) 本体は本チケットでは変更せず、
下の差分を本実装（またはサーバ移行の本実装）で当てる。**

> ✅ **2026-08-04 20:55: 社長判断により、下の差分を [prisma/schema.prisma](../../../../prisma/schema.prisma)
> 本体へ適用済み**（`npx prisma validate` 7.9.1 で valid・C-24）。
> `prisma/migrations/` が 1 つも無い状態で当てたので、**初回マイグレーションに同梱され、
> 追加マイグレーションは発生しない**（秘書決裁 R-1 の条件を満たした）。
> 適用時に既存モデルの意味は 1 つも変えていない（追加のみ）。
> 申し送りは [accounts-and-server-impl の「7. 相関図フィーチャからの申し送り」](./2026-08-04-accounts-and-server-impl.md)に記載済み。
>
> 適用時に**コメントだけ本文より詳しくした**（このファイルは「なぜそうしたか」を日本語で残す作法のため）。
> フィールドと制約は下の記載と完全に一致する。

#### 6-1. 追加するモデル

```prisma
enum RelationshipDirection {
  forward
  both
  none
}

// 相関図の関係 (ラベル付き有向エッジ)。データ上の向きは常に fromId -> toId で、
// direction は矢印の描き方だけを変える (双方向を 2 行にしない)。
model Relationship {
  id        String                @id
  projectId String
  fromId    String
  toId      String
  label     String                @default("")
  direction RelationshipDirection @default(forward)
  order     Int

  project Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  from    Character @relation("RelationshipFrom", fields: [fromId], references: [id], onDelete: Cascade)
  to      Character @relation("RelationshipTo", fields: [toId], references: [id], onDelete: Cascade)

  @@index([projectId, order])
  @@index([fromId])
  @@index([toId])
}

// グループ枠。枠の位置・大きさ・色は持たない (メンバーの外接矩形から自動算出する)。
model CharacterGroup {
  id        String @id
  projectId String
  name      String @default("")
  order     Int

  project    Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  characters Character[]

  @@index([projectId, order])
}
```

#### 6-2. 既存モデルへの追加

```prisma
model Character {
  // ...既存の列はそのまま...

  // 相関図の論理座標。両方揃って初めて「配置済み」。片方だけの状態は
  // アプリ側 (io.ts / 描画の導出) で未配置に落とす。DB では強制しない。
  x Float?
  y Float?

  // 所属グループ (最大 1)。グループを消してもキャラは残すので SetNull。
  groupId String?

  project           Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  group             CharacterGroup?  @relation(fields: [groupId], references: [id], onDelete: SetNull)
  scenes            SceneCharacter[]
  relationshipsFrom Relationship[]   @relation("RelationshipFrom")
  relationshipsTo   Relationship[]   @relation("RelationshipTo")

  @@index([projectId, order])
  @@index([groupId])
}

model Project {
  // ...既存の列はそのまま...
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  stories         Story[]
  characters      Character[]
  relationships   Relationship[]
  characterGroups CharacterGroup[]
}
```

#### 6-3. `accounts-and-server` の決定 1〜7 との整合（**矛盾ゼロ**）

| 既存の決定 | 相関データでの扱い | 整合 |
| --- | --- | --- |
| 決定 1: **id はアプリ採番**（`@default(cuid())` を付けない） | `Relationship.id` / `CharacterGroup.id` も `@id` のみ。`newId()`（nanoid(12)）で採番 | ✅ |
| 決定 1: **上限はバリデーション層。DB 制約にしない** | 件数上限も「自己ループ禁止」も「同じ作品に属すること」も **DB 制約にしない**。Server Action 側で担保 | ✅（`SceneCharacter` と同じ理由・同じ扱い） |
| 決定 1: enum は Postgres の enum（`SceneStatus`） | `RelationshipDirection` も **Postgres の enum**。3 値は spec の確定事項で増える見込みが無い | ✅ |
| 決定 2: 並び順は **`order Int`（1024 刻み・一意制約なし・`order ASC, id ASC` で読む）** | `Relationship.order` / `CharacterGroup.order` を同じ規則で持つ。**並べ替え UI は無いが、spec 10-1 が「配列順を保つ」ことを要求している**ため列は要る | ✅（`Project` に `order` を持たせない判断とは前提が違う。あちらは**順序自体が仕様上どうでもよい**、こちらは**順序の保持が仕様**） |
| 決定 3: カスケードは Project → 子 | `Project → Relationship` / `Project → CharacterGroup` を Cascade。**`Character → Relationship` も Cascade**（キャラを消したら関係も消える＝ spec 11 章・現行 `deleteCharacter` と等価） | ✅ |
| 決定 3: カスケード図 | **1 行だけ追記が要る**: `CharacterGroup` を消したときは **`Character.groupId` を `SetNull`**（キャラは消さない）。**Cascade ではない唯一の辺**。矛盾ではなく追加 | ✅（[付録 D](#付録-d-企画部--秘書への差し戻し) D-1 で報告） |
| 決定 3: Blob の削除順序 | 相関データは Blob を持たない。影響なし | ✅ |
| 決定 4: サムネイル | 影響なし | ✅ |
| 決定 5: 取り込みは `parseProjectJson` → `withFreshIds` をサーバ側で再利用 | **決定 3・4 の変更がそのままサーバ側にも効く**。追加の受け口は不要。`order` の採番対象に 2 つのテーブルが増えるだけ | ✅ |
| 決定 6: 1 ファイル = 1 作品 = 1 トランザクション | `createMany` が 5 本 → **7 本**になる（characterGroups / relationships が増える）。**順序が重要**: characterGroups → characters → relationships（FK の解決順） | ✅ |
| 決定 7: 書き出し UI を落とす順序 | 影響なし | ✅ |
| 付録 A: `Project` 型の全フィールド対応表 | **5 行の追加が要る**（`Character.x` / `.y` / `.groupId` / `Project.relationships` / `.characterGroups`）→ [付録 D](#付録-d-企画部--秘書への差し戻し) D-2 |
| 付録 B: 書き出しの組み立て | サーバ版の書き出しに `relationships`（order ASC）/ `characterGroups`（order ASC）/ キャラの `x` `y` `groupId` を含める必要がある → 同 D-2 |

#### 6-4. `x` / `y` を `Float?` にした理由

- ローカル版の座標は JS の `number`（倍精度）。`Int` にすると**小数点以下が丸められ、
  往復で配置が微妙にずれる**。ずれ自体は実害が小さいが、「往復で値が変わる」性質を作らない方がよい。
- 「x と y は両方揃って初めて有効」は **DB では強制しない**（Prisma に移植性のある CHECK 制約の
  標準機能が無く、`@@check` の可用性は**未確認**）。決定 1 と同じ方針で**バリデーション層に置く**。

---

### 決定 7. 進行順（秘書決裁 R-1 の追認）と、本実装の分割

**決定: 秘書の既定 (a)「現行のローカル版（IndexedDB）に先に載せる」で進める。企画部の追認に同意する。**

- 追加の根拠（dev 視点）: 相関図の要求は
  **`Project` 直下への項目追加 ＋ `io.ts` の正規化 ＋ ストア操作**で完結し、
  サーバの有無に一切依存しない。決定 6 で DB 側の受け皿も同時に確定させたので、
  **サーバ移行時に増えるのは「取り込み処理に 2 テーブル足す」だけ**（二重工事にならない）。
- `accounts-and-server` は社長判断 Q1 / Q4 と環境変数で停止中（干渉点 I-3）。待つ理由が無い。

**本実装の順序（[impl チケット](./2026-08-04-character-relationship-graph-impl.md)への指定）**

```
Step 1 (src/lib/・store-builder)   types.ts → factory.ts → io.ts → graph.ts → store.ts
        ↑ ここまでで既存作品が壊れないことを確認する (build / lint / tsc)
Step 2 (実装方式の最終決定)         design の UI 仕様を読んで R1〜R13 を再判定 → 社長へ依存追加の承認を取る
Step 3 (src/components/・component-builder)  相関図キャンバス / 関係リスト / モード切替
Step 4 (docs)                       02 / 03 / 05 / 06 / 07 のうち該当するものを同じコミットで更新
```

**Step 1 と Step 2 の間に依存は無い**（決定 5-4）。design の仕様待ちで Step 1 を止めない。
→ **2026-08-04 に design の UI 仕様が確定したので、Step 2 のゲートは開いた**（残るは社長の依存追加承認）。

#### 7-1. 作業ツリーの変化による影響（2026-08-04 20:45 時点）

`accounts-and-server` の本実装が**同じ作業ツリーで並行して進んでいる**。本チケットの前提が
崩れていないかを実際に確認した。

| 確認したこと | 結果 | 本チケットへの影響 |
| --- | --- | --- |
| `prisma/migrations/` の有無 | **まだ無い**（C-21） | **決定 6 の前提は成立している。** 初回 `prisma migrate` の前に差分を当てれば追加マイグレーションは発生しない |
| `src/lib/` の 5 ファイル（`types` / `factory` / `io` / `store` / `storage`） | **いずれも未変更**（C-21） | **決定 1〜4 はそのまま適用できる。** `persist` の `version` は 1 のまま、`partialize` も現行のまま |
| `package.json` | `next-auth` / `@prisma/client` / `@prisma/adapter-pg` / `@auth/prisma-adapter` / `prisma` が追加され、`dev` が **ポート 4000** に変更 | 本チケットの決定に影響なし。**ただしバンドル基準値（C-8）は測り直しが要る**（U-4 の比較は「導入前後の差分」で見る） |
| **作品画面の実装位置** | `src/app/projects/[projectId]/page.tsx` が 11 行のサーバコンポーネントになり、**UI は新規の `src/components/ProjectWorkspace.tsx` へ移った**（C-22） | **本実装の変更対象ファイルが変わる。** design の申し送り (d) が指す `projects/[projectId]/page.tsx` は**もう当該箇所を持っていない**。モード切替（構成 ↔ 相関図）と `StoryTabs` の出し分け、相関図キャンバスのマウントは **`ProjectWorkspace.tsx`** に入れる |

**新しく認識したリスク（秘書へ）**: `accounts-and-server` の「切替コミット」（`persist` / `idbStorage` の
読み書きを外す）が相関図の本実装より先に入ると、**決定 2 の `merge` は不要になり、代わりに
決定 6 の Prisma 受け皿 ＋ Server Action 側の実装が必要になる**。
秘書決裁 R-1 は「(a) ローカル版に先に載せる」なので順序としては相関図が先だが、
**2 つの本実装が同じ週に走っているので、切替の直前に相関図の進捗を確認すること。**

---

### 付録 A. spec 6 章「旧 JSON の読み込み」9 行の実装対応表

| # | spec の要求 | 実装（`normalizeProject` 系） |
| --- | --- | --- |
| 1 | 関係の配列が無い / 不正 → **空配列** | `arr(source.relationships)` が非配列を `[]` に落とす（既存の `arr` がそのまま効く） |
| 2 | グループの配列が無い / 不正 → **空配列** | `arr(source.characterGroups)` |
| 3 | ノード座標が無い → **未設定** | `readNodePosition` が `undefined` を返す → **キーを作らない**（条件付きスプレッド `...(pos ? pos : {})`） |
| 4 | 座標が片方だけ → **両方とも未設定** | `readNodePosition` が `x !== undefined && y !== undefined` を要求する |
| 5 | 座標が数値でない / `NaN` / `Infinity` → **未設定** | `num()` の `Number.isFinite` が弾く（`NaN` / `±Infinity` / 文字列 / `null` すべて） |
| 6 | `direction` が既知の 3 値でない → **`forward`** | `isDirection(source.direction) ? source.direction : "forward"`（**`as` を使わない**） |
| 7 | `fromId` / `toId` が既知のキャラ id でない → **その関係を捨てる** | `knownCharacterIds.has(fromId) && knownCharacterIds.has(toId)` で `filter`（`normalizeScene` の流儀と同じ） |
| 8 | `fromId === toId`（自己ループ）→ **その関係を捨てる** | 同じ `filter` の中で `fromId !== toId` を要求 |
| 9 | キャラの `groupId` が既知のグループ id でない → **未所属**（キャラ自体は捨てない） | `knownGroupIds.has(groupId)` のときだけキーを作る。→ **決定 3-4 の処理順（グループを先に読む）が前提** |
| **+1** | 関係 / グループの `id` が無い | `str(source.id) || newId()`（既存の流儀） |
| **+2** | 関係 / グループの `id` が重複 | **既出なら `newId()` を振り直す**（重複エッジ id は「片方消したら 2 本消える」削除事故になる） |
| **+3** | 関係の要素がオブジェクトでない（文字列・`null` 等） | `isRecord` で弾いて捨てる |

`label` / `name` は `str(...)`（**空文字を許す**。spec 10-1 の要求どおり）。

### 付録 B. 往復（書き出し → 読み込み）の机上確認

| 経路 | 結果 |
| --- | --- |
| 現行版で書き出した**旧 JSON**（相関データ無し）を新版で読む | **壊れない。** 全キャラが既定位置に並び、関係 0 本・グループ 0 件になる（spec の「正常な初期状態」）。エラーも警告も出さない |
| 新版で書き出した JSON を新版で読む（同 id・上書き） | **落ちない。** 座標・関係・グループ・所属がすべて復元される |
| 新版で書き出した JSON を新版で読む（`withFreshIds` 経路） | **落ちない。** ただし[決定 4-2](#4-2-withfreshids-の張り替えここを落とすと静かに壊れる) の張り替えを実装した場合に限る。**id はすべて変わるが、指す人物は同じ** |
| 手で壊した JSON（座標が文字列 / `direction` が `"left"` / `fromId` が存在しない） | **落ちない。** 付録 A のとおり既定値に落ちるか、その要素だけ捨てられる |
| **新 JSON を旧版（`local-final` 相当）が読む** | **⚠ 相関データが黙って落ちる。** `normalizeProject` は既知のフィールドしかコピーせず、`normalizeCharacter` も `id` / `name` / `role` / `note` / `color` しか拾わないため（企画部の確認どおり・現物コードで再確認済み）。**旧版で読み込み → 編集 → 書き出しをすると相関が失われる**。企画部が受容済みだが、これは**本フィーチャで唯一の「往復で落ちるもの」**なので隠さず記録する |
| **新版で作った相関データを、旧版で IndexedDB 経由で開く** | **落ちない（version を上げない場合に限る）。** `persist` の既定 `merge` は保存済みオブジェクトをそのまま展開するので、旧版が知らないキー（`relationships` / `x` / `y` / `groupId`）も**オブジェクトに残る**。旧版は触らないので保存し直しても残る。→ [決定 2](#決定-2-永続化storage_key--version--migrate--partialize) で `version` を上げない**もう 1 つの利点**。<br>**ただし**旧版でキャラクターを削除すると相関の掃除が走らないため、**幽霊エッジが残る**。これは新版側の描画フィルタ（決定 4-3）と再読み込み時の正規化が吸収する |

**本文・件数・階層・ステータス・サムネイルは、どの経路でも落ちない。**

### 付録 C. ストアの公開 API（本実装の契約）

**すべて `editProject` 経由**（`updatedAt` を進める）。単一ストアのまま、操作を 7 つ足す。

```ts
// 座標 — ドラッグ終了時にだけ呼ぶ (決定 2-6)
moveCharacterNode: (projectId: string, characterId: string, x: number, y: number) => void;
// 所属 — undefined で未所属に戻す
setCharacterGroup: (projectId: string, characterId: string, groupId: string | undefined) => void;

addRelationship:    (projectId: string, fromId: string, toId: string) => string | undefined;
updateRelationship: (projectId: string, relationshipId: string,
                     patch: Partial<Pick<Relationship, "label" | "direction">>) => void;
deleteRelationship: (projectId: string, relationshipId: string) => void;

addCharacterGroup:    (projectId: string) => string | undefined;
updateCharacterGroup: (projectId: string, groupId: string,
                       patch: Partial<Pick<CharacterGroup, "name">>) => void;
deleteCharacterGroup: (projectId: string, groupId: string) => void;   // 所属キャラの groupId を外す
```

- `addRelationship` は **`fromId === toId` を弾く**（`undefined` を返す）。自己ループはデータとして持たない。
- `updateRelationship` の `patch` を **`label` / `direction` に限定**する。
  `fromId` / `toId` の付け替え（React Flow の reconnect 相当）は **v1 スコープ外**（spec 14）。
  必要になったら spec を更新してから足す。
- 追加系が id を返すのは既存の流儀（呼び出し側が直後に開く / 選択するため）。
- **既存の `deleteCharacter` を拡張する**（決定 4-1）。新しい操作を足すのではない。

### 付録 D. 企画部 / 秘書への差し戻し

| # | 内容 | 判断してほしいこと |
| --- | --- | --- |
| ~~**D-1**~~ | ~~`accounts-and-server` のカスケード図に 1 行足りない~~ → **2026-08-04 解消。** 同チケットの決定 3 のカスケード図に `Relationship` / `CharacterGroup` と **`SetNull` の辺**を追記済み | 対応不要 |
| ~~**D-2**~~ | ~~同チケットの付録 A / 付録 B に追記が要る~~ → **2026-08-04 解消。** 付録 A に **5 行**（`Character.x` / `.y` / `.groupId` / `Project.relationships` / `.characterGroups`）、付録 B に **`order ASC` での書き出しと `createMany` 5 本 → 7 本**（実行順 `characterGroups` → `characters` → `relationships`）を追記済み | 対応不要 |
| **D-3** | **相関データの件数上限（サーバ版）が未定**。企画部の申し送りどおり差し戻す。**v1（ローカル版）では上限を設けない**という spec 6 章の決定は動かさない。<br>**dev からの材料（決定ではない）**: キャラクター上限 100 に対し、関係は実用上ふつう数十〜数百本（完全グラフなら 4,950 本）。DB の 1 行は 100 バイト程度で、上限を 500 本にしても 50 KB / 作品。**容量ではなく「図として読めるか」が律速** | `accounts-and-server` spec 7 章の上限表に「関係 N / 作品」「グループ M / 作品」の行を足すこと。**値は企画が決める**（無料枠の実値は依然未確認・同 spec Q3） |
| **D-4** | **キャラクター / シーンの id 重複は既存の潜在問題**（手編集 JSON で作れる。`filter(x => x.id !== id)` が 2 件消す）。本チケットでは**関係とグループの id だけ**一意化する（付録 A +2）。既存分に手を広げない | 既存分も直すかは別チケット。優先度は低い（`dev/tech-debt/` 相当だが、本チケットに書けと指示があるためここに残す） |
| **D-5** | ~~キャラクター削除の確認文言の更新が必要~~ → **2026-08-04 解消**。design の UI 仕様 13 章で確定文言（関係の件数を出す形）が示された | 対応不要。本実装で掃除処理と同じコミットで反映する |
| **D-6**（design へ） | **要件 ⑮「ズーム倍率を問わず当たり判定 44×44 スクリーン px」は、最小ズーム 0.3 では幾何的に成立しない。** 既定配置の縦ピッチは論理 120px ＝ zoom 0.3 で**スクリーン 36px** なので、44px の判定は必ず隣と重なる（ui-spec 8-2 ③ は「作者が密着させて置いた場合だけ重なる」としているが、**既定配置のままでも重なる**）。**方式に依存しない**（React Flow でも自前でも同じ） | (a) 「重なったら後勝ち（誤タップしても選択が変わるだけ）」という design 自身の結論をそのまま最小ズームにも適用してよいか、(b) それとも縮小表現の帯域では 44px 保証を降ろす（見た目どおりの判定にする）か。**dev は (a) で実装できる**ので、本実装はブロックしない |

### 付録 E. 社長へ確認したいこと

- ~~**E-1**~~ → **2026-08-04 回答済み: 承認。** `@xyflow/react`（MIT）の依存追加が認められ、
  **実装方式は React Flow で確定**。ただし条件が 2 つ付いた:
  1. **`npm install` は本実装の着手時にまとめて打つ**（並行セッションが `package-lock.json` を
     触っている最中のため、いま打たない）
  2. **本実装の着手は `accounts-and-server` が一段落してから**
  → 自前 SVG の案は不採用。ただし決定 5-4 のとおりデータ層は方式非依存なので、
  U-3 / U-8（実機・SSR）で破綻した場合の退路は残っている。
- **E-2（要協力・本実装の完了前）**: **実機（iPhone）での確認**。
  ノードのドラッグとキャンバスのパンを取り違えないか、ピンチズームが効くか（U-3）。
  ここが通らなければ方式を変える判断になるため、**実装の早い段階で 1 回見てほしい**。
- **E-3（報告）**: **`persist` の `version` は上げない**方針にした。
  上げると、切替前コミット（`local-final`）に戻したときに**作品が消える**ためです（決定 2-1）。
  この性質は相関図に限らず今後も効くので、**永続化の version は今後も安易に上げない**方針とする。

---

## 引き継ぎ

### 企画部 → 開発部（2026-08-04・spec 確定）

**① 背景**

相関図の仕様が確定し、**このチケットのゲートは開いた**。本フィーチャは
**既存フィールドの意味を一切変えず、追加だけ**で成立する設計になっている。
それでも `normalize*` への追加漏れ・`withFreshIds` の張り替え漏れ・削除時の掃除漏れは
いずれも**静かなデータ消失**になるため、本チケットが本実装より先に置かれている。

**② 成果物パス**

- [planning/specs/2026-08-04-character-relationship-graph-spec.md](../../planning/specs/2026-08-04-character-relationship-graph-spec.md)（本稿・確定）

**③ 開発部の具体アクション（企画が要求する内容）**

企画が要求するのは以下。**フィールドの意味と必須 / 任意は動かさない。型の分割・置き場所・
永続化の実装方法（`version` / `migrate` / Prisma のテーブル構成）は dev の決定**。
詳細は spec 10 章。

| 型 | フィールド | 必須 / 任意 |
| --- | --- | --- |
| 新規 `Relationship` | `id` / `fromId` / `toId` / `label` / `direction`（`"forward" \| "both" \| "none"`） | すべて必須（`label` は空文字を許す） |
| 新規 `CharacterGroup` | `id` / `name` | すべて必須（`name` は空文字を許す） |
| 既存 `Character` に追加 | `x` / `y` / `groupId` | すべて**任意** |
| 既存 `Project` に追加 | `relationships` / `characterGroups` | 読み込み時に無ければ**空配列** |

企画部が**コードを読んで確認した事実**（dev の作業に直結するもの）:

1. **`io.ts` に数値を安全に読むヘルパが無い。** 現在あるのは `str` / `isRecord` / `arr` の
   3 つだけ。座標を読むには同じ語彙で `num` 相当（`typeof v === "number" && Number.isFinite(v)`）
   を足す必要がある。**`as` で通さないこと。**
2. **`toExportJson` / `downloadProject` は `project` をそのまま包むだけ**なので、
   相関データを `Project` 配下に置く限り**書き出し側の変更は不要**。
3. **新 JSON を旧版が読むと相関データは黙って落ちる。** `normalizeProject` は
   `createProject` の既定値をベースに既知フィールドだけをコピーし、`normalizeCharacter` も
   `id` / `name` / `role` / `note` / `color` しか拾わないため、未知のキーは例外にならず消える。
   **企画部はこれを受容する判断をしている**（旧版は読み書き専用として扱う運用が
   `accounts-and-server` spec 安全弁 4 で既にある）が、**前方互換の判定として本チケットに記録すること**。
4. **キャラクター削除の確認文言を更新する必要がある。** 現行は「各シーンからも外れます」
   （[CharacterPanel.tsx](../../../../src/components/CharacterPanel.tsx)）だが、相関図の関係も
   消えるようになる。文言自体はデザイン部の管轄だが、**掃除処理とセットで漏らさないこと**（spec 11 章）。

企画部の**判断材料**（dev の決定を拘束しない）: 座標を `Character` 直下に置くと
`withFreshIds` と `deleteCharacter` が既存経路のままで済み、「キャラは居るのに座標が無い /
座標だけ残る」という不整合が構造的に発生しない。別配列に分けると不整合の種類が 2 つ増える。

**④ 決定待ち**

- 社長の Q1〜Q6（spec 17 章）。**すべて既定があるので待たずに着手してよい**。
  dev に効くものは無い（いずれも UI / スコープの質問）。
- **相関データの件数上限は本稿では決めていない**（根拠となる無料枠の実値が未確定のため。
  `accounts-and-server` spec Q3）。**サーバ版に載せる段で同 spec の上限表に追記が要る**ので、
  5（Prisma 側の受け皿）を設計する際に企画部へ差し戻すこと。
- 実装方式（React Flow / 自前 SVG）は**社長が dev / design に委任**。結論は本チケットに置く。

**⑤ 次フェーズへの開放質問（spec 16 章「未確認」より dev が担当するもの）**

1. 相関データを既存の Prisma スキーマ草案にどう載せるか（干渉点 I-1）。
   後から足すと DB マイグレーションが増えるため、**ローカル版に載せる段で受け皿も設計する**
2. `EXPORT_VERSION = 1` 据え置きのまま相関データを足せるか（企画は「追加のみなので据え置ける」と
   判断しているが、**最終判定は dev**）
3. キャンバス描画が、シーン数百件規模の既存ボードと同居して体感を損なわないか
4. 375px でノードのドラッグとキャンバスのパンを取り違えないか（design と共同で実機確認）
