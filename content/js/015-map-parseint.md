---
title: 数组 map(parseInt) 为什么会得到奇怪结果？[1,2,3].map(parseInt) 输出什么？
subtopic: 数组与对象
difficulty: middle
frequency: high
tags: [数组方法, map, parseInt, 回调参数]
order: 150
related: [js-011-array-methods, js-005-type-coercion]
---

先不看答案，猜一下这两行的输出：

```js
console.log(['1', '2', '3'].map(parseInt))
console.log([1, 2, 3].map(parseInt))
```

## 参考答案

```text output
[1, NaN, NaN]
[1, NaN, NaN]
```

- 直觉上会得到 `[1, 2, 3]`，实际是 `[1, NaN, NaN]`。
- 罪魁祸首不是 `parseInt` 也不是 `map`，而是**它们的参数签名刚好错位**。

反直觉点逐条对照：

| 表达式 | 直觉 | 实际 | 原因 |
|---|---|---|---|
| `['1','2','3'].map(parseInt)` | `[1,2,3]` | `[1,NaN,NaN]` | 第二个参数被当成进制 |
| `['10','10','10'].map(parseInt)` | `[10,10,10]` | `[10,NaN,2]` | 进制依次是 10、1、2 |
| `[1,2,3].map(parseInt)` | `[1,2,3]` | `[1,NaN,NaN]` | 同上 |

## 原理讲解

`Array.prototype.map` 的回调签名是 `(element, index, array)`，会给回调传三个参数。而 `parseInt(string, radix)` 的第二个参数是**进制**。于是：

- 第 1 次：`parseInt('1', 0, [...])` → `radix` 为 `0` 时按 10 进制处理 → `1`。
- 第 2 次：`parseInt('2', 1, [...])` → `radix` 为 `1` 不是合法进制（合法范围 2~36）→ `NaN`。
- 第 3 次：`parseInt('3', 2, [...])` → 按 2 进制解析，`'3'` 不是合法二进制 → `NaN`。

```js run
// 反直觉现场：数组索引被当成进制传了进去
const a = ['1', '2', '3'].map(parseInt)
const b = ['10', '10', '10'].map(parseInt)
console.log('a:', a.join(', '))   // a: 1, NaN, NaN
console.log('b:', b.join(', '))   // b: 10, NaN, 2

// 正确写法：显式传进制，或用 Number 做整体转换
console.log('map(Number):', ['1', '2', '3'].map(Number).join(', ')) // 1, 2, 3
console.log('parseInt 10:', ['1', '2', '3'].map((s) => parseInt(s, 10)).join(', ')) // 1, 2, 3
```

```text output
a: 1, NaN, NaN
b: 10, NaN, 2
map(Number): 1, 2, 3
parseInt 10: 1, 2, 3
```

**实际开发中的正确写法：**

- 要用 `parseInt` 就必须**显式传进制**：`.map((s) => parseInt(s, 10))`；整体数值转换直接用 `.map(Number)`。
- 更本质的教训：**把命名函数当回调直接传**时，先确认它的签名和回调签名一致。`['1','2'].map(Number)` 安全；`['1','2'].map(Boolean)`、`.map(parseInt)` 则要逐一看。
- 通用解法是用箭头函数包一层，把多余参数挡掉，避免被意外消费。

## 追问与易错点

- **`parseInt('10', 2)` 等于多少？** 等于 `2`。这正是 `['10','10','10'].map(parseInt)` 得到 `[10, NaN, 2]` 的原因。
- **`map(parseFloat)` 会出问题吗？** 不会。`parseFloat` 只接收一个参数，多余的 `index` 会被忽略，`['1','2'].map(parseFloat)` 是 `[1, 2]`。
- **`map(Number)` 和 `map(parseInt)` 有什么区别？** `Number` 做整体转换，`Number('12px')` 是 `NaN`；`parseInt` 从左往右解析，`parseInt('12px')` 是 `12`。要不要"宽松解析"取决于业务。
- **为什么它静默出错而不报错？** 因为非法 `radix` 只会让 `parseInt` 返回 `NaN`，不抛异常——这正是它危险的地方。
- **其他数组方法也会踩同样的坑吗？** 会。`forEach`、`filter`、`reduce` 的回调都带额外参数。`arr.map(Boolean)` 会把 `0`、`''` 转成 `false`；凡是"直接传命名函数"都得对签名。

## 相关题目

- [js-011-array-methods](/q/js/js-011-array-methods)
- [js-005-type-coercion](/q/js/js-005-type-coercion)
