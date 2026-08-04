# storyline

シナリオの構成（時系列）とキャラクターのつながりを整理するためのツール。
フロントエンドのみで動作し、データはブラウザの IndexedDB に保存される。

## 構成

```
作品 (Project)
└─ ストーリー (Story)          … 本編 / 外伝 などをタブで切り替え
   └─ シークエンス (Sequence)  … カンバンの「列」
      └─ シーン (Scene)        … カンバンの「カード」
```

- **時間の表し方** — 実日付は持たない。並び順そのものが時系列で、`timeLabel`
  （例: `事件当日 早朝`）は自由テキストの表示ラベル。架空の暦でも破綻しない。
- **シーンの項目** — タイトル / あらすじ / 登場キャラ / 時間ラベル / 場所 /
  ステータス（プロット・執筆中・完了）/ メモ / サムネイル画像（任意）
- **キャラクター** — 作品ごとに登録し、各シーンに複数紐づけられる。識別色を持つ。

## 開発

```bash
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

## データの保存とバックアップ

- 保存先はブラウザの IndexedDB（キー: `storyline-store-v1`）。
  **ブラウザのサイトデータを消すと作品も消える。**
- 作品カード / 作品画面の「書き出す」で `*.storyline.json` を出力できる。
  取り込みは作品一覧の「JSONを読み込む」。別の端末やブラウザへはこれで移す。
- サムネイルは読み込み時に長辺 640px の JPEG へ縮小し、data URL として
  JSON にも含まれる（`src/lib/image.ts`）。

## デプロイ

Vercel にそのままデプロイできる（サーバ側の状態を持たない）。

## 主なファイル

| パス | 役割 |
| --- | --- |
| `src/lib/types.ts` | データモデルの定義 |
| `src/lib/store.ts` | zustand ストア（永続化・全更新操作） |
| `src/lib/io.ts` | JSON の書き出し / 読み込みと正規化 |
| `src/components/board/` | カンバン（ドラッグ＆ドロップ） |
| `src/components/SceneEditor.tsx` | シーン編集パネル |
| `src/components/CharacterPanel.tsx` | キャラクター管理パネル |
