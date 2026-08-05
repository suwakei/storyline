# アカウント制移行で増える画面 — UI 仕様

- 作成日: 2026-08-04
- 状態: 確定
- 参照チケット: [2026-08-04-auth-screens-ui.md](../tasks/2026-08-04-auth-screens-ui.md)
- ワイヤーフレーム: [2026-08-04-auth-screens.md](../wireframes/2026-08-04-auth-screens.md)
- 実装引き継ぎ先: [dev/tasks/2026-08-04-accounts-and-server-impl.md](../../dev/tasks/2026-08-04-accounts-and-server-impl.md)
- 前提仕様（正本・決定を覆さない）:
  [planning/specs/2026-08-04-accounts-and-server-spec.md](../../planning/specs/2026-08-04-accounts-and-server-spec.md)
  — 特に 1-2 章（保存で書く手を止めない）・3 章（`/login`）・8 章（退会）・11 章（画面一覧）
- 社長の追加確定（2026-08-04）: ランディングページは作らない（`/login` がタイトル画面を兼ねる）。
  ログアウトはアカウントメニュー内に明示的に置く

## 0. スコープと前提

対象は spec の「引き渡し先」表がデザイン部の未設計項目として挙げた 5 点。

1. `/login`（タイトル画面兼用・エラー表示・削除完了表示）
2. アカウントメニュー（`/` ヘッダ。モバイル＝下シート、PC＝ポップオーバー）
3. アカウント削除の確認モーダル
4. 作品削除の確認モーダル化（`window.confirm` → `Modal`）
5. 保存中 / 保存失敗の表示

**基準幅 375px、競合したらスマホ優先、タップ領域 44×44px 以上**（[06-ui-design.md](../../../docs/02-development-docs/06-ui-design.md) §8 と同じ運用）。作品画面（`/projects/[projectId]`）のヘッダには
アカウントメニューを置かない（spec 決定どおり、一望性優先で維持）。

対象外（spec が明示的にスコープ外とした事項はここでも設計しない）: ランディング / 紹介ページ、
利用規約・プライバシーポリシー、移行専用ウィザード、使用量ダッシュボード。

---

## 1. 既存プリミティブの再利用可否（先に確認）

[src/components/ui.tsx](../../../../src/components/ui.tsx) を確認した結果:

| プリミティブ | 今回の用途 | 判定 |
| --- | --- | --- |
| `Button` / `IconButton`（`size="touch"` 込み） | ログインボタン以外の大半のボタン | **そのまま使える** |
| `Modal` | アカウント削除・作品削除の確認 | **そのまま使える**（`role="dialog"` / Escape 済み） |
| `Field` / `TextInput` / `Select` | このチケットでは新規フォーム無し | 不要 |
| `EmptyState` | 作品 0 件時（spec 決定 5、既に確定済み） | **そのまま使える**。`action` に 2 個目のボタンを積むだけで済む（`ReactNode` なので複数ボタン対応済み） |
| `Drawer` | シーン編集・キャラクター管理（今回変更なし） | 直接は使わないが、**`title` prop が `ReactNode` なので保存状態インジケータを差し込める**（後述 6 章） |

**足りないもの（新規追加が要る）**:

| 追加するもの | 置き場所 | 理由 |
| --- | --- | --- |
| `Banner`（`tone="danger" \| "neutral"`） | `ui.tsx`（新規プリミティブ） | `/login` のエラー・削除完了通知、`/` の JSON 読み込み結果通知で使う。現状 `page.tsx` にコピペされている `<p className="border-danger/40 bg-danger/10 text-danger ...">` ([04-error-handling.md](../../../docs/02-development-docs/04-error-handling.md) の慣用パターン) を汎用化するだけで、新しい見た目は増えない |
| `AccountMenu` | `src/components/`（`ui.tsx` ではない） | ストア（`useStore`）を直接読むため。`ui.tsx` は props だけで完結する層という既存の layering ルール（[CLAUDE.md](../../../../CLAUDE.md) レイヤ分け表）に従う。中身は `Button`/`IconButton` を極力使うが、メニュー行は理由あって素の `<button>`（3 章末尾で説明） |
| `SaveStatusIndicator` | `src/components/`（同上） | 同じ理由でストア直読み。`Drawer` の `title` prop に差し込める形にする（6 章） |

