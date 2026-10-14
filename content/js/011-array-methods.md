---
title: map/filter/reduce 有哪些高频考点？reduce 能做什么？
subtopic: 数组与对象
difficulty: junior
frequency: medium
tags: [数组方法, map, filter, reduce]
order: 110
related: [js-012-es6-features]
---

## 参考答案

| 方法 | 返回值 | 回调签名 | 改变原数组 |
|---|---|---|---|
| `map` | 等长新数组 | `(item, index, arr)` | 否 |
| `filter` | 筛选后的新数组 | 同上，返回 truthy 保留 | 否 |
| `reduce` | 任意累积值 | `(acc, item, index, arr)` | 否 |

- `map` 负责**变换**，`filter` 负责**筛选**，`reduce` 是**折叠**——理论上所有数组操作都能用 reduce 实现。
- `reduce` 高频用途：求和、扁平化、分组、计数、去重、函数组合（compose/pipe）。

## 原理讲解

基础用法：

```js run
const nums = [1, 2, 3, 4]

console.log(nums.map(n => n * 2)) // [2, 4, 6, 8]
console.log(nums.filter(n => n % 2 === 0)) // [2, 4]
console.log(nums.reduce((acc, n) => acc + n, 0)) // 10
```

reduce 的经典玩法：

```js run
const arr = [1, 2, 2, 3, [4, 5]]

// 1. 计数
const count = arr.reduce((acc, n) => {
  if (typeof n === 'number') acc[n] = (acc[n] || 0) + 1
  return acc
}, {})
console.log('计数:', JSON.stringify(count)) // {"1":1,"2":2,"3":1}

// 2. 扁平化（一层）
const flat = arr.reduce((acc, n) => acc.concat(n), [])
console.log('扁平:', flat) // [1, 2, 2, 3, 4, 5]

// 3. 去重
const unique = flat.reduce((acc, n) => (acc.includes(n) ? acc : [...acc, n]), [])
console.log('去重:', unique) // [1, 2, 3, 4, 5]
```

按字段分组（后端数据加工常见）：

```js run
const users = [
  { name: '张三', role: 'admin' },
  { name: '李四', role: 'user' },
  { name: '王五', role: 'admin' }
]
const byRole = users.reduce((acc, u) => {
  ;(acc[u.role] = acc[u.role] || []).push(u.name)
  return acc
}, {})
console.log('按角色分组:', JSON.stringify(byRole)) // {"admin":["张三","王五"],"user":["李四"]}
```

经典陷阱：`map` 的回调会收到三个参数，第二参数是下标：

```js run
// parseInt 的第二个参数是进制，下标被误传成了进制
console.log(['1', '2', '3'].map(parseInt)) // [1, NaN, NaN]
console.log(['1', '2', '3'].map(Number)) // [1, 2, 3]
console.log(['1', '2', '3'].map(s => parseInt(s))) // [1, 2, 3]
```

## 追问与易错点

- **reduce 不传初始值会怎样？** 会把第一个元素当初始 acc，从第二个元素开始迭代；**空数组不传初始值会直接抛 TypeError**。建议始终显式传初始值，类型也更可控。
- **map/filter 能中途 break 吗？** 不能，必须遍历完。需要提前退出请用 `for...of`、`some`、`every` 或 `find`。
- **map 和 forEach 的区别？** `map` 返回新数组、可链式调用；`forEach` 返回 `undefined`，只适合纯副作用。
- **这些方法处理稀疏数组？** `map/filter/reduce` 都会跳过 empty 空位；但 `map` 结果仍保留空位，长度不变。
- **哪些数组方法会改原数组？** `push/pop/shift/unshift/splice/sort/reverse/fill` 是原地修改；`map/filter/concat/slice/toSorted` 等返回新数组，别记混。

## 相关题目

- [js-012-es6-features](/q/js/js-012-es6-features)
