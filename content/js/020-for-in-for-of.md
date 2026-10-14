---
title: for...in 和 for...of 有什么区别？各自有哪些坑？
subtopic: 数组与对象
difficulty: junior
frequency: high
tags: [for-in, for-of, 迭代器, 原型链, 遍历]
order: 200
related: [js-011-array-methods]
---

看这段代码，`for...in` 到底会遍历出什么？为什么多出一个 `myMethod`？

```js
Array.prototype.myMethod = function () {}

const arr = ['a', 'b', 'c']
const keys = []
for (const key in arr) keys.push(key)

console.log(keys)
console.log(keys.length)
```

## 参考答案

```text output
[ '0', '1', '2', 'myMethod' ]
4
```

反直觉点：

- `for...in` 遍历的是**可枚举属性名（字符串键）**，数组的索引是字符串 `'0'`、`'1'`、`'2'`，不是数字。
- 它会**顺着原型链**把 `Array.prototype` 上新增的可枚举属性（`myMethod`）也遍历出来，即使你只关心数组元素。
- `for...of` 走的是**迭代器协议**，遍历的是「值」，原型上的属性不会被带出来。

对比：

| 维度 | for...in | for...of |
| --- | --- | --- |
| 遍历内容 | 可枚举的字符串键（含原型链） | 迭代器产出的「值」 |
| 适用对象 | 对象、数组（数组不推荐） | 任意可迭代对象（数组 / 字符串 / Map / Set） |
| 能否 `break` | 可以 | 可以 |
| 顺序是否可靠 | 整数键有序，其余不保证 | 按迭代器顺序 |

## 原理讲解

`for...in` 枚举的是对象的**可枚举字符串键**，数组的索引正好是字符串键，所以拿到 `'0'`、`'1'`；原型上的可枚举属性同样会被枚举。`for...of` 只认 `[Symbol.iterator]`，普通对象没有这个接口，直接报错。

```js run
Array.prototype.myMethod = function () {}

const arr = ['a', 'b', 'c']

const keys = []
for (const key in arr) keys.push(key)
console.log('for...in:', keys) // 连原型上的 myMethod 一起带出

const values = []
for (const v of arr) values.push(v)
console.log('for...of:', values) // 只有值，不含原型属性

// 普通对象不可迭代，for...of 直接报错
const obj = { x: 1, y: 2 }
const objKeys = []
for (const k in obj) objKeys.push(k)
console.log('for...in 对象:', objKeys)

try {
  for (const v of obj) {}
} catch (e) {
  console.log('for...of 对象报错:', e.name) // TypeError
}
```

```text output
for...in: [ '0', '1', '2', 'myMethod' ]
for...of: [ 'a', 'b', 'c' ]
for...in 对象: [ 'x', 'y' ]
for...of 对象报错: TypeError
```

**实际开发中的正确写法**：

1. 遍历数组用 `for...of`、`forEach`、`map`，别用 `for...in`（会拿到字符串索引 + 原型属性）。
2. 遍历对象用 `for...in` 时加 `Object.hasOwn(obj, key)` 过滤，或直接用 `Object.keys` / `Object.entries`。
3. 需要同时拿索引和值：`for (const [i, v] of arr.entries())`。

## 追问与易错点

- **`for...in` 遍历数组时 `key` 是数字吗？** 不是，是字符串。`key + 1` 会变成拼接，得先 `Number(key)` 或 `parseInt(key)`。
- **修改原型会影响 `for...in` 吗？** 会，只要新增属性可枚举（默认就是），就会被遍历到——这是第三方库污染全局原型的经典坑。
- **`for...in` 的顺序可靠吗？** 整数键（数组索引）按升序，字符串键按插入顺序，但复杂情况下引擎不保证，别依赖。
- **怎么让 `for...of` 遍历普通对象？** 给对象实现 `[Symbol.iterator]`，或先 `Object.entries(obj)` 拿到数组再遍历。
- **字符串能用 `for...of` 吗？** 能，按 Unicode 码点遍历；而 `for...in` 遍历字符串会拿到 `'0'`、`'1'` 这样的下标字符串。

## 相关题目

- [js-011-array-methods](/q/js/js-011-array-methods)