`ui.tsx` に追加するのは `Banner` の 1 つだけ。**`Button` / `Drawer` / `Modal` 本体には手を入れない**
（後述するが、`Button` の `justify-center` / `IconButton` の `rounded-md` は `className` 追記での
安全な上書きができない — [06-ui-design.md](../../../docs/02-development-docs/06-ui-design.md) §2
が明記する「Tailwind はユーティリティの重複指定を後勝ちで解決しない」制約のため。メニュー行・
アバタートリガーはこの制約を踏んで素の `<button>` で組む）。

---

## 2. `/login`

### 2-1. 構成

タイトル画面を兼ねるが、**ロゴ画像・イラストは新規に作らない**（保守対象を増やさない方針）。
見た目の作り込みはタイポグラフィと余白、`surface` トークンのカード化だけで行う。

```
外枠: bg-bg 全面、中央寄せ (flex items-center justify-center min-h-dvh)
カード: bg-surface border border-line rounded-2xl shadow-sm p-8 w-full max-w-sm
  ├─ "storyline"          text-4xl font-bold tracking-tight text-center
  ├─ 説明文（1行）          text-muted text-sm text-center
  │   ("シナリオの時系列とキャラクターのつながりを整理するツール"
  │    = 既存 metadata.description をそのまま使う。新しいコピーを書かない)
  ├─ [Banner]（エラー or 削除完了。何も無ければ非表示）
  ├─ [ Google でログイン ]  primary, w-full, min-h-12（48px）
  └─ 注記                  text-muted text-xs text-center
      ("ログインできるのは許可されたアカウントのみです")
```

- PC でも同じカードを画面中央に置くだけ。PC 専用レイアウトは作らない（spec 3 章どおり）。
- カード幅は `max-w-sm`（384px）。375px 幅では左右に `px-4` 相当の余白が付けば収まる
- タイトルを `text-4xl font-bold` にして「タイトル画面」の存在感を出す。`/` の `h1`
  （`text-2xl`）より一段階大きくすることで役割の違い（一覧 vs 玄関）を表現する。これ以上の
  装飾（アイコン・グラデーション・パターン）は追加しない — **既存トークンとタイポグラフィの
  範囲で成立させる**という制約を優先する

### 2-2. ログインボタン

- `Button variant="primary"` をベースにするが、**`size="touch"` は使わない**。理由:
  `size="touch"` は `min-h-11 md:min-h-0` を丸ごと差し替える仕組みで、そこに
  `className="min-h-12"` を追記しても `min-h-11` と `min-h-12` が両方生成され、どちらが勝つかは
  Tailwind のビルド順に依存し保証されない（[06-ui-design.md](../../../docs/02-development-docs/06-ui-design.md) §2 に既にある注意と同じ問題）。
  この画面はボタン 1 個だけで密度の制約が無いので、`size` prop を使わず
  `className="w-full min-h-12"` を直接指定する（PC/スマホで高さを変える必要も無いので
  `md:` の出し分けも不要）
- クリック時: ボタンを `disabled` にし、ラベルを「ログインしています…」に変える
  （OAuth へのリダイレクトが走るまでの数百ms〜数秒、モバイル回線での二重タップを防ぐ）。
  スピナー画像は使わない（テキストのみ）

### 2-3. エラー表示（同一画面・日本語）

Auth.js 既定の英語エラーページは使わない。`/login` 自身がクエリパラメータでエラー種別を受け取り、
`Banner tone="danger"` で表示する。

| 分類 | 文言 | 備考 |
| --- | --- | --- |
| 許可リスト外のアカウント | 「このアカウントではログインできません。」 | spec 決定 10 の文言を踏襲 |
| その他の OAuth 失敗（キャンセル・通信エラーなど） | 「ログインに失敗しました。もう一度お試しください。」 | Auth.js v5 が返す実際のエラーコード列挙は dev 確認事項（未確認。spec 14-2 と同様の扱い）。UI 側は「許可リスト外」と「その他」の 2 分類だけ持てば足りる設計にする |

- クエリパラメータ名の具体（`?error=AccessDenied` 等）は Auth.js v5 の実装に依存するため、
  ここでは決め打ちしない。**dev は「エラーコード → 上記 2 分類のどちらか」のマッピング表を
  1 箇所に持つ形で実装する**（UI 側はどちらの分類かだけを受け取れば良い）
