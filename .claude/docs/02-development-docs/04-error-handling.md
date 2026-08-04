# エラー処理

サーバもエラー監視も無いため、エラー処理は **「ユーザに何が起きたか伝える」** ことが全て。
例外クラス階層やエラーコード体系は導入しない (このアプリの規模に対して過剰)。

---

## 1. 方針

| 種類 | 扱い |
| --- | --- |
| ユーザ操作の失敗 (壊れた JSON・非画像ファイル) | `Error` を投げ、呼び出し側で捕まえて画面に日本語で出す |
| 想定内の欠損 (フィールドが無い・型が違う) | **投げない**。既定値に落として読み込む |
| 破壊的操作 | エラーではなく `window.confirm` で事前に止める |
| プログラミングエラー | 型で防ぐ。実行時チェックを足さない |

---

## 2. 投げる側 — `src/lib/`

メッセージは**そのままユーザに表示される**前提で書く。原因と次の行動が分かる日本語にする。

```ts
// io.ts
throw new Error("JSON として読み込めませんでした。");
throw new Error("storyline のエクスポートファイルではないようです。");

// image.ts
throw new Error("画像ファイルを選んでください。");
```

避けるべき例: `throw new Error("parse failed")` / `throw new Error("invalid input")`
(英語・原因不明・ユーザが次に何をすべきか分からない)。

---

## 3. 捕まえる側 — コンポーネント

`unknown` で受けて `instanceof Error` で絞る。**`any` は使わない。**

```tsx
const [error, setError] = useState<string | null>(null);

try {
  const imported = parseProjectJson(await file.text());
  ...
} catch (e) {
  setError(e instanceof Error ? e.message : "読み込みに失敗しました。");
}
```

表示は `danger` トークンのバナーで、操作の近くに置く:

```tsx
{error && (
  <p className="border-danger/40 bg-danger/10 text-danger mb-4 rounded-md border px-3 py-2 text-sm">
    {error}
  </p>
)}
```

- 新しい操作を始めたら `setError(null)` で消す (古いエラーを残さない)
- `alert()` は使わない (操作を止めるうえ、文脈から離れる)
- `console.error` だけで済ませない (ユーザには見えない)

---

## 4. 破壊的操作の確認

**取り消し (undo) が無く、データはローカルにしか無い**ため、削除は必ず確認を挟む。
文言は「何が・どれだけ消えるか」を含める。

```tsx
window.confirm(`「${project.title}」を削除します。元に戻せません。よろしいですか？`)
window.confirm(`「${sequence.title}」を ${sequence.scenes.length} 件のシーンごと削除します。よろしいですか？`)
window.confirm(`「${character.name || "名称未設定"}」を削除します。各シーンからも外れます。よろしいですか？`)
```

確認が要る操作:

| 操作 | 確認 |
| --- | --- |
| 作品の削除 | 必須 |
| ストーリーの削除 | 必須 (配下ごと消える) |
| シークエンスの削除 | シーンが 1 件以上あるとき |
| シーンの削除 | 必須 |
| キャラクターの削除 | 必須 (シーンからも外れる) |
| インポート時の id 衝突 | 上書きか別作品かを選ばせる |

新しい削除操作を足すときは、この表に載る粒度で確認を実装する。

---

## 5. 失敗しても壊さない設計

エラーを出す以前に、そもそも壊れない書き方を優先する。

- ストアの更新は対象が見つからなければ**黙って何もしない** (`if (!project) return;`)。
  「見つからない」は削除直後などに普通に起きるため、例外にしない
- 選択中の実体は毎回ストアから引き直す。消えていれば `null` になり、パネルが自然に閉じる
  ([01-architecture-design.md](./01-architecture-design.md))
- 外部由来の値は正規化で既定値に落とす ([03-import-export.md](./03-import-export.md))

---

## 6. エラーバウンダリ

現状 `error.tsx` / `global-error.tsx` は置いていない。
描画中の例外でアプリ全体が白画面になるリスクはあるが、**入れるならユーザデータを失わせない
設計 (リロード導線 + JSON 書き出しの案内) とセットで検討する**。
安易に握りつぶすと、壊れた状態のまま保存が進む方が危険。

---

## 関連ドキュメント

- 読み込みの正規化 → [03-import-export.md](./03-import-export.md)
- 型ガードの書き方 → [05-type-definition.md](./05-type-definition.md)
