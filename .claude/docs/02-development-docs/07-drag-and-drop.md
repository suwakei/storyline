# ドラッグ & ドロップ (カンバン)

@dnd-kit/core + @dnd-kit/sortable。実装は
[Board.tsx](../../../src/components/board/Board.tsx) /
[SequenceColumn.tsx](../../../src/components/board/SequenceColumn.tsx) /
[SceneCard.tsx](../../../src/components/board/SceneCard.tsx)。

**ここは storyline で最も壊れやすい箇所**。触る前に全体像を把握すること。

---

## 1. 何がドラッグできるか

| 対象 | id | `data` | 並べ替え戦略 |
| --- | --- | --- | --- |
| シーン (カード) | `scene.id` | `{ type: "scene", sequenceId, index }` | `verticalListSortingStrategy` |
| シークエンス (列) | `sequence.id` | `{ type: "sequence" }` | `horizontalListSortingStrategy` |
| 列のドロップ領域 | `col:<sequence.id>` | `{ type: "column", sequenceId }` | (`useDroppable` のみ) |

`DndContext` は `Board` に 1 つだけ。`collisionDetection` は `closestCorners`
(列跨ぎの判定が素直になる)。

センサーは `PointerSensor` + `activationConstraint: { distance: 6 }`。
**この距離制約がカードのクリック (シーンを開く) とドラッグを両立させている**。外すと
クリックでシーンが開かなくなる。

---

## 2. `data` 契約が全て

ドロップ先の解決は `over.data.current.type` の分岐だけで行う。
**新しいドラッグ対象を足すときは、必ず `type` と必要な情報を `data` に載せる。**

```ts
const resolveTarget = (over) => {
  if (data?.type === "scene")    return { sequenceId: data.sequenceId, index: data.index };
  if (data?.type === "column")   return { sequenceId: data.sequenceId, index: APPEND };
  if (data?.type === "sequence") return { sequenceId: String(over.id), index: APPEND };
  return null;
};
```

`APPEND = Number.MAX_SAFE_INTEGER` は「末尾に入れる」ことを表す番兵。
`store.moveScene` 側で `Math.min(toIndex, target.scenes.length)` に丸められる。

---

## 3. 3 つのハンドラの役割分担

| ハンドラ | 役割 |
| --- | --- |
| `onDragStart` | ドラッグ対象を state に控える (`DragOverlay` 用)。シーンは通し番号も計算 |
| `onDragOver` | **列を跨いだ瞬間に実際に移動する** (同一列なら何もしない) |
| `onDragEnd` | 列の並べ替え、または**同一列内**のシーン並べ替え |

`onDragOver` で先に移動しているため、`onDragEnd` の時点で
「元の列 = ドロップ先の列」になっている。だから `onDragEnd` のシーン処理は
`target.sequenceId !== fromSequenceId` を弾く形になっている。

**この二段構えを理解せずに片方だけ直すと、「列を跨ぐと末尾に飛ぶ」「戻ってくる」
といった不具合になる。**

---

## 4. シーン通し番号 (S1, S2, …)

番号はストーリー全体の連番で、列ごとの offset を `Board` で計算して渡す。

```ts
const offsets: number[] = [];
for (let i = 0, running = 0; i < story.sequences.length; i += 1) {
  offsets.push(running);
  running += story.sequences[i].scenes.length;
}
```

`SequenceColumn` は `numberOffset` を受け取り、`numberOffset + index + 1` を表示する。
**番号はデータに保存しない** (並べ替えるたびに全件更新が必要になるため)。

---

## 5. `DragOverlay`

ドラッグ中のプレビューは `DragOverlay` に `SceneCardBody` を描く (`dropAnimation={null}`)。
本体側は `opacity-40` で薄くなる。列のドラッグではオーバーレイを出さない
(列自体が `transform` で動くため)。

---

## 6. 変更時の確認シナリオ

自動テストが無いため、次のシナリオをユーザに確認してもらう:

1. 同一列内でカードを上下に並べ替える
2. 別の列の**カードの上**にドロップする (その位置に入る)
3. 別の列の**空きスペース**にドロップする (末尾に入る)
4. **空の列**にドロップする
5. 列そのものを左右に並べ替える
6. カードを**クリック**する (ドラッグにならずシーンが開く)
7. 上記の後にリロードして順序が保持されている

---

## 7. 注意点

- `SortableContext` の `items` は id の配列。**列の中身が変わったら再計算されること**を前提に
  `sequence.scenes.map((s) => s.id)` を毎回渡している
- カードのラッパは `touch-none` (タッチデバイスでのスクロール競合回避)
- `SceneCard` の `onClick` はドラッグ完了時にも発火しうるが、`activationConstraint` により
  実質的に分離されている
- ドラッグ処理はストアを直接叩く (`moveScene` / `moveSequence`)。ローカル state に
  並びを持たない (二重管理になるため)

---

## 関連ドキュメント

- dnd-kit の書き方 → [03-dnd-kit-doc.md](../03-library-docs/03-dnd-kit-doc.md)
- ストア操作 → [02-data-model-and-persistence.md](./02-data-model-and-persistence.md)