- Banner はボタンの直上（説明文とボタンの間）に置く。注記文言はエラーの有無に関わらず常に表示する

### 2-4. アカウント削除完了の表示

`Banner tone="neutral"` で「アカウントを削除しました。」を同じ位置に表示する。
**`danger` トークンは使わない**（削除は成功しており、警告ではなく完了通知のため）。
エラーと削除完了が同時に起きることは無い（別々のフロー）ので、Banner は常に 1 つだけ出す。

---

## 3. アカウントメニュー

`/`（作品一覧）ヘッダに置く。現状ヘッダの「JSONを読み込む」ボタンは**ここへ吸収して削除**する
（spec 決定 2 の表どおり）。ヘッダの右側は「＋ 新しい作品」＋アカウントメニューのトリガーの
2 つだけになる。

### 3-1. トリガー

Google のプロフィール画像を丸いボタンに表示する。取得できないとき（未設定・URL 失効・読み込み
失敗）は頭文字アバター（例: `t@example.com` → 「T」）にフォールバックする。

> **決定変更（2026-08-04・社長指示）**: 当初は「Google のプロフィール画像は使わない」と決めていた
> （外部ドメイン許可・取得失敗時のフォールバックという保守コストを避けるため）。ログイン済みで
> あることが一目で分かる利点を優先して撤回する。挙げていた 2 つのコストは実装側で潰した:
> - **外部ドメイン許可が要らない**: `next/image` を使わず素の `<img>` で出す（32〜44px の固定
>   サイズ画像で最適化の余地が無く、`images.remotePatterns` の保守も発生しない）。
>   [SceneCard.tsx](../../../../src/components/board/SceneCard.tsx) の既存判断と同じ理由。
> - **フォールバックが 1 経路に収まる**: `onError` で頭文字に戻すだけ。頭文字アバターは
>   下記のとおり残すので、表示ロジックは「画像が出せれば画像・出せなければ従来どおり」になる。
>
> URL の失効そのものは [auth.ts](../../../../src/lib/auth.ts) の `events.signIn` が毎回
> `User.image` を Google の `picture` に追従させて防ぐ（アダプタは `createUser` のときしか
> 書かないため）。

```tsx
<button
  type="button"
  aria-haspopup="dialog"
  aria-expanded={open}
  aria-label="アカウントメニューを開く"
  className="bg-accent/15 text-accent flex h-11 w-11 shrink-0 items-center justify-center
             overflow-hidden rounded-full text-sm font-semibold md:h-8 md:w-8"
>
  {imageUrl && !imageBroken ? (
    <img
      src={imageUrl}
      alt=""
      width={96}
      height={96}
      referrerPolicy="no-referrer"
      onError={() => setImageBroken(true)}
      className="h-full w-full object-cover"
    />
  ) : (
    email.charAt(0).toUpperCase()
  )}
</button>
```

`alt=""`（装飾扱い）にするのは、識別に必要な情報が `aria-label="アカウントメニューを開く"` と
メニュー内のメールアドレスで既に足りているため。画像に別の名前を与えるとボタンの読み上げが二重になる。
`referrerPolicy="no-referrer"` はアプリの URL を Google 側に渡さないため。

`IconButton` を流用しない理由: `IconButton` の基底クラスに `rounded-md` が含まれており、
`className="rounded-full"` を追記しても確実に上書きされる保証が無い（2 章末尾と同じ理由）。
1 箇所しか使わない要素のために `IconButton` に `shape` prop を増やすよりは、素の `<button>` を
1 個書く方がシンプルと判断した。

### 3-2. モバイル（`md` 未満）: 下から出るシート

```tsx
<div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
  <div className="flex-1 bg-black/30" onMouseDown={onClose} aria-hidden="true" />
  <div role="dialog" aria-modal="true" aria-label="アカウントメニュー"
       className="bg-surface border-line w-full rounded-t-2xl border-t shadow-2xl">
    {/* ヘッダ行（タイトル + ✕ IconButton size="touch"）+ 3-4 の中身 */}
  </div>
</div>
```

