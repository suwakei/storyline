# スマホ表示（縦リスト）の実装

- ステータス: **完了**（2026-08-04 開発部。実装・静的検証まで。社長の実機確認待ち。下記「実機確認待ち」チェックリストと「引き継ぎ」参照）
- 優先度: **高**
- モデル: sonnet（更新: opus → sonnet。理由は下記「モデル選定」参照）
- 起票日: 2026-08-04
- 更新日: 2026-08-04（デザイン部の UI 仕様確定を反映。作業内容・完了条件を具体化）
- 依頼元: 社長（デザイン部 [2026-08-04-mobile-vertical-list-ui.md](../../design/tasks/2026-08-04-mobile-vertical-list-ui.md) 経由）
- 前提: [design/tasks/2026-08-04-mobile-vertical-list-ui.md](../../design/tasks/2026-08-04-mobile-vertical-list-ui.md)（完了）
- UI 仕様: [design/ui-specs/2026-08-04-mobile-vertical-list.md](../../design/ui-specs/2026-08-04-mobile-vertical-list.md)
- ワイヤーフレーム: [design/wireframes/2026-08-04-mobile-vertical-list.md](../../design/wireframes/2026-08-04-mobile-vertical-list.md)
- 決裁記録: [2026-08-04-accounts-and-server-decisions.md](../../secretary/decisions/2026-08-04-accounts-and-server-decisions.md)

> **モデル選定**: 起票時点では「指のドラッグとスクロールの取り合い」を含む可能性があり
> opus 相当としていたが、デザイン部が並べ替えを**上下移動ボタン方式**（タッチドラッグ不採用）に
> 確定したため、DnD 要素は無くなった。起票時のメモ通り sonnet に落とす。

## 概要

デザイン部が固めた縦リスト仕様を実装する。サーバ移行と独立して出せるので、
これだけ先に入れればローカル版のままスマホで読める状態になる。

**2026-08-04 の前提変更**: 社長の利用想定が「スマホがメイン」に更新された。本チケットは
「付加的なスマホ対応」ではなく**メイン利用形態を成立させる作業**であり、サーバ移行と同格の
最優先ラインに置く。サーバ移行はブロッカー 3 件で止まりうるのに対し、こちらは前提が
デザイン部の UI 仕様のみなので、**最も早くユーザ価値が出る経路**でもある。

**PC とスマホの表現が競合したらスマホを優先する**（UI 仕様 §0・§7。実装中に判断に迷ったら
まず UI 仕様のこの章に戻ること）。

## スコープ

- 対象: `/projects/[projectId]` 画面のヘッダ・ストーリータブ・カンバン（→縦リスト）・
  シーン編集ドロワー・キャラクター管理ドロワー
- 対象外: 作品一覧 (`/`) — 既に `sm:grid-cols-2` で 375px 幅でも破綻しない
- 対象外: アカウント制・サーバ移行（別ライン）
- **`src/lib/` のデータモデル・型定義は変更不要**。`moveScene` / `moveSequence` など
  既存のストア関数だけで実装できる設計になっている（各タスクに明記）

## 作業

### 1. ブレークポイントの出し分け（`md` = 768px）

- `md` 未満で縦リスト、`md` 以上で既存カンバンを表示する
- **CSS のみで出し分ける**（`hidden md:block` / `md:hidden` のペア）。JS の `matchMedia`
  による条件分岐は使わない（SSR/CSR のハイドレーションミスマッチ回避。UI 仕様 §1）
- トレードオフとして両方の DOM が常にマウントされる。シーン数百件規模までは許容範囲という
  前提（[08-performance-optimization.md](../../../docs/02-development-docs/08-performance-optimization.md)）。
  体感が重い場合は `useMediaQuery` 的なフックへの切り替えを別チケットで検討する

### 2. 縦リスト本体（新規コンポーネント）

- `src/components/board/` 配下に新規ファイルを追加（命名は実装側判断。例:
  `MobileSequenceList.tsx` / `MobileSceneRow.tsx`）
- シークエンス見出し（アコーディオン、chevron ボタンで開閉、初期状態は全展開）+
  配下のシーン行。「すべて折りたたむ / すべて開く」トグルを画面上部に置く
- **折りたたみ状態はコンポーネントローカルな `useState`（`Set<sequenceId>` 等）**。
  ストアに保存しない・型定義に `collapsed` 等のフィールドを増やさない
- 折りたたみ時は見出しに「タイトル + 件数 + ステータス内訳のテキスト集計」
  （例:「プロット2・執筆中3・完了1」）を表示する。色付きミニバーは使わない
