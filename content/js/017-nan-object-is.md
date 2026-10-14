---
title: NaN 为什么不等于自身？Object.is 和 === 有什么区别？
subtopic: 类型与隐式转换
difficulty: junior
frequency: medium
tags: [NaN, Object.is, 相等比较, SameValueZero]
order: 170
related: [js-005-type-coercion, js-013-typeof-instanceof]
---

先猜一下下面几行的输出：

```js
console.log(NaN === NaN)
console.log(Object.is(NaN, NaN))
console.log([NaN].indexOf(NaN))
console.log([NaN].includes(NaN))
console.log(Object.is(0, -0))
```

## 参考答案

```text output
false
true
-1
true
false
```

- `NaN === NaN` 是 `false`：NaN 是唯一"不等于自身"的值。
- `Object.is(NaN, NaN)` 是 `true`：它用另一套相等规则（SameValue）。
- `[NaN].indexOf(NaN)` 是 `-1`（用严格相等，找不到），`[NaN].includes(NaN)` 是 `true`（用 SameValueZero，找得到）。
- `Object.is(0, -0)` 是 `false`，而 `0 === -0` 是 `true`。

反直觉点逐条对照：

| 表达式 | 结果 | 使用的相等规则 |
|---|---|---|
| `NaN === NaN` | `false` | 严格相等（Strict Equality） |
| `Object.is(NaN, NaN)` | `true` | SameValue |
| `[NaN].indexOf(NaN)` | `-1` | 严格相等 |
| `[NaN].includes(NaN)` | `true` | SameValueZero |
| `0 === -0` | `true` | 严格相等 |
| `Object.is(0, -0)` | `false` | SameValue |

## 原理讲解

`NaN` 是 IEEE 754 定义的"非数"（Not a Number），规范强制它和任何值比较都返回 `false`，包括它自己，所以 `NaN === NaN` 与 `NaN == NaN` 都是 `false`。JS 专门提供 `Number.isNaN` 来判断某个值是否为 NaN，而不是靠比较。

`Object.is` 使用 **SameValue** 算法，与 `===` 只有两处不同：`Object.is(NaN, NaN)` 为 `true`，`Object.is(0, -0)` 为 `false`。`includes`、`Map`/`Set` 的键比较用 **SameValueZero**，它与 SameValue 的唯一区别是"不区分 +0 和 -0"。

```js run
console.log('NaN === NaN:', NaN === NaN)               // false
console.log('Object.is NaN:', Object.is(NaN, NaN))     // true
console.log('indexOf NaN:', [NaN].indexOf(NaN))        // -1
console.log('includes NaN:', [NaN].includes(NaN))      // true
console.log('0 === -0:', 0 === -0)                     // true
console.log('Object.is 0/-0:', Object.is(0, -0))       // false
console.log('Set has NaN:', new Set([NaN]).has(NaN))   // true
```

```text output
NaN === NaN: false
Object.is NaN: true
indexOf NaN: -1
includes NaN: true
0 === -0: true
Object.is 0/-0: false
Set has NaN: true
```

**实际开发中的正确写法：**

- 判断是不是 NaN 用 **`Number.isNaN(x)`**（不做隐式转换），不要用全局 `isNaN`（会先转数字，`isNaN('abc')` 也是 `true`）。
- 需要在数组/集合里"找到 NaN"时，用 `includes`、`Set`、`Map`，而不是 `indexOf`。
- 需要严格区分 `+0` 和 `-0`（少见但存在，比如判断 `1 / x` 的符号）时，用 `Object.is`。
- 想自定义"近似相等"就别指望内置，直接写 `Math.abs(a - b) < eps`（参见浮点数精度题）。

## 追问与易错点

- **`isNaN('abc')` 为什么是 true？** 全局 `isNaN` 会先做 `Number('abc')` 得到 NaN 再判断，所以任何转不成数字的东西都为 true；`Number.isNaN('abc')` 则是 `false`，因为它不做转换。
- **`Object.is` 和 `===` 完全等价吗？** 不。只差两点：NaN 相等、±0 不等，其余一致。
- **SameValueZero 和 SameValue 差在哪？** 只差对 ±0 的处理：SameValueZero 认为 `+0` 和 `-0` 相等，SameValue 认为不等；两者都认为 `NaN` 等于 `NaN`。
- **NaN 是怎么产生的？** 常见来源：`Number('abc')`、`0 / 0`、`Infinity - Infinity`、`Math.sqrt(-1)`，以及解析失败的各种数值转换。
- **`JSON.stringify(NaN)` 是什么？** `null`。NaN 在 JSON 里没有表示，序列化时会被转成 null，这是另一个高频坑。

## 相关题目

- [js-005-type-coercion](/q/js/js-005-type-coercion)
- [js-013-typeof-instanceof](/q/js/js-013-typeof-instanceof)
