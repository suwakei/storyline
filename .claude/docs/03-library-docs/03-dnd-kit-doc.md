# dnd-kit — このリポジトリでの書き方

@dnd-kit/core 6 / @dnd-kit/sortable 10 / @dnd-kit/utilities 3。
設計意図と確認シナリオは
[07-drag-and-drop.md](../02-development-docs/07-drag-and-drop.md) を先に読む。

---

## 1. 全体構造

```
DndContext                      … Board.tsx に 1 つだけ
└─ SortableContext (horizontal) … 列の並べ替え
   └─ SequenceColumn            … useSortable (列自身) + useDroppable (列の中身)
      └─ SortableContext (vertical)
         └─ SortableSceneCard   … useSortable (カード)
DragOverlay                     … ドラッグ中のプレビュー
```

```tsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCorners}
  onDragStart={…}
  onDragOver={…}
  onDragEnd={…}
  onDragCancel={() => setDragging(null)}
>
```

`closestCorners` を使うのは、列を跨いだときの判定が `closestCenter` より素直なため。

---

## 2. センサー

```ts
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
);
```

`distance: 6` が **クリック (シーンを開く) とドラッグの分離**を担っている。
外すとカードがクリックできなくなる。

キーボード操作は未対応。対応するなら `KeyboardSensor` + `sortableKeyboardCoordinates` を足す。

---

## 3. `data` に型と位置を載せる

ドロップ先の解決は `data.type` の分岐だけで行うため、**すべてのドラッグ可能要素と
ドロップ領域に `data` を付ける**。

```ts
useSortable({ id: scene.id, data: { type: "scene", sequenceId, index } });
useSortable({ id: sequence.id, data: { type: "sequence" } });
useDroppable({ id: `col:${sequence.id}`, data: { type: "column", sequenceId } });
```

`useDroppable` の id に `col:` 接頭辞を付けているのは、シーン / シークエンスの id と
衝突させないため。

---

## 4. transform の適用

```tsx
import { CSS } from "@dnd-kit/utilities";

style={{ transform: CSS.Translate.toString(transform), transition }}
```

`CSS.Transform` ではなく **`CSS.Translate`** を使う (拡大縮小を入れないため)。
既存コードと揃える。

---

## 5. ハンドラの分担 (重要)

| ハンドラ | 何をするか |
| --- | --- |
| `onDragStart` | `DragOverlay` 用に対象を控える |
| `onDragOver` | **列を跨いだ瞬間にストアを更新する** (同一列は無視) |
| `onDragEnd` | 列の並べ替え / **同一列内**のカード並べ替え |

列跨ぎを `onDragOver` で先に処理しているため、`onDragEnd` に到達した時点で
移動元と移動先は同じ列になっている。**片方だけ直すと挙動が壊れる。**

末尾挿入は番兵 `APPEND = Number.MAX_SAFE_INTEGER` で表し、ストア側で
`Math.min(toIndex, target.scenes.length)` に丸める。

---

## 6. `SortableContext` の items

```tsx
<SortableContext items={sequence.scenes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
```

- `items` は **id の配列**。オブジェクトを渡さない
- ストアの並びから毎回生成する (ローカル state に並びを持たない)
- 戦略: 列 = `horizontalListSortingStrategy` / カード = `verticalListSortingStrategy`

---

## 7. `DragOverlay`

```tsx
<DragOverlay dropAnimation={null}>
  {dragging?.type === "scene" ? <SceneCardBody … dragging /> : null}
</DragOverlay>
```

- カードの見た目は本体と同じコンポーネント (`SceneCardBody`) を再利用する
- `dropAnimation={null}` — ストアが即座に更新されるので、戻るアニメは邪魔になる
- 列のドラッグではオーバーレイを出さない (列自体が transform で動く)

---

## 8. スタイル上の約束

| 状態 | クラス |
| --- | --- |
| ドラッグ中のカード (本体) | `opacity-40` |
| ドラッグ中の列 | `opacity-50` |
| オーバーレイのカード | `rotate-1 shadow-lg` |
| ドロップ先の列 | `bg-accent/5` |
| ドラッグ可能な要素 | `cursor-grab touch-none` |

`touch-none` はタッチデバイスでのスクロール競合を防ぐために必須。

---

## 9. よくある壊し方

| 症状 | 原因 |
| --- | --- |
| ドロップすると必ず末尾に飛ぶ | `resolveTarget` が `column` 分岐に落ちている / `data.index` が無い |
| 列を跨ぐと元に戻る | `onDragOver` と `onDragEnd` で二重に移動している |
| カードがクリックできない | `activationConstraint` を外した |
| 並べ替えても保存されない | ローカル state で並べ、ストアを更新していない |
| 空の列にドロップできない | `useDroppable` の領域が高さ 0 (プレースホルダを消した) |