- シーン行のレイアウト・タップ対象の構造（行本体とボタン群を兄弟要素にし、
  `<button>` の入れ子を作らない — 見出しの `InlineText` も同様）は UI 仕様 §2・§3、
  ワイヤーフレーム B・C を参照
- **登場キャラクターは PC と同じ「色ドット + 名前」を維持する**（テキストのみへの
  簡略化はしない）。最大表示件数は 3 + `N` 件、`flex-nowrap` で折り返さない

### 3. 並べ替え（上下ボタン）

- シーン・シークエンスともにドラッグは実装しない。`▲ / ▼` の `IconButton`（44×44）で
  同一シークエンス内 / 同一ストーリー内のみを対象に前後入れ替える
- 実装は既存の `moveScene(projectId, storyId, sceneId, sequenceId, index ± 1)` /
  `moveSequence(projectId, storyId, from, from ± 1)` を呼ぶだけ。**ストア API の追加は不要**
- 境界（先頭/末尾）では対応するボタンを `disabled` にする
  （[StoryTabs.tsx](../../../src/components/StoryTabs.tsx) の「‹ / ›」と同じパターン）
- **PC のカンバン（`Board.tsx` / `SequenceColumn.tsx` / `SceneCard.tsx`）は変更しない**。
  ドラッグ実装に一切手を入れない

### 4. シークエンス跨ぎの移動（シーン編集ドロワー）

- [SceneEditor.tsx](../../../src/components/SceneEditor.tsx) に「所属シークエンス」の
  `<select>` を追加する（挿入位置は「ステータス」直後を推奨。最終判断は実装側）
- 選択すると即座に `moveScene(projectId, storyId, sceneId, 選んだ sequenceId, Number.MAX_SAFE_INTEGER)`
  相当で末尾に移動する（保存ボタンなし、他フィールドと同じ「選んだら即反映」の操作感）
- 選択肢は現在のシークエンスを除外。**シークエンスが 1 つしかない作品ではこの項目自体を
  非表示にする**
- `SceneEditor` は現状 `characters` しか受け取っていないため、`story`（または
  `sequences` と現在の `sequenceId`）を新しく props で渡す必要がある。呼び出し元
  ([app/projects/[projectId]/page.tsx](../../../src/app/projects/[projectId]/page.tsx)) の
  変更を伴う
- **この項目はブレークポイントに関わらず常時表示**（PC でも表示する。デザイン部の意図的な
  決定 — スマホ発の解決策を分岐させず PC にもそのまま展開する。UI 仕様 §5・§7）
- `<select>` 用の `Select` プリミティブが [ui.tsx](../../../src/components/ui.tsx) に無いため
  新設を検討する（`TextInput` と同じ `INPUT_CLASS` を使い、`min-h-11` でタップ領域を
  44px 以上に確保する）

### 5. タップ領域の拡張（44×44px、`md` 未満のみ）

対象は新規要素だけでなく、以下の**既存プリミティブ利用箇所**も含む（UI 仕様 §6・§8）:

- ヘッダの「キャラクター」「書き出す」（`app/projects/[projectId]/page.tsx`）
- ストーリータブの「‹ / › / ✕」（`StoryTabs.tsx`）
- シーン編集ドロワー / キャラクター管理ドロワーのフッターボタン
  （削除・複製・閉じる・＋追加）

実装方法は開発部の裁量（推奨: `ui.tsx` の `Button` / `IconButton` に `size` prop を足し、
`h-11 w-11 md:h-7 md:w-7` のようにレスポンシブに切り替える）。**`md` 以上のサイズは
変更しない**（PC の情報密度を維持するため）。カンバン専用コンポーネント
（`Board.tsx` 以下）は `md` 未満で非表示になるため対象外でよい。

### 6. ドキュメント更新

コード変更に伴い、古くなるドキュメントは同じコミットで更新する
（[.claude/CLAUDE.md](../../../CLAUDE.md) 「docs 参照ルール」）:

- [01-architecture-design.md](../../../docs/02-development-docs/01-architecture-design.md):
  `components/board/` に追加する新規コンポーネントの記載
- [06-ui-design.md](../../../docs/02-development-docs/06-ui-design.md): レスポンシブ方針
  （`md` ブレークポイント・タップ領域 44px・CSS のみでの出し分け）を新しい章として追記

## 完了条件

Claude 側は `npm run dev` を起動できないため、レンダリング結果の目視・実操作が要る項目は
未チェックのまま残している（下記「Claude 側検証済み」「実機確認待ち」の 2 群に分けた）。

