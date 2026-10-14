---
title: JSON.stringify / JSON.parse 有哪些坑（undefined、NaN、循环引用、BigInt）？
subtopic: 数组与对象
difficulty: middle
frequency: high
tags: [JSON, 序列化, 循环引用, BigInt]
order: 180
related: [js-013-typeof-instanceof, js-005-type-coercion]
---

先看下面这段代码，猜猜每一行会发生什么：

```js
const obj = { a: undefined, b: () => {}, c: 1 }
console.log(JSON.stringify(obj))

console.log(JSON.stringify([undefined, () => {}, Symbol('s')]))
console.log(JSON.stringify({ n: NaN, i: Infinity }))
console.log(JSON.stringify({ big: 1n }))
```

## 参考答案

```text output
{"c":1}
[null,null,null]
{"n":null,"i":null}
Uncaught TypeError: Do not know how to serialize a BigInt
```

- `undefined`、函数、`Symbol` 在**对象**里会被丢弃，在**数组**里会被转成 `null`。
- `NaN`、`Infinity`、`-Infinity` 没有 JSON 表示，一律变成 `null`。
- `BigInt` 无法序列化，直接抛 `TypeError`。
- 循环引用会抛 `TypeError: Converting circular structure to JSON`。

反直觉点逐条对照：

| 输入 | 直觉 | 实际 |
|---|---|---|
| `JSON.stringify({ a: undefined, c: 1 })` | 保留 `a` | `{"c":1}`（键被丢弃） |
| `JSON.stringify([undefined])` | `[]` | `[null]` |
| `JSON.stringify(NaN)` | `NaN` | `null` |
| `JSON.stringify({ big: 1n })` | `{"big":1}` | 抛 `TypeError` |

## 原理讲解

`JSON.stringify` 遍历对象时遵循一套固定的"删除/替换"规则：对象属性值为 `undefined`、函数、Symbol 时**跳过该键**；数组元素出现这些值时**替换为 `null`**；`NaN`/`Infinity` 一律替换为 `null`；`BigInt` 不在 JSON 支持的类型内，直接抛错；循环引用因无法终止遍历而抛错。

```js run
// 对象里：undefined / 函数 / Symbol 被丢弃
console.log(JSON.stringify({ a: undefined, b: () => {}, c: 1 })) // {"c":1}

// 数组里：它们变成 null
console.log(JSON.stringify([undefined, () => {}, Symbol('s')])) // [null,null,null]

// NaN / Infinity 变成 null
console.log(JSON.stringify({ n: NaN, i: Infinity }))           // {"n":null,"i":null}

// BigInt 直接抛错
try {
  JSON.stringify({ big: 1n })
} catch (e) {
  console.log('BigInt:', e.name)                               // BigInt: TypeError
}

// 循环引用直接抛错
const obj = {}
obj.self = obj
try {
  JSON.stringify(obj)
} catch (e) {
  console.log('循环引用:', e.name)                             // 循环引用: TypeError
}

// JSON.parse 的坑：null 参数会先转成字符串 'null' 再解析
console.log(JSON.parse(null))                                  // null
```

```text output
{"c":1}
[null,null,null]
{"n":null,"i":null}
BigInt: TypeError
循环引用: TypeError
null
```

**实际开发中的正确写法：**

- **发请求/写缓存前先规整数据**：`undefined` 用默认值补齐，`NaN` 明确用 `null` 或 `0` 表示，别让它"静默消失"。
- **不要直接 `JSON.stringify` 深层对象**：先用 `WeakSet` 记录已访问对象，遇到循环引用就替换成 `'[Circular]'`，或改用支持循环结构的库。
- **BigInt 要么转字符串**（`v.toString()`，接收端 `BigInt(...)` 还原），**要么换 `number`**（注意精度），不要直接序列化。
- **`JSON.parse` 一定 `try/catch`**：空字符串、单引号、尾逗号、注释都会抛 `SyntaxError`。
- 需要保留类型时用 `structuredClone`（但它不能存函数），而不是 JSON。

## 追问与易错点

- **`JSON.stringify(undefined)` 返回什么？** 返回 `undefined`（不是字符串 `'undefined'`）。顶层是 `undefined`、函数、Symbol 时都返回 `undefined`。
- **`JSON.parse('undefined')` 呢？** 抛 `SyntaxError`。JSON 只认 `null`，所以对象里的 `undefined` 往返一圈后键会消失。
- **日期怎么办？** `JSON.stringify(new Date(0))` 会调用 `Date.prototype.toJSON`，得到 ISO 字符串 `"1970-01-01T00:00:00.000Z"`；`JSON.parse` 回来是字符串而非 Date，需手动 `new Date()` 还原。
- **`JSON.stringify` 会改变键的顺序吗？** 会。整数式键会被排到前面并按升序，其余键保持插入顺序。
- **`toJSON` 有什么用？** 对象可自定义 `toJSON()`，`JSON.stringify` 会优先调用它——这是控制序列化结果的正规钩子。

## 相关题目

- [js-013-typeof-instanceof](/q/js/js-013-typeof-instanceof)
- [js-005-type-coercion](/q/js/js-005-type-coercion)
