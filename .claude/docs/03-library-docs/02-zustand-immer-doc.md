# zustand + immer + persist — このリポジトリでの書き方

zustand 5 / immer 11 / idb-keyval 6。実装は [src/lib/store.ts](../../../src/lib/store.ts)。
**ストアはこの 1 つだけ。増やさない。**

---

## 1. 構成

```ts
export const useStore = create<StoreState>()(
  persist(
    immer((set) => ({ … })),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ projects: state.projects }) as StoreState,
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
```

ミドルウェアの順序は **`persist(immer(...))`**。逆にすると永続化されるのが immer の
下書き状態になり、正しく保存されない。

`create<StoreState>()(...)` の**空カッコが必要** (zustand 5 のカリー化された型推論。
省略すると型が壊れる)。

---

## 2. state の読み方 (コンポーネント側)

```tsx
const projects = useStore((s) => s.projects);
const updateScene = useStore((s) => s.updateScene);
```

- **セレクタで必要な分だけ取る**。`useStore()` の全体購読はしない
- セレクタ内で新しい配列・オブジェクトを作らない (毎回別参照になり常に再描画される)
- 更新関数は参照が安定しているので、`useEffect` の依存配列にそのまま入れてよい

---

## 3. state の書き方 (ストア側)

### immer の recipe で直接ミューテートする

```ts
set((state) => {
  state.hydrated = true;
});

set((state) => {
  state.projects.unshift(project);
});
```

再代入も可 (`state.projects = state.projects.filter(...)`)。
**recipe から値を return しない** (immer は「ミューテートするか新しい値を返すか」の
どちらか一方しか許さない)。

### 更新は必ずヘルパ経由

```ts
const editProject = (projectId, recipe: (p: Project) => void) =>
  set((state) => {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return;
    recipe(project);
    project.updatedAt = new Date().toISOString();   // 更新日時の付与をここに集約
  });

const editStory = (projectId, storyId, recipe: (s: Story, p: Project) => void) =>
  editProject(projectId, (project) => {
    const story = project.stories.find((s) => s.id === storyId);
    if (story) recipe(story, project);
  });
```

新しい更新操作は `editProject` / `editStory` の上に作る。`set` を直接使うと
`updatedAt` の更新が漏れる。

### 対象が見つからないときは黙って何もしない

```ts
const found = findSceneLocation(story, sceneId);
if (!found) return;
```

削除直後などに普通に起きるため、例外にしない
([04-error-handling.md](../02-development-docs/04-error-handling.md))。

### 新しい id を返す

追加系の操作は、呼び出し側が直後にパネルを開けるよう id を返す:

```ts
addScene: (projectId, storyId, sequenceId) => {
  const scene = createScene();
  editStory(projectId, storyId, (story) => { … });
  return scene.id;
},
```

`editProject` は同期的に実行されるため、recipe の中で外側の変数に代入して返す形も使える
(`addCharacter` がこの形)。

---

## 4. persist

| オプション | 意味 | 注意 |
| --- | --- | --- |
| `name` | ストレージのキー (`storyline-store-v1`) | **変えると既存データが読めなくなる** |
| `version` | スキーマのバージョン | 上げるなら `migrate` を必ず書く |
| `storage` | `createJSONStorage(() => idbStorage)` | IndexedDB (サムネイルが localStorage の 5MB を超えるため) |
| `partialize` | 保存する部分だけ抜き出す | 対象から外したフィールドは保存されない |
| `onRehydrateStorage` | 復元完了フック | `hydrated` を立てる |

### ハイドレーションは非同期

IndexedDB は非同期なので、初回レンダーでは `projects` が空。
`hydrated` が `true` になるまで中身を描かない:

```tsx
if (!hydrated) return <p>読み込み中…</p>;
```

`hydrated` は `partialize` の対象外なので永続化されず、毎回 `false` から始まる
(この性質に依存している)。

### migrate を書く場合

```ts
version: 2,
migrate: (persisted: unknown, version: number) => {
  if (version < 2) { /* 旧形式 → 新形式へ変換 */ }
  return persisted as StoreState;
},
```

**移行の判断基準は
[02-data-model-and-persistence.md](../02-development-docs/02-data-model-and-persistence.md) を
必ず読んでから**。ユーザの作品データは復旧できない。

---

## 5. やらないこと

| 手法 | 理由 |
| --- | --- |
| ストアを機能ごとに分割する | データが 1 つの木なので、整合性の管理コストの方が高い |
| `subscribe` / `getState` をコンポーネントで使う | 再描画が追従しない。フックを使う |
| セレクタで派生値を作る | 参照が毎回変わる。[stats.ts](../../../src/lib/stats.ts) の純粋関数を使う |
| React Context との併用 | 二重管理になる |