`Drawer` の右スライド版と見た目のトーンは揃えるが、**`Drawer` プリミティブは流用しない**
（`Drawer` は右アンカー固定で、下シートには構造が合わない。無理に共通化するより、
スクリム＋Escape＋`role="dialog"` という*パターン*だけ踏襲する）。

### 3-3. PC（`md` 以上）: ヘッダ右のポップオーバー

```tsx
<div className="hidden md:block">
  {/* トリガーは 3-1 と共通。open 時のみ以下を描画 */}
  <div className="fixed inset-0 z-40" onMouseDown={onClose} aria-hidden="true" />
  <div role="dialog" aria-modal="true" aria-label="アカウントメニュー"
       className="bg-surface border-line absolute right-0 top-full z-50 mt-2 w-72
                  overflow-hidden rounded-xl border shadow-xl">
    {/* 3-4 の中身。閉じるボタンは置かない（外側クリック / Escape で閉じる） */}
  </div>
</div>
```

スクリムは背景を暗くしない透明なクリックキャッチャー（`Modal` のような `bg-black/40` は
軽量なドロップダウンには重すぎる）。モバイルのシートは逆に `bg-black/30` で暗くする
（`Drawer` の既存スクリムと同じ扱いで一貫させる）。

出し分けは `hidden md:block` / `md:hidden` の CSS のみ（[06-ui-design.md](../../../docs/02-development-docs/06-ui-design.md) §8 と同じ、JS の `matchMedia` は使わない）。

### 3-4. 中身（モバイル・PC 共通、同じデータ）

```
┌─────────────────────────────┐
│ ログイン中                    │ text-muted text-xs
│ suwahara@example.com          │ text-sm font-medium truncate (title 属性でフル表示)
├─────────────────────────────┤
│ JSON を読み込む                │ ← 3-5 参照
│ ログアウト                     │ ← 可逆操作なので確認ダイアログ無し
├─────────────────────────────┤
│ アカウントを削除                │ text-danger ← 4 章のモーダルを開く
└─────────────────────────────┘
```

- 「ログアウト」と「アカウントを削除」の視覚的な区別: **色 + グルーピングの二重表現**。
  通常操作（JSON 読み込む・ログアウト）は `text-fg`、削除だけ `text-danger`。さらに
  `border-line` の区切り線で危険操作を物理的に隔離する（色だけに頼らない — a11y 要件）
- 行は `Button` プリミティブを再利用しない。理由: `Button` の基底クラスに `justify-center`
  が含まれ、メニュー項目として左寄せ（`text-left`）にしたい場合の安全な上書きができない
  （2 章と同じ理由）。既存コードにも [StoryTabs](../../../../src/components/StoryTabs.tsx)
  の非アクティブタブのように素の `<button>` を使う前例があるため、それに倣う:

```tsx
<button
  type="button"
  className="hover:bg-surface2 min-h-11 w-full px-4 text-left text-sm transition-colors
             md:min-h-9"
>
  ログアウト
</button>
```

削除行だけ `text-danger` を足す。

### 3-5. 「JSON を読み込む」の挙動

クリックで隠し `<input type="file" accept="application/json,.json" multiple>` を発火する
（spec 決定 5 で `multiple` 化が確定済み）。メニューはクリックと同時に閉じてよい
（OS のファイル選択ダイアログが画面を占有するため、裏でメニューが開いたままでも実害は無いが、
閉じておく方が状態が単純）。

複数ファイルの結果表示（1 ファイル = 1 作品、失敗したものだけ名前を出す。spec 5 章の
「取り込み時の挙動」どおり）:

| 結果 | Banner の tone | 文言例 |
| --- | --- | --- |
| 全件成功 | `neutral` | 「3 件の作品を読み込みました。」 |
| 一部失敗 | `danger` | 「2 件を読み込みました。次のファイルは読み込めませんでした: broken.json（storyline のエクスポートファイルではないようです）」 |
| 全件失敗 | `danger` | 「読み込みに失敗しました: a.json, b.json」 |

表示位置は現状どおり `/` のヘッダ直下（既存の `error` 表示と同じ場所。`Banner` に置き換えるだけで
位置は変えない）。

---

## 4. アカウント削除の確認モーダル

`Modal`（`title="アカウントを削除"`）を使う。トリガーはアカウントメニューの「アカウントを削除」
（クリックでメニューを閉じてモーダルを開く）。

