---
title: 手写数组扁平化 flat
subtopic: 数组与对象
difficulty: junior
frequency: high
tags: [手写, 数组, flat, 递归, 扁平化]
order: 60
---

请实现 `flat(arr, depth)`，把嵌套数组拍平为一维，要求：

- `depth` 控制展开层数，默认 1；传 `Infinity` 表示全部展开；
- 不改变原数组，返回新数组；
- 非数组元素原样保留。

## 参考答案

```js run
function flat(arr, depth = 1) {
  const result = []
  for (const item of arr) {
    if (Array.isArray(item) && depth > 0) {
      result.push(...flat(item, depth - 1)) // 是数组且深度未用完：继续展开
    } else {
      result.push(item) // 深度用完时数组元素也原样保留
    }
  }
  return result
}

const nested = [1, [2, [3, [4]]]]

console.log('默认 depth=1:', JSON.stringify(flat(nested)))
console.log('depth=2:', JSON.stringify(flat(nested, 2)))
console.log('depth=Infinity:', JSON.stringify(flat(nested, Infinity)))
console.log('原数组不变:', JSON.stringify(nested))
console.log('非数组元素保留:', JSON.stringify(flat([1, ['a', [null, [undefined]]]])))
```

```text output
默认 depth=1: [1,2,[3,[4]]]
depth=2: [1,2,3,[4]]
depth=Infinity: [1,2,3,4]
原数组不变: [1,[2,[3,[4]]]]
非数组元素保留: [1,"a",[null,[null]]]
```

注意最后一行：内层数组里的 `undefined` 在 `JSON.stringify` 中会被序列化成 `null`，实际值仍是 `undefined`；其余元素原样保留。

## 原理讲解

1. **递归的核心**：遍历数组，遇到「是数组且 `depth > 0`」的元素，就把它递归展开的结果用扩展运算符摊开 push 进结果；否则原样 push。
2. **`depth` 的传递**：每递归一层 `depth - 1`，减到 0 时数组元素不再展开，实现「只展开 N 层」。`Infinity - 1` 仍是 `Infinity`，所以传 `Infinity` 天然支持完全展开，不需要特判。
3. **为什么用 `Array.isArray` 而不是 `instanceof`**：跨 iframe / 跨 realm 时 `instanceof` 会失效，`Array.isArray` 更稳妥。
4. **一行流版本**（面试加分项，利用 `reduce`）：

```js run
const flatOneLine = (arr, depth = 1) =>
  arr.reduce(
    (acc, item) =>
      acc.concat(Array.isArray(item) && depth > 0 ? flatOneLine(item, depth - 1) : item),
    []
  )

console.log('reduce 版:', JSON.stringify(flatOneLine([1, [2, [3]]], Infinity)))
```

5. **原生方法**：ES2019 的 `Array.prototype.flat(depth)` 行为与此一致，另外还有 `flatMap`（先 map 再拍平一层）。面试写完手写版记得提一句原生 API。

## 追问与易错点

- **数组里有空槽（稀疏数组）怎么办？** 原生 `flat` 会跳过空槽；`for...of` 遍历会把空槽读成 `undefined`。面试提及即可，可用 `for` + 下标并检查 `i in arr` 来精确模拟。
- **`Infinity` 需要特判吗？** 不需要，`Infinity - 1` 还是 `Infinity`，递归条件 `depth > 0` 恒真，自然完全展开。
- **不用递归能写吗？** 可以，用栈迭代：不断把数组元素弹栈，是数组就展开压栈，否则收集；或者利用 `while (arr.some(Array.isArray))` 循环 `concat` 展开。迭代版可规避深层递归的栈溢出。
- **「奇技淫巧」版有哪些？各自的问题？** `[].concat(...arr)` 只能拍平一层；`arr.toString().split(',')` 会把所有元素变成字符串且无法处理对象；`JSON.stringify` 再替换括号会破坏数据类型。这些只能作为思路展示，不能用于生产。
- **扁平化的逆操作（数组转树）怎么考？** 常和本题连着问：给定带 `id` / `parentId` 的扁平数组还原成树，核心是用 map 记录 id → 节点，遍历一次挂载 children。

## 相关题目

- [handwriting-003-deep-clone](/q/handwriting/handwriting-003-deep-clone)
