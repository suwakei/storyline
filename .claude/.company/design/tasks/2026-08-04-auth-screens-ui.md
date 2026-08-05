# アカウント制移行で増える画面の UI 設計

- 作成日: 2026-08-04
- ステータス: **完了**（2026-08-04 デザイン部）
- 優先度: **高**
- モデル: sonnet
- 依頼元: 社長（承認済み）
- 前提: [planning/specs/2026-08-04-accounts-and-server-spec.md](../../planning/specs/2026-08-04-accounts-and-server-spec.md)（正本・確定済み。決定は覆さない）
- 本稿ファイル: [design/ui-specs/2026-08-04-auth-screens.md](../ui-specs/2026-08-04-auth-screens.md)
- ワイヤーフレーム: [design/wireframes/2026-08-04-auth-screens.md](../wireframes/2026-08-04-auth-screens.md)
- 引き継ぎ先: [dev/tasks/2026-08-04-accounts-and-server-impl.md](../../dev/tasks/2026-08-04-accounts-and-server-impl.md)

## 概要

spec の「他部署への引き渡し」表（15 章）がデザイン部の未設計項目として挙げた 5 点の UI を設計する。
社長の追加確定事項（2026-08-04）: ランディングページは作らない（`/login` がタイトル画面を兼ねる、
企画部の決定 1 を維持）。ログアウトボタンをアカウントメニュー内に明示的に置く。

## スコープ（5 点）

1. `/login`（タイトル画面兼用・ログイン失敗表示・アカウント削除完了表示）
2. アカウントメニュー（`/` ヘッダ。モバイル＝下シート、PC＝ポップオーバー）
3. アカウント削除の確認モーダル
4. 作品削除の確認モーダル化（`window.confirm` → `Modal`）
5. 保存中 / 保存失敗の表示（spec 1-2 節「保存で書く手を止めない」の UI 化）

追加の宿題: サムネイル縮小長辺 640px の妥当性検証、前回チケットが未対応のまま残した
44px 化 2 件（`CharacterPanel` の削除ボタン・色スウォッチ、`StoryTabs` の「＋ストーリー」）の判断。

## 完了条件

- [x] 5 点すべてについて UI 仕様を `design/ui-specs/2026-08-04-auth-screens.md` に記載
- [x] 375px 基準のワイヤーフレームを `design/wireframes/2026-08-04-auth-screens.md` に記載
- [x] タップ領域 44×44px 以上を各要素で明記（意図的に対象外とした箇所は理由を明記）
- [x] 既存プリミティブ（`Button`/`Modal`/`Drawer`/`EmptyState`/`Select`/`size="touch"`）で
      足りるか確認し、足りないものだけを最小限追加する設計にした
- [x] 生の色ユーティリティを使わず、既存セマンティックトークンの範囲で成立させた
- [x] 縮小長辺 640px の妥当性を検証し結論を出した
- [x] 44px 化の宿題 2 件（CharacterPanel・StoryTabs）を判断した
- [x] dev の実装チケットへ `## 引き継ぎ` を記載

## 結果サマリ

1. **`/login`**: `bg-surface` カード（`max-w-sm`、画面中央）に「storyline」大見出し + 既存
   `metadata.description` + `Google でログイン`（`w-full min-h-12`、`size="touch"` は使わず
   直接クラス指定）+ 許可リスト注記。エラー（許可リスト外 / その他 OAuth 失敗の 2 分類）と
   削除完了通知は新設 `Banner`（`tone="danger"` / `"neutral"`）で同一画面に表示。ロゴ画像・
   イラストは追加しない
2. **アカウントメニュー**: `/` ヘッダに頭文字アバターのトリガー（Google プロフィール画像は
   使わない）。モバイルは下シート（`bg-black/30` スクリム + `rounded-t-2xl`）、PC はヘッダ右
   ポップオーバー（透明クリックキャッチャー、暗転無し）。中身は共通（メール表示 / JSON読み込む /
   ログアウト / 区切り線 / アカウントを削除）。危険操作は区切り線 + `text-danger` の二重表現で
   区別。メニュー行・トリガーは `Button`/`IconButton` の基底クラス（`justify-center`/
   `rounded-md`）が安全に上書きできないため素の `<button>` で実装
3. **アカウント削除確認モーダル**: 既存 `Modal` で実装。件数表示 + 「すべての作品を書き出す」
   （既存 `downloadProject` の複数回呼び出し。ZIP 化するかはループ方式のブラウザ制限を実機
   確認したうえで開発部が判断）+ チェックボックスゲート（行全体 44px、チェックボックス自体は
   小さいまま）+ 削除は危険色。通信失敗時はモーダルを閉じずモーダル内に danger Banner + 再試行
4. **作品削除の確認モーダル化**: 既存 `window.confirm` を `Modal` に置き換え。件数
   （既存 `projectStats` を再利用、新規計算不要）+ 「この作品を書き出す」を追加。チェックボックス
   ゲートは**付けない**（発生頻度・被害範囲の違いから、アカウント削除ほどの摩擦を課さない判断）