```
アカウントを削除しますか？

作品 {n} 件・シーン {n} 件・画像 {n} 枚が
すべて削除されます。元に戻せません。

[ すべての作品を書き出す ]

☐ すべてのデータが削除されることを理解しました

[ キャンセル ]           [ 削除する ]
```

- 3 つの件数は spec 8 章の例文をそのまま踏襲。**取得方法（一覧取得のついでに集計するか、
  専用の集計クエリを新設するか）は開発部の判断とする**。UI としては 1 行にまとめて出すことだけ決める
- 「すべての作品を書き出す」= `Button variant="subtle" size="touch"` 幅いっぱい。
  spec §2 の表で「退会の確認モーダル内の書き出す」が新設対象と明記されている。
  **これは spec 12 章 v2 の「全作品まとめて書き出し」（一覧ページの一般機能）とは別物**。
  削除モーダルの内側だけで完結する退避専用の導線で、実装方式（既存 `downloadProject` を
  作品数ぶんループするか、ZIP にまとめる新規ライブラリを入れるか）は開発部の技術判断に委ねる。
  ループ方式の場合ブラウザの「複数ファイルのダウンロードをブロック」に当たりうるため
  **実機検証が必須**（デザイン部からの申し送り）
- チェックボックス: `<input type="checkbox">` をネイティブのまま使う（今回限りの用途なので
  `ui.tsx` に `Checkbox` を新設しない。再利用箇所が増えたら検討する）。行全体を
  `<label className="flex min-h-11 items-center gap-2">` で包み、当たり判定を 44px 確保する
  （チェックボックス自体は小さくてよい — ラベル込みでタップできれば足りる）
- 「削除する」ボタンはチェックが入るまで `disabled`。作品名のタイプ入力は求めない（spec どおり）
- ボタン行は `size="touch"` 徹底
- **通信失敗時の挙動**（spec が明記していない範囲の補完判断）: モーダルは閉じない。モーダル内に
  `Banner tone="danger"`「削除に失敗しました。通信を確認してもう一度お試しください。」を出し、
  ボタンを再度押せる状態に戻す。削除中は「削除する」ボタンを `disabled` + ラベル
  「削除しています…」にして二重送信を防ぐ
- 成功後は `/login` へ遷移し、2-4 章の「アカウントを削除しました」を表示する

---

## 5. 作品削除の確認モーダル化

現状 [src/app/page.tsx](../../../../src/app/page.tsx) の `window.confirm` を `Modal` に置き換える。

```
Modal title: 作品を削除

「{project.title}」を削除します。
ストーリー {stories} 件・シーン {scenes} 件・キャラクター {characters} 件が
すべて削除されます。元に戻せません。

[ この作品を書き出す ]

[ キャンセル ]           [ 削除する ]
```

- 件数は各カードで既に計算している `projectStats(project)` をそのまま使い回せる（新規計算不要）
- 「この作品を書き出す」= 既存の `downloadProject(project)` をそのまま呼ぶだけ
  （新規実装ではない。既存カードの「書き出す」ボタンと同じ関数）
- **チェックボックスは付けない**（4 章のアカウント削除より発生頻度が高く被害範囲が狭いため、
  同じ摩擦を課さない判断。既存の `window.confirm` にもチェックは無かった — 摩擦を今回追加で
  増やさない）
- 通信失敗時の挙動は 4 章と同じパターン（モーダル内に danger Banner、再試行可能、
  ボタンは「削除しています…」で二重送信防止）
- 実装メモ: `page.tsx` に「削除確認中の対象作品」を保持するローカル state
  （例: `const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)`）が要る。
  カードの「削除」ボタンは `window.confirm` を呼ばず `setDeleteTarget(project)` に変える

---

## 6. 保存中 / 保存失敗の表示

spec 1-2 節の「保存に失敗しても画面の入力を消さない」を成立させる、今回で最も難しい箇所。

### 6-1. 前提となる構造上の問題（先に潰す）

素朴に「ヘッダに 1 行足す」と、**シーン編集中は表示されない**。理由:
[Drawer](../../../../src/components/ui.tsx) は `fixed inset-0 z-50` で**画面全体を覆う**実装であり、
シーン編集・キャラクター管理は常にこの Drawer 内で行われる。ヘッダは Drawer の背後
（通常の描画順・z-index 無し）に隠れるため、**最も保存が起きている瞬間（Drawer 編集中）に
インジケータが見えない**という致命的な抜けになる。

