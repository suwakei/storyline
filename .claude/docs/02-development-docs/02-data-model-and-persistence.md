# データモデルと永続化

**ユーザの作品データはブラウザの IndexedDB にしか存在しない。**
このドキュメントの内容を守らないと、ユーザの作品が復旧不能な形で失われる。

---

## 1. データモデル

定義は [src/lib/types.ts](../../../src/lib/types.ts)。

```
Project { id, title, summary, createdAt, updatedAt, characters[], stories[] }
  Character { id, name, color, role, note }
  Story     { id, title, summary, sequences[] }
    Sequence { id, title, summary, scenes[] }
      Scene   { id, title, summary, characterIds[], timeLabel, place, status, memo, thumbnail? }
```

### 不変の約束

| 約束 | 理由 |
| --- | --- |
| **並び順 = 配列の順序**。`order` フィールドを持たない | 並べ替えのたびに全要素を書き換える必要がなく、順序の二重管理も起きない |
| **実日付を持たない**。`timeLabel` は自由テキスト | 架空の暦でも破綻しないため ([01-storyline-concept.md](../01-project-overview/01-storyline-concept.md)) |
| `Scene.characterIds` は `Project.characters` の id を指す | キャラは作品共通。シーンごとに複製しない |
| id は `nanoid(12)` ([factory.ts](../../../src/lib/factory.ts) の `newId`) | 衝突しない短い id。**採番規則を変えない** |

### 参照整合性は削除時に保つ

キャラクターを削除したら、**全シーンの `characterIds` からも外す**
(`store.ts` の `deleteCharacter`)。残すとカードに「幽霊チップ」が出る。
同様の参照を新設する場合は、削除経路での掃除をセットで実装すること。

---

## 2. ストア

[src/lib/store.ts](../../../src/lib/store.ts) — zustand + immer + persist の単一ストア。

### 更新はヘルパ経由で書く

```ts
editProject(projectId, (project) => { ... });          // updatedAt を自動で進める
editStory(projectId, storyId, (story, project) => { ... });
```

`set` を直接使うと `updatedAt` の更新が漏れ、一覧の並びと表示がずれる。
**新しい更新操作は必ず `editProject` / `editStory` の上に作る**
(例外は `addProject` / `importProject` / `deleteProject` のようなプロジェクト集合そのものの操作)。

### 操作一覧 (追加時はこの粒度に合わせる)

| 対象 | 操作 |
| --- | --- |
| 作品 | `addProject` / `importProject` / `updateProject` / `deleteProject` |
| ストーリー | `addStory` / `updateStory` / `deleteStory` / `moveStory` |
| シークエンス | `addSequence` / `updateSequence` / `deleteSequence` / `moveSequence` |
| シーン | `addScene` / `updateScene` / `deleteScene` / `duplicateScene` / `moveScene` |
| キャラクター | `addCharacter` / `updateCharacter` / `deleteCharacter` |

- `update*` は `patch` を受けて `Object.assign` する。**部分更新のみ**
- 追加系は新しい id を返す (呼び出し側が直後に開くため)
- `moveScene` は「列跨ぎの移動」と「同一列の並べ替え」を兼ねる

### immer 上の注意

- recipe 内では直接ミューテートしてよい (`project.stories.push(...)`)
- ただし `state.projects = state.projects.filter(...)` のような**再代入も可**
- `Object.assign(target, patch)` で `undefined` を渡すとキーが `undefined` で上書きされる。
  サムネイルを外す操作 (`{ thumbnail: undefined }`) はこれに依存している

---

## 3. 永続化

[src/lib/storage.ts](../../../src/lib/storage.ts) — idb-keyval を `StateStorage` に適合させた
アダプタ。localStorage ではなく IndexedDB を使うのは、サムネイル (data URL) が
5MB 制限を簡単に超えるため。

```ts
{
  name: STORAGE_KEY,                                  // "storyline-store-v1"
  version: 1,
  storage: createJSONStorage(() => idbStorage),
  partialize: (state) => ({ projects: state.projects }),
  onRehydrateStorage: () => (state) => state?.setHydrated(),
}
```

### 触ってはいけないもの (変更には移行方針が必須)

| 対象 | 変えるとどうなるか |
| --- | --- |
| `STORAGE_KEY` | 別キーを読みに行き、既存の作品が **全部消えたように見える** |
| `version` | `migrate` 未定義のまま上げると zustand が古い state を捨てる |
| `partialize` | 対象から外したフィールドは次回起動時に存在しない |

変更が避けられない場合の手順:

1. 変更内容と影響範囲を書き出し、ユーザに提示して合意を取る
2. `version` を上げ、**`migrate(persistedState, version)` を必ず実装する**
3. 旧バージョンのデータで読み込み → 表示 → 書き出しまで通ることを確認する
4. 併せて [io.ts](../../../src/lib/io.ts) の `normalize*` も更新し、旧 JSON が読めることを保つ

### `hydrated` フラグ

IndexedDB は非同期。`onRehydrateStorage` で `hydrated: true` になるまで、画面は
「読み込み中…」を出す。**`hydrated` は `partialize` の対象外**なので永続化されない
(毎回 false から始まる) — この性質に依存している。

---

## 4. 型を変更するときのチェックリスト

`types.ts` に手を入れたら、次の順で追従漏れを確認する:

1. [factory.ts](../../../src/lib/factory.ts) — 既定値を追加したか
2. [store.ts](../../../src/lib/store.ts) — 更新操作・削除時の参照掃除が要るか
3. [io.ts](../../../src/lib/io.ts) — `normalize*` で読み込めるか、`withFreshIds` で id を
   張り替える必要があるか
4. コンポーネント — 表示・入力の追従
5. `npx tsc --noEmit` で型エラーがゼロか

**フィールドの追加**は既存データで `undefined` になるだけなので比較的安全。
**削除・意味の変更**は移行が必要 (上記 3 節の手順を踏む)。

---

## 関連ドキュメント

- 書き出し / 読み込み → [03-import-export.md](./03-import-export.md)
- 型の書き方 → [05-type-definition.md](./05-type-definition.md)
- zustand / immer の書き方 → [02-zustand-immer-doc.md](../03-library-docs/02-zustand-immer-doc.md)
