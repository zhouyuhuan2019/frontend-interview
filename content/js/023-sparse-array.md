---
title: 稀疏数组是什么？delete 掉数组元素后 length 会变吗？
subtopic: 数组与对象
difficulty: middle
frequency: low
tags: [稀疏数组, delete, length, 数组遍历, 空洞]
order: 230
related: [js-011-array-methods]
---

`delete` 一个数组元素后，数组会变成什么样？看代码：

```js
const arr = [1, 2, 3]
delete arr[1]

console.log(arr.length)
console.log(arr[1])
console.log(1 in arr)
console.log(arr)
```

## 参考答案

```text output
3
undefined
false
[ 1, <1 empty item>, 3 ]
```

反直觉点：

- `delete arr[1]` **不会**改变 `length`，它仍然是 `3`。
- 被删的位置留下一个「空洞（hole）」：`arr[1]` 读出 `undefined`，但 `1 in arr` 是 `false`——这个位置**根本没有对应属性**。
- 带空洞的数组就叫**稀疏数组**：`length` 与「实际存在的元素个数」不再相等。

## 原理讲解

数组本质是对象，索引是属性。`delete` 删的是属性，不会重排后面的元素，也不会更新 `length`。想真正缩短数组，要用 `splice`，或直接改 `length`。

```js run
// 1. delete 只删属性，不动 length
const arr = [1, 2, 3]
delete arr[1]
console.log('length:', arr.length) // 3
console.log('arr[1]:', arr[1]) // undefined
console.log('1 in arr:', 1 in arr) // false（该位置无属性）
console.log('arr:', arr) // [ 1, <1 empty item>, 3 ]

// 2. 真正的稀疏数组：逗号之间留空 / new Array(n)
const sparse = [1, , 3]
console.log('sparse.length:', sparse.length) // 3
console.log('1 in sparse:', 1 in sparse) // false

// 3. 遍历差异：forEach/map 跳过空洞，普通 for 不跳过
const visited = []
sparse.forEach((v, i) => visited.push(i))
console.log('forEach 访问下标:', visited) // [ 0, 2 ]

const looped = []
for (let i = 0; i < sparse.length; i++) looped.push(i)
console.log('for 访问下标:', looped) // [ 0, 1, 2 ]

// 4. 正确删除并让后续元素前移
const arr2 = [1, 2, 3]
arr2.splice(1, 1)
console.log('splice 后:', arr2, 'length:', arr2.length) // [ 1, 3 ] 2
```

```text output
length: 3
arr[1]: undefined
1 in arr: false
arr: [ 1, <1 empty item>, 3 ]
sparse.length: 3
1 in sparse: false
forEach 访问下标: [ 0, 2 ]
for 访问下标: [ 0, 1, 2 ]
splice 后: [ 1, 3 ] length: 2
```

`console.log('arr:', arr)` 在控制台的显示是 `[ 1, <1 empty item>, 3 ]`，不同引擎格式略有差异（Chrome 可能显示成 `(3) [1, empty, 3]`），关键看 `1 in arr === false` 这条硬指标。

**实际开发中的正确写法**：

1. 删除数组元素并让 `length` 变化，用 `splice(index, 1)`，**别用 `delete`**。
2. 只想把某位置置空但仍保留占位（如撤回某行），用 `arr[index] = undefined`——它保留属性、`length` 不变，且**不是**稀疏数组（`index in arr` 为 `true`）。
3. 别用 `new Array(n)` 当「定长初始化」，它产生的是全空洞数组，`map` / `forEach` 都不执行；要初始化用 `Array(n).fill(0)` 或 `Array.from({ length: n }, () => 0)`。

## 追问与易错点

- **`delete arr[1]` 后 `length` 为什么不变？** 因为 `delete` 删的是对象属性，不触发数组重排与长度更新；只有 `splice` / 改 `length` 才会改变长度。
- **稀疏数组的 `forEach` / `map` 会处理空洞吗？** 不会，它们跳过空洞；而 `for` 循环会走到（读到 `undefined`），`for...of` 也会对空洞产出 `undefined`。
- **怎么区分「空洞」和「真的是 undefined」？** 用 `index in arr` 或 `Object.hasOwn(arr, index)`；仅靠 `arr[index] === undefined` 无法区分。
- **`arr[i] = undefined` 和 `delete arr[i]` 一样吗？** 不一样。前者保留属性（`in` 为 `true`，非稀疏），后者删掉属性（`in` 为 `false`，变稀疏）。
- **稀疏数组被 `JSON.stringify` 会怎样？** 空洞会被序列化成 `null`，例如 `JSON.stringify([1, , 3])` 得到 `'[1,null,3]'`。

## 相关题目

- [js-011-array-methods](/q/js/js-011-array-methods)
