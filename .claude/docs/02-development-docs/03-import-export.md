# 書き出し / 読み込み

[src/lib/io.ts](../../../src/lib/io.ts) と [src/lib/image.ts](../../../src/lib/image.ts)。
**JSON の書き出し / 読み込みが、ユーザにとって唯一のバックアップ手段かつ端末間の移行手段**。

---

## 1. エクスポート形式

```jsonc
{
  "format": "storyline.project",   // EXPORT_FORMAT
  "version": 1,                    // EXPORT_VERSION
  "exportedAt": "2026-08-04T…Z",
  "project": { /* Project そのもの */ }
}
```

- ファイル名: `<作品名>.storyline.json` (`\/:*?"<>|` は `_` に置換)
- `format` / `version` の文字列は**変えない**。変える場合は読み込み側で旧形式を受け続ける

---

## 2. インポートの原則: 壊れた JSON でも落とさない

手で編集された JSON や古いエクスポートが来ても壊れないよう、**想定外の値は既定値へ落として
読み込む**。例外を投げるのは「そもそも storyline の JSON ではない」ときだけ。

### 型ガードの語彙 (このパターンに合わせる)

```ts
const str = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
```

外部由来の値を扱うコードは、`any` や `as` ではなくこの 3 つを使う。

### 正規化の階層

`normalizeProject` → `normalizeStory` → `normalizeSequence` → `normalizeScene` /
`normalizeCharacter`。それぞれ `factory.ts` の `create*` に既定値を任せ、読めた値だけ上書きする。

**型を追加したら、対応する `normalize*` にも読み取りを足す**。忘れると、書き出した JSON を
読み込んだときにその項目だけ消える (往復で壊れる)。

### 正規化が担保していること

| 保証 | 実装 |
| --- | --- |
| 未知のステータス値が入らない | `["idea","draft","done"].includes(status)` で判定し、外れたら `idea` |
| 存在しないキャラ参照を残さない | `knownCharacterIds` に含まれる id だけ通す |
| ストーリーが 0 件にならない | 空なら `createProject` の既定ストーリーを使う (ボードが描けなくなるため) |
| id が空でも壊れない | 無ければ `newId()` を振る |

### 例外を投げる 3 ケース

```
"JSON として読み込めませんでした。"           // JSON.parse 失敗
"JSON の中身が想定と違います。"               // オブジェクトでない
"storyline のエクスポートファイルではないようです。"  // stories を持たない
```

文言はそのままユーザに出るので、原因が分かる日本語にする
([04-error-handling.md](./04-error-handling.md))。

---

## 3. id 衝突の扱い

同じ作品を 2 回読み込むと id が衝突する。呼び出し側 ([app/page.tsx](../../../src/app/page.tsx))
で既存 id を検出し、ユーザに選ばせる:

- **上書き** → `importProject(imported)` (同じ id の作品を置き換える)
- **別作品として取り込む** → `importProject(withFreshIds(imported))`

`withFreshIds` は project / story / sequence / scene / character のすべてに新 id を振り、
**`characterIds` を新旧マップで張り替える**。参照を持つ型を追加したら、ここも更新する
(忘れると複製時に紐づけが切れる)。

---

## 4. 画像 (サムネイル)

[src/lib/image.ts](../../../src/lib/image.ts) の `fileToThumbnail`:

- 長辺 **640px** に縮小、JPEG 品質 **0.82**、data URL で返す
- 透過 PNG は白で塗りつぶしてから描画する (JPEG 化で黒く落ちるため)
- 画像以外のファイルは `"画像ファイルを選んでください。"` で拒否

**原寸のまま保存しない**。data URL は IndexedDB とエクスポート JSON の両方に載るため、
1 枚数 MB の画像を許すと保存も書き出しもすぐ破綻する。
縮小サイズを変えるときは、シーン 100 件あたりの JSON サイズへの影響を見積もること。

---

## 5. 変更時の確認手順

書き出し / 読み込みに手を入れたら、必ず往復を確認する:

1. サムネイル付きシーンを含む作品を書き出す
2. 別作品として読み込む (`withFreshIds` 経路)
3. 同じ id で上書き読み込みする
4. 手で JSON の一部を壊して読み込む (落ちずにエラー文言が出るか)

自動テストが無いため、この確認はユーザに依頼する
(Claude 側で `npm run dev` は起動しない)。

---

## 関連ドキュメント

- データモデル → [02-data-model-and-persistence.md](./02-data-model-and-persistence.md)
- エラー処理 → [04-error-handling.md](./04-error-handling.md)
- テスト方針 → [09-test-strategy.md](./09-test-strategy.md)