対策として fixed 要素を新設して z-index で Drawer の上に被せる方式（`z-[60]` 等）も検討したが、
Drawer 自身のヘッダ（タイトル + ✕）や `footer`（削除・複製・閉じるボタン）と衝突する
（375px 幅では上下どちらの帯も Drawer のチロムと取り合いになる）。

**採用した設計: インジケータを固定要素にせず、「今見えているヘッダ」に埋め込む。**
具体的には `SaveStatusIndicator` という 1 つの小さいコンポーネントを作り、

1. `/projects/[projectId]` のページヘッダ（Drawer が閉じている時に見える）
2. `SceneEditor` / `CharacterPanel` の `Drawer` の `title`（Drawer が開いている時に見える）

の**両方**に同じコンポーネントを差し込む。`Drawer` の `title` prop は既に `ReactNode` を
受け取れるので、**`Drawer` 本体の変更は不要**（`SceneEditor`/`CharacterPanel` 側で
`title={<>...元のタイトル... <SaveStatusIndicator /></>}` に変えるだけ）。

どちらか一方しか同時に画面に存在しない（Drawer が開いていればページヘッダは見えず、
閉じていればページヘッダしか無い）ので、「画面に 1 か所だけ」という要件は**ユーザから見て
常に 1 つ**という形で満たす（DOM 上の設置箇所が 2 つあることは、fixed 要素の z-index 沼を
避けるためのトレードオフとして許容する）。

### 6-2. 状態とストア契約（UI 側の要求。実装は開発部）

集約された 1 つのステータスだけを持つ（シーンごとの個別バッジは作らない — 一望性を壊すため
spec が明示的に禁止している）。

```
useStore(s => s.saveStatus)  // "saving" | "saved" | "error"
useStore(s => s.retrySave)   // 現在失敗している保存をすべてまとめて再試行する
```

- 単位は「編集した 1 件」（spec 1-2 節）だが、**表示は集約 1 個**。複数の保存が同時に走っていて
  そのうち 1 つでも失敗していれば `"error"` を優先表示する（優先順位: `error` > `saving` > `saved`）
- `InlineText` 等 `src/components/` 側のコンポーネントは変更不要。`onCommit` の中身
  （`store.ts` の各 `update*` アクション）が非同期・楽観更新化され、その結果を `saveStatus` に
  反映する形になるだけ — **UI 層からは今と同じ関数呼び出しに見える**

### 6-3. 表示（3 状態）

コンパクトな 1 要素。ヘッダ／ Drawer タイトルどちらでも同じ見た目。

| 状態 | 表示 | 挙動 |
| --- | --- | --- |
| `saved`（アイドル・成功後の定常状態） | `text-muted text-[11px]` 「保存済み」 | 何もしない。初回表示（まだ何も編集していない）もこの見た目でよい（「今見えている内容は安全」という意味で統一する） |
| `saving` | `text-muted text-[11px]` 「保存中…」 | 何もしない |
| `error` | `text-danger text-[11px] font-medium`。クリック可能な `<button>` で「保存できませんでした」 | クリックで `retrySave()`。再試行中はラベルを「再試行中…」にして `disabled` |

- 詳しい説明文（「通信を確認してください」）は**常時表示の本文には入れない**（スペースが常に
  厳しい Drawer タイトル横での運用を想定）。代わりに `title` 属性（PC のホバーで見える）と
  `aria-label`（スクリーンリーダー用）にフル文を入れる:
  `aria-label="保存に失敗しました。通信を確認してください。タップで再試行します"`
- `aria-live="polite"` を親要素に付け、状態変化がスクリーンリーダーにも伝わるようにする
  （`assertive` にしない — 入力中に読み上げを割り込ませないため）
- 色だけに頼らない a11y 要件は文言（「保存できませんでした」というラベル自体）で満たしている

### 6-4. 画面遷移のガード

- **ブラウザのタブを閉じる・リロード**: `window.beforeunload` で `saveStatus !== "saved"` のとき
  警告を出す（標準的な実装）