### Claude 側検証済み（コードレビュー + `build`/`lint`/`tsc` で確認）

- [x] `md`（768px）を境に縦リスト⇄カンバンが切り替わる実装になっている。切り替えは
      `hidden md:block` / `md:hidden` の CSS ペアのみで実現し（`matchMedia` 等の JS 分岐は
      無し）、両方の DOM が常にマウントされる構造になっている
      （[page.tsx](../../../../src/app/projects/[projectId]/page.tsx)）
- [x] 縦リストの全操作要素（chevron・▲▼✕・シーン行の開くボタン・トグル・追加ボタン）が
      `size="touch"`（`IconButton`: `h-11 w-11`、`Button`: `min-h-11`）を使っており
      44×44px 以上になる
- [x] 5 章の既存プリミティブ利用箇所（ヘッダの「キャラクター」「書き出す」・StoryTabs の
      「‹ / › / ✕」・両ドロワーフッターの削除/複製/閉じる/＋追加）も `size="touch"` を
      適用済み。`md` 以上は `md:h-7 md:w-7` / `md:min-h-0` で既存サイズに戻る実装
- [x] シーン・シークエンスの上下ボタンは境界（先頭/末尾）で `disabled` になるコードになっている
      （`disabled={index === 0}` / `disabled={index === length - 1}` パターン）
- [x] シークエンスが 1 つの作品では「所属シークエンス」フィールドが出ない
      （`sequences.length > 1` の条件分岐で確認済み、[SceneEditor.tsx](../../../../src/components/SceneEditor.tsx)）
- [x] 「すべて折りたたむ / すべて開く」の折りたたみ状態はコンポーネントローカルな
      `useState<Set<sequenceId>>` のみで実装しており、ストアへの書き込みは無い
      （リロードで全展開に戻ることがコード上保証されている）
- [x] 6 章のドキュメント更新が同じ変更セットに含まれている
      （[01-architecture-design.md](../../../docs/02-development-docs/01-architecture-design.md) /
      [06-ui-design.md](../../../docs/02-development-docs/06-ui-design.md)。ついでに
      [07-drag-and-drop.md](../../../docs/02-development-docs/07-drag-and-drop.md) にも
      「このドキュメントは `md` 以上が対象」の一文を追記）
- [x] `npm run build` / `npm run lint` / `npx tsc --noEmit` が通る

### 実機確認待ち（社長に依頼、下記「引き継ぎ」参照）

- [ ] **幅 375px で横スクロールが発生しない（ボードを含む全画面。ストーリータブの
      横スクロール帯は意図的な例外）**
- [ ] 縦リストでシーンの並べ替え（上下ボタン）とシークエンス跨ぎの移動
      （シーン編集ドロワーの「所属シークエンス」）が実際に操作できる
- [ ] PC 幅（`md` 以上）では従来のカンバン表示・ドラッグ操作が一切変わっていないこと
      （[07-drag-and-drop.md](../../../docs/02-development-docs/07-drag-and-drop.md) §6 の
      既存 7 シナリオを PC 幅で再確認する）
- [ ] ライト / ダーク両方の配色で確認する（`prefers-color-scheme`）
- [ ] **ユーザによる実機（スマホ）確認** — 社長が `npm run dev` を起動し実機（または 375px に
      狭めたブラウザ幅）で操作した結果を確認するまで完了にしない。新規シナリオ
      （並べ替えボタン・跨ぎ移動・折りたたみ）と PC 幅での既存シナリオの両方を依頼する

## 引き継ぎ内容の要点（デザイン部より）

- **タッチでの長押しドラッグは採用しない。** 理由（詳細は UI 仕様 §4）:
  (a) タッチでのドラッグ起動判定は「距離」でなく「長押し(delay)」が要り、押した瞬間に
  動く PC 体験と乖離する (b) 縦リストは**ページ全体がスクロールコンテナ**であり、
  画面外のシークエンスへ運ぶには自動スクロール実装が要ってコストが跳ね上がる
  (c) D&D は「storyline で最も壊れやすい箇所」であり、スマホが主戦場になった以上
  不具合の影響ユーザ数が最大になるため信頼性を優先した (d) 44×44 のタップ領域・
  スクリーンリーダー操作のどちらもボタン方式の方が素直に満たせる
  （ドラッグの a11y 対応 = dnd-kit `KeyboardSensor` は現状 PC 版でも未実装）
- 上下ボタン・跨ぎ移動はいずれも既存のストア関数だけで実装できる設計になっている。
  **`src/lib/` に新しい関数や型フィールドを増やす必要は無い**
