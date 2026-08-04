# metadata と SEO

storyline は**検索流入を目的としないローカルツール**。SEO 施策は最小限に留め、
metadata は「タブに正しく出る」「共有したときに壊れない」ことだけを担保する。

---

## 1. 現状

[src/app/layout.tsx](../../../src/app/layout.tsx):

```tsx
export const metadata: Metadata = {
  title: "storyline",
  description: "シナリオの時系列とキャラクターのつながりを整理するツール",
};
```

- `<html lang="ja">` (日本語 UI なので必須)
- favicon は [src/app/favicon.ico](../../../src/app/favicon.ico) (App Router の規約で自動認識)
- フォントは `next/font/google` の Geist を `--font-geist-sans` として注入

---

## 2. 追加してよいもの / 慎重に扱うもの

| 項目 | 判断 |
| --- | --- |
| `title.template` (`"%s | storyline"`) | 画面が増えるなら入れてよい |
| `openGraph` / `twitter` | 公開・共有する予定ができたら追加する |
| `robots` | 公開範囲を絞るなら明示する (既定はインデックス許可) |
| `manifest` / PWA | **要検討**。オフライン動作と相性は良いが、Service Worker の
  キャッシュ戦略を誤ると古い JS が残り、永続化データとの不整合を招く |
| 構造化データ (JSON-LD) | 不要 (検索対象ではない) |

---

## 3. 動的ルートの metadata

`/projects/<id>` は**クライアントコンポーネント**で、データはブラウザ内にしかない。
そのためサーバ側で作品名を metadata に出すことはできない (`generateMetadata` から
IndexedDB は読めない)。

作品名をタブに出したい場合の選択肢:

1. **何もしない** (現状。タブは常に `storyline`)
2. クライアント側で `document.title` を更新する (`useEffect`)

2 を選ぶ場合も metadata API とは別経路になるため、`layout.tsx` の `title` は
既定値として残す。

---

## 4. 画像とパフォーマンス指標

- サムネイルは data URL なので `next/image` の最適化対象外。素の `<img>` を使う
  (`@next/next/no-img-element` の disable コメントはこの理由)
- LCP に効くのはフォント読み込みとカードのサムネイル。**サムネイルの縮小サイズを上げると
  直接悪化する** ([08-performance-optimization.md](./08-performance-optimization.md))
- 計測ツール (Analytics / Speed Insights) は未導入。入れる場合は外部送信が発生するため、
  ローカル完結という前提との整合をユーザに確認する

---

## 関連ドキュメント

- Next.js の metadata API → [01-next-app-router-doc.md](../03-library-docs/01-next-app-router-doc.md)
- デプロイ → [11-deployment.md](./11-deployment.md)