- **アプリ内遷移（「← 一覧」リンクなど）**: `beforeunload` は Next.js のクライアントサイド遷移を
  捕まえない。`saveStatus` が `"saving"` または `"error"` のときは、リンクの `onClick` で
  `window.confirm("保存できていない変更があります。このページを離れると内容が失われる可能性が
  あります。よろしいですか？")` を挟んでから遷移する。**ここを見落とすと「画面から消さない」の
  実質が「一覧に戻った瞬間に消える」に変わってしまう**ため、dev 引き継ぎで明示的に強調する

### 6-5. 適用範囲

このインジケータが要るのは `/projects/[projectId]` だけ（`/` は自動保存の対象になる継続編集
フィールドが無い — 作品作成はモーダルの明示的な「作成」ボタン、削除は 4-5 章の専用モーダルで
それぞれ個別の pending/failure 表現を持つため、グローバルな `saveStatus` とは別枠）。

---

## 7. サムネイル縮小長辺 640px の妥当性検証（宿題）

**結論: 640px → 800px に引き上げる。**（spec が許容する上限ちょうど。
[image.ts](../../../../src/lib/image.ts) の `MAX_EDGE`）

検証の起点は、**アプリ内でサムネイルが最も大きく表示される場所はどこか**。3 箇所を比較する:

| 表示箇所 | CSS 上の最大幅 | 2倍密度で必要な実ピクセル |
| --- | --- | --- |
| PC カンバンの `SceneCardBody`（列幅 288px、全幅表示） | 288px | 576px |
| モバイル縦リストの行内サムネイル（[mobile-vertical-list 仕様](2026-08-04-mobile-vertical-list.md) 決定 3） | 64px | 128px |
| **[SceneEditor](../../../../src/components/SceneEditor.tsx) のサムネイルプレビュー**（`aspect-video w-full`、Drawer 内） | Drawer 幅 `max-w-md`（448px）− `px-4` パディング ≒ **416px**（375px 幅の端末では Drawer が実質フルスクリーンになるため 343px 前後） | **686〜832px** |

**最大表示コンテキストは SceneEditor のプレビューであり、カンバンカードではない。**
現行 640px は「PC カンバンカードの 2 倍密度（576px）」を基準に決められた値だが、
SceneEditor のフルサイズプレビューはそれより大きい（686〜832px 相当）。**640px は既に
現行の最大表示コンテキストに対して不足している。**

- spec 自身が「800px を超えないこと（1 枚約 160 KB ＝ ユーザ上限で約 625 枚。見積りが崩れない
  範囲）」と上限を明示しているため、その上限まで引き上げるのが妥当。800px は SceneEditor
  プレビューの 2 倍密度所要量（686〜832px）をほぼ覆う
- 3 倍密度（iPhone 標準、約 1,029〜1,248px 相当）までは満たせないが、**サムネイルは資料画像で
  あって原本ではない**という spec 自身の位置づけ（§7「多少劣化しても目的を果たす」の理屈と
  同じ）に沿えば許容範囲と判断する。3 倍密度での多少のソフトさは受け入れる
- PC カンバンカード（576px 必要）・モバイル行内サムネイル（128px 必要）はどちらも 800px で
  余裕をもって満たされる。**したがって 800px は「全表示コンテキストの最大値を満たす」かつ
  「spec の容量上限に収まる」の両方を満たす唯一の値**
- `QUALITY`（現行 0.82）は今回のスコープでは変更しない。再圧縮ラダー（300KB 超過時にまず
  品質を落とし、それでも超えたら縮小する。spec 7 章）の具体的な段階設計は開発部の実装判断

---

## 8. 未対応のまま残っていたタップ領域の判断（宿題 2 件）

前回のモバイル対応チケット（[2026-08-04-mobile-vertical-list-ui.md](../tasks/2026-08-04-mobile-vertical-list-ui.md)）が
未確定のまま残した項目。今回まとめて判断する。

### 8-1. `CharacterPanel` 各キャラクター行の「削除」ボタン → **44px 化する**