- `ui.tsx` の `Button` / `IconButton` の**既定サイズは変えない**こと。PC のカンバンは
  情報密度の高さが価値なので、そこだけは意図的にスマホ基準の例外として扱っている
  （縦リストの対象は `md` 未満でしか表示されないため矛盾しない）
- 実装後はデザイン部にレビューを依頼すること（動いているものを見て判断する方針のため、
  スクリーンショットまたは実機確認の共有があるとスムーズ）

## 実装メモ（開発部より、2026-08-04）

`src/lib/` は変更していない（`moveScene` / `moveSequence` のみ利用）。変更・新規ファイル:

- 新規: [MobileSequenceList.tsx](../../../../src/components/board/MobileSequenceList.tsx)
  （縦リスト本体。折りたたみ状態は `useState<Set<sequenceId>>`、初期値は空 = 全展開）
- 新規: [MobileSceneRow.tsx](../../../../src/components/board/MobileSceneRow.tsx)
  （シーン行。開くボタンと ▲/▼ は兄弟要素、`<button>` の入れ子はしていない）
- 変更: [ui.tsx](../../../../src/components/ui.tsx) — `Button` / `IconButton` に
  `size?: "md" | "touch"` を追加（`touch` は md 未満で 44px、md 以上は既存サイズに復元）。
  `Select` プリミティブを新設（`TextInput`/`TextArea` と同じ `INPUT_CLASS` を共有）
- 変更: [SceneEditor.tsx](../../../../src/components/SceneEditor.tsx) — `sequenceId` /
  `sequences` を新しい props として受け取り、「ステータス」直後に「所属シークエンス」の
  `Select` を追加（`sequences.length > 1` のときだけ表示、選択で即
  `moveScene(..., 選んだ id, Number.MAX_SAFE_INTEGER)` を呼び末尾へ移動）。フッター 3 ボタンに
  `size="touch"` を追加
- 変更: [page.tsx](../../../../src/app/projects/[projectId]/page.tsx) — `<main>` 内を
  `hidden md:block`（`Board`）/ `md:hidden`（`MobileSequenceList`）の 2 つの `div` に分割。
  `SceneEditor` に `sequenceId={openScene.sequence.id}` /
  `sequences={activeStory.sequences}` を追加で渡す。ヘッダの 2 ボタンに `size="touch"` を追加
- 変更: [StoryTabs.tsx](../../../../src/components/StoryTabs.tsx) — 「‹ / › / ✕」に
  `size="touch"` を追加
- 変更: [CharacterPanel.tsx](../../../../src/components/CharacterPanel.tsx) — フッターの
  「＋ 追加」に `size="touch"` を追加
- docs: [01-architecture-design.md](../../../docs/02-development-docs/01-architecture-design.md)
  に新規コンポーネントとレスポンシブ出し分けの説明を追記、
  [06-ui-design.md](../../../docs/02-development-docs/06-ui-design.md) に「8. レスポンシブ方針」
  章を新設、[07-drag-and-drop.md](../../../docs/02-development-docs/07-drag-and-drop.md) 冒頭に
  「このドキュメントは `md` 以上が対象」の一文を追加

### スコープ外にしたもの（判断の記録）

- CharacterPanel 内の個別キャラクター行の「削除」ボタン・色スウォッチ（`h-5 w-5`）は
  UI 仕様・チケットの列挙（ヘッダ / StoryTabs / 両ドロワー**フッター**）に含まれていないため
  そのまま。将来「キャラクター管理ドロワーの本文側も 44px 化する」という話が出たら別チケットで
  判断してほしい（現状は据え置きが仕様どおり）
- StoryTabs の「＋ ストーリー」ボタン（ghost variant）も同様に列挙から外れているため
  タッチサイズ化していない

### 社長への依頼（実機確認）

1. `npm run dev` を起動し、ブラウザ幅を 375px 相当（または実機）に狭めて
   `/projects/<id>` を開く
2. 縦リストでシーンをタップ→開く、▲/▼で並べ替え、シーン編集ドロワーの
   「所属シークエンス」で別シークエンスへ移動、シークエンス見出しの折りたたみ・
   「すべて折りたたむ/開く」を一通り操作
3. 幅を 768px 以上に戻し、既存のカンバン（ドラッグ）が変わらず動くこと
   （[07-drag-and-drop.md](../../../docs/02-development-docs/07-drag-and-drop.md) §6 の
   7 シナリオ）を確認
4. OS のライト/ダーク設定を切り替えて両方の配色を確認
5. 問題なければデザイン部にもレビュー依頼（動いているものでの判断を推奨されている）
