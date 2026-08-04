# テスト戦略

**現状テスト基盤は未導入**。`package.json` に test スクリプトは無く、テストランナーも
入っていない。このドキュメントは「入れるとしたらこう入れる」という方針。

---

## 1. 現状の検証手段

| 手段 | コマンド | 何を保証するか |
| --- | --- | --- |
| 型チェック | `npx tsc --noEmit` | 型の整合性 |
| Lint | `npm run lint` | ESLint (core-web-vitals + TypeScript) |
| ビルド | `npm run build` | 本番ビルドが通ること |
| 手動確認 | ユーザが `npm run dev` | 実際の挙動 |

**Claude は `npm run dev` を起動しない**。動作確認が必要なときはユーザに依頼し、
確認してほしい観点を箇条書きで渡す。

---

## 2. 導入するなら Vitest

Next.js 16 + React 19 の構成に対して、単体テストは Vitest が素直に動く。

```
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event
```

`package.json` に `"test": "vitest"` を追加し、`vitest.config.ts` で `jsdom` 環境と
`@/*` エイリアス (tsconfig の `paths` と同じ) を設定する。

---

## 3. 優先度: `src/lib/` から書く

このアプリのリスクは **データが壊れること** に集中している。UI より先にデータ層を守る。

| 優先 | 対象 | 何を確認するか |
| --- | --- | --- |
| ① | [io.ts](../../../src/lib/io.ts) `parseProjectJson` | 壊れた JSON / 旧形式 / エンベロープ無しでも落ちない。未知ステータスが `idea` に落ちる。存在しないキャラ参照が除去される |
| ② | [io.ts](../../../src/lib/io.ts) `withFreshIds` | 全 id が新しくなり、`characterIds` の張り替えが正しい |
| ③ | [store.ts](../../../src/lib/store.ts) `moveScene` | 列跨ぎ・同一列・境界 index (0 / 末尾 / 範囲外) |
| ④ | [store.ts](../../../src/lib/store.ts) `deleteCharacter` | 全シーンから参照が消える |
| ⑤ | 書き出し → 読み込みの往復 | `toExportJson` → `parseProjectJson` で内容が保存される |
| ⑥ | [stats.ts](../../../src/lib/stats.ts) | 集計と不正日時の扱い (`formatDateTime` が `―` を返す) |

`src/lib/` は `store.ts` を除いて React に依存しないため、**DOM 無しで素直にテストできる**。

### 書きにくいもの

| 対象 | 理由 | 対処 |
| --- | --- | --- |
| `image.ts` | `createImageBitmap` / Canvas が jsdom に無い | 当面テストしない (手動確認) |
| `storage.ts` | IndexedDB が必要 | `fake-indexeddb` を入れるか、テストしない |
| ドラッグ & ドロップ | ポインタイベントの再現が高コスト | 手動確認シナリオで担保 ([07-drag-and-drop.md](./07-drag-and-drop.md)) |

---

## 4. コンポーネントテストの方針 (導入する場合)

- `@testing-library/react` の `role` / `name` ロケータを優先 (`data-testid` は最終手段)
- デバウンス入力 (`InlineText` / `SceneEditor`) はフェイクタイマーで検証する
- ストアはモックせず、実物を使ってテストごとに初期化する (単一ストアなので状態リセットが必要)

---

## 5. 手動確認シナリオ (テスト導入までの拠り所)

変更の種類ごとに、ユーザへ確認を依頼する観点:

| 変更 | 確認シナリオ |
| --- | --- |
| ストア・型 | 作品作成 → 編集 → リロードで保持されるか |
| 書き出し / 読み込み | [03-import-export.md](./03-import-export.md) §5 の往復手順 |
| ドラッグ & ドロップ | [07-drag-and-drop.md](./07-drag-and-drop.md) §6 の 7 シナリオ |
| 見た目 | ライト / ダーク両方 |

---

## 6. CI

現状 CI は未設定。導入するなら `npm ci` → `npm run lint` → `npx tsc --noEmit` →
`npm run build` の 4 ステップから始める (テストが入ったら追加する)。
