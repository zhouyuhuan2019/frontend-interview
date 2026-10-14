---
title: 0.1 + 0.2 === 0.3 为什么是 false？金额计算怎么写才不出错？
subtopic: 类型与隐式转换
difficulty: middle
frequency: high
tags: [浮点数, 精度, 金额计算, IEEE754]
order: 140
related: [js-005-type-coercion, js-017-nan-object-is]
---

请先看下面这段代码，猜一下每一行的输出：

```js
console.log(0.1 + 0.2)
console.log(0.1 + 0.2 === 0.3)
console.log(1.005 * 100)
console.log((1.005).toFixed(2))
```

## 参考答案

```text output
0.30000000000000004
false
100.49999999999999
1.00
```

- `0.1 + 0.2` 不等于 `0.3`，而是 `0.30000000000000004`。
- `1.005 * 100` 不是 `100.5`，而是 `100.49999999999999`，`Math.round` 会在这里把你坑掉。
- `(1.005).toFixed(2)` 得到 `'1.00'` 而不是 `'1.01'`——四舍五入在浮点数上也会翻车。

反直觉点逐条对照：

| 表达式 | 直觉 | 实际 |
|---|---|---|
| `0.1 + 0.2` | `0.3` | `0.30000000000000004` |
| `0.1 + 0.2 === 0.3` | `true` | `false` |
| `1.005 * 100` | `100.5` | `100.49999999999999` |
| `(1.005).toFixed(2)` | `'1.01'` | `'1.00'` |

## 原理讲解

JS 的 `number` 是 **IEEE 754 双精度浮点数**：1 位符号 + 11 位阶码 + 52 位尾数，本质是**二进制小数**。而 `0.1`、`0.2`、`0.3` 在二进制里都是无限循环小数，存进去时就被截断成近似值，相加后误差累积，于是得到一个"长得像 0.3 但不是 0.3"的数。

```js run
// 反直觉现场：误差真实存在
console.log(0.1 + 0.2)              // 0.30000000000000004
console.log(0.1 + 0.2 === 0.3)      // false
console.log(1.005 * 100)            // 100.49999999999999
console.log((1.005).toFixed(2))     // 1.00（不是 1.01）

// 正确写法 1：比较用误差容忍，而不是 ===
const nearlyEqual = (a, b) => Math.abs(a - b) < Number.EPSILON
console.log(nearlyEqual(0.1 + 0.2, 0.3)) // true

// 正确写法 2：金额转成整数「分」再运算
const toCents = (yuan) => Math.round(yuan * 100)
const fromCents = (cents) => cents / 100

console.log(fromCents(toCents(0.1) + toCents(0.2))) // 0.3
```

```text output
0.30000000000000004
false
100.49999999999999
1.00
true
0.3
```

**实际开发中的正确写法：**

- **金额一律用最小单位的整数表示**（分/厘）：`10.1` 元存成 `1010` 分，加减乘除全在整数域完成，展示时再除回去。前端与后端统一单位，从源头避免小数参与运算。
- **比较浮点数用误差容忍**：`Math.abs(a - b) < Number.EPSILON`（或按量级取 `1e-9`），绝不用 `===`。
- **用户输入的小数用字符串解析**，或直接引入 `decimal.js` / `big.js` / `currency.js` 这类十进制库。`toFixed` 和 `Math.round(y * 100)` 在 `1.005` 这类边界上同样会翻车。

## 追问与易错点

- **`toFixed` 是四舍五入吗？** 不是严格四舍五入。`(1.005).toFixed(2)` 是 `'1.00'`，因为它先把 `1.005` 存成近似值再截断。它返回的是**字符串**，别拿来做数值运算。
- **`Number.EPSILON` 能搞定一切比较吗？** 不能。它只适用于接近 1 的量级；大数（如 `1e20`）的误差远大于 EPSILON。稳妥写法是按量级取阈值：`Math.abs(a - b) <= Number.EPSILON * Math.max(1, Math.abs(a), Math.abs(b))`。
- **换成别的语言也 false 吗？** IEEE 754 是通用标准，Python / Java 的 `double` 表现一致（Python 里 `0.1 + 0.2` 同样是 `0.30000000000000004`）。
- **整数运算就一定安全吗？** 不一定。超过 `Number.MAX_SAFE_INTEGER`（`2^53 - 1`）后整数也不精确；金额用"分"时注意别溢出，必要时用 `BigInt`（但不能与小数混用）。
- **`toFixed` 返回字符串会有什么实际 bug？** `a.toFixed(2) + b.toFixed(2)` 会变成字符串拼接（`'1.00' + '2.00'` = `'1.002.00'`），必须先用 `Number()` 转回来。

## 相关题目

- [js-005-type-coercion](/q/js/js-005-type-coercion)
- [js-017-nan-object-is](/q/js/js-017-nan-object-is)