[CharacterPanel](../../../../src/components/CharacterPanel.tsx) は `md` 未満でも到達可能
（Drawer は breakpoint で非表示にならない）。前回チケットは Drawer の**フッター**ボタンだけを
44px 化対象として明記しており、**行内の個別「削除」ボタン**（`Button variant="danger"`、
`size` 未指定）は対象外のまま残っていた。[06-ui-design.md](../../../docs/02-development-docs/06-ui-design.md) §8 の
「`md` 未満で表示・到達しうる対話要素はすべて 44×44px」という総則に照らすと単純な抜け。
`size="touch"` を足すだけで直る（既存 prop の適用のみ、新規実装無し）。

### 8-2. キャラクター色スウォッチ（20px） → **44px 化しない（現状維持）**

理由:

1. **低頻度操作**: 色は作成時に 1 度選べば以降ほぼ触らない運用が大半
2. **誤タップの実害が小さい**: 隣の色を選んでしまっても、選び直せば即座に直る。削除のような
   不可逆操作ではない
3. **一望性への影響が大きい**: キャラクターは上限 100 人（spec 7 章）まで許容される。
   10 色 × 44px では 1 行あたり 440px 超になり、キャラクターが増えるほど `CharacterPanel` の
   スクロール量が致命的に伸びる。「情報を増やすには何を削るかとセットで」の原則に照らすと、
   この作り込みで得られる操作性向上は失うスクロール効率に見合わない
4. **WCAG AA の範囲外**: このプロジェクトが明言しているコントラスト基準は WCAG AA
   （4.5:1）であり、タップ領域 44px（WCAG 2.5.5）は AAA 相当。このプロジェクトの
   自主基準ではあるが、絶対遵守ではなく「主要な操作要素」への適用と位置づけて良い

**代わりの最小限の緩和**: スウォッチ間の `gap-1`（4px）を `gap-1.5`（6px）に広げ、隣接誤タップの
確率だけ下げる。44px 化はしない。

### 8-3. `StoryTabs` の「＋ストーリー」ボタン → **44px 化する**

同じ [StoryTabs](../../../../src/components/StoryTabs.tsx) 内の「‹ / › / ✕」は前回チケットで
既に `size="touch"` 化済みだが、「＋ストーリー」ボタン自体は素の `Button variant="ghost"` の
まま見落とされていた。前回チケットが明示的に 44px 化した「＋シーンを追加」
「＋シークエンスを追加」（[06-ui-design.md](../../../docs/02-development-docs/06-ui-design.md) §8 のタップ領域表）と
構造的に同じ「新規追加」操作であり、これらだけ扱いを変える理由が無い。`size="touch"` を足す。

---

## 9. デザイントークン確認

新しく使う色は無い。`Banner` の `danger` トーンは既存の `border-danger/40 bg-danger/10
text-danger` パターンをそのまま流用、`neutral` トーンは `border-line bg-surface2 text-fg`
（既存の「一段沈んだ面」表現の流用）。アバターの `bg-accent/15 text-accent` も既存の
`bg-accent/10` 系の半透明パターンと同じ考え方（新しい不透明度の値を増やさない）。

**生の色ユーティリティは使わない。ライト / ダーク両対応はすべて既存トークン経由のため自動で
満たされる**（別途の確認は不要）。

---

## 10. 実装側で判断が要る点（デザイン部からの申し送り）

1. `Banner` の正確な API（`action` prop の有無など）は dev 実装時に確定してよい。設計意図は
   「tone で色を、children で文言を、任意で action（例: 再試行ボタン）を持てる」こと
2. アカウント削除の件数集計（3 件の数値の取得方法）はサーバ側の設計次第。UI は数値 3 つを
   受け取れれば良い
3. 「すべての作品を書き出す」の実装方式（複数ダウンロードのループ vs ZIP 化）は開発部の技術判断。
   ループ方式を選ぶ場合はブラウザの複数ダウンロードブロックを実機で確認すること
4. `saveStatus` / `retrySave` の正確な型・store 実装は [store-builder](../../../../.claude/agents/store-builder.md)
   の領分。UI からの要求は 6-2 章の 2 行がすべて
5. アプリ内遷移ガード（6-4 章）を「← 一覧」リンク以外にも適用すべき箇所（例: ブラウザバック）が
   増えた場合は、同じ `saveStatus` を見て同じ確認文言を出す形に揃えること
6. `/login` のクエリパラメータ名・Auth.js のエラーコード列挙は未確認（spec 14-2 と同列）。
   dev が実装時に確認し、2-3 章の 2 分類マッピングへ落とし込む