5. **保存中 / 保存失敗の表示（最重要・最も難所）**: 集約 1 個の `saveStatus`
   （`"saving" | "saved" | "error"`）+ `retrySave()` をストアに要求。**構造上の落とし穴**として
   Drawer が `fixed inset-0 z-50` で画面全体を覆うため、ページヘッダにだけ置くとシーン編集中
   （最も保存が起きる瞬間）にインジケータが見えなくなる。対策として `SaveStatusIndicator` を
   1 個作り、ページヘッダと `Drawer` の `title` スロットの両方に差し込む（`Drawer` 本体は無改修、
   `title` が `ReactNode` である既存の柔軟性を利用）。失敗時は「保存できませんでした」を
   `text-danger` のタップ可能ラベルで表示しタップで再試行、詳細文言は `title`/`aria-label` に
   格納。アプリ内遷移（「← 一覧」等）は `beforeunload` では捕まらないため、リンクの `onClick` で
   個別に確認を挟む必要があることを明記

## 追加の判断（宿題）

- **サムネイル縮小長辺**: 640px → **800px に引き上げ**（spec が許容する上限ちょうど）。
  根拠: アプリ内で最も大きく表示される場所は PC カンバンカード（288px、2倍密度で576px必要）では
  なく `SceneEditor` のフルサイズプレビュー（Drawer 内 `aspect-video w-full`、
  2倍密度で686〜832px必要）で、現行640pxは既にこれに対して不足している。800pxならほぼ
  カバーでき、spec の容量見積り（1枚約160KB、ユーザ上限で約625枚）も崩れない
- **`CharacterPanel` 削除ボタン**: **44px 化する**（`size="touch"` 追加のみ。前回チケットが
  フッターボタンだけを対象にしており、行内の個別ボタンが漏れていた）
- **色スウォッチ（20px）**: **44px 化しない**。低頻度操作・誤タップの実害が小さい・
  キャラクター上限100人での一望性への影響が大きい、の3点が理由。`gap-1`→`gap-1.5`のみ緩和
- **`StoryTabs`「＋ストーリー」**: **44px 化する**（`size="touch"` 追加）。同チケットで既に
  44px化済みの「＋シーンを追加」「＋シークエンスを追加」と構造的に同じ「新規追加」操作であり、
  これだけ除外する理由が無い

## 引き継ぎ

- 引き継ぎ先: [dev/tasks/2026-08-04-accounts-and-server-impl.md](../../dev/tasks/2026-08-04-accounts-and-server-impl.md)
- 背景: spec（企画部確定稿）15 章がデザイン部の未設計項目として挙げた 5 点 + 社長の追加確定
  （ランディング無し・`/login` がタイトル画面兼用・ログアウト明示配置）を受けて UI を設計した
- 決めたこと: 上記「結果サマリ」5 点 + 「追加の判断」の通り。詳細な理由づけは
  [design/ui-specs/2026-08-04-auth-screens.md](../ui-specs/2026-08-04-auth-screens.md)、
  レイアウトは [design/wireframes/2026-08-04-auth-screens.md](../wireframes/2026-08-04-auth-screens.md) を参照
- dev にやってほしいこと:
  1. `ui.tsx` に `Banner`（`tone="danger" | "neutral"`）を新設し、`page.tsx` の既存エラー表示
     コピペを置き換える（ui-spec 1 章・9 章）
  2. `src/components/AccountMenu.tsx` を新設（`/` ヘッダから「JSONを読み込む」ボタンを除去して
     ここに吸収。モバイル下シート / PC ポップオーバーの CSS 出し分け、詳細は ui-spec 3 章）
  3. `src/components/SaveStatusIndicator.tsx` を新設し、`/projects/[projectId]` ページヘッダと
     `SceneEditor`/`CharacterPanel` の `Drawer` `title` の両方に差し込む（ui-spec 6 章。
     **Drawer が画面全体を覆うため片方だけでは編集中に見えなくなる落とし穴に要注意**）
  4. アカウント削除・作品削除を `Modal` ベースの確認フローに置き換える（ui-spec 4-5 章）。
     いずれも通信失敗時はモーダルを閉じず再試行できる状態に留める
  5. `saveStatus: "saving" | "saved" | "error"` と `retrySave()` をストアの公開 API に追加する
     （粒度は「編集した1件」で保存するが、表示は集約1個。優先順位 `error > saving > saved`）。
     ストア設計自体は本チケット（実装）側・[store-builder](../../../agents/store-builder.md) の
     領分
  6. アプリ内遷移（`Link href="/"` の「← 一覧」等）が `saveStatus` が `saving`/`error` のときは
     `onClick` で確認を挟むこと（`beforeunload` は SPA 内遷移を捕まえない）
  7. `CharacterPanel` の削除ボタン・`StoryTabs` の「＋ストーリー」に `size="touch"` を追加
     （宿題の判断を反映。色スウォッチは意図的に対象外なので触らない）
  8. `src/lib/image.ts` の `MAX_EDGE` を 640 → 800 に変更（`QUALITY` は変更不要）
- 未確定のまま dev に投げている点（ui-spec 10 章に集約）:
  - Auth.js v5 の実際のエラーコード列挙・クエリパラメータ名（未確認。UI は「許可リスト外 / その他」
    の2分類だけ持てば足りる設計にしてある）
  - アカウント削除モーダルの件数（作品/シーン/画像）の取得方法（サーバ設計次第）
  - 「すべての作品を書き出す」の実装方式（複数ダウンロードのループ vs ZIP）。ループ方式は
    ブラウザの複数ダウンロードブロックを実機確認すること
- 画面確認について: Claude 側では `npm run dev` を起動しない運用のため、実装後は**社長による
  実機確認**（PC ブラウザ + 実機スマホ、ライト/ダーク両方）を依頼し、その結果を持ってデザイン部が
  レビューする
