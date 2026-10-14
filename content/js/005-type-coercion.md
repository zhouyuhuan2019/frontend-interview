---
title: == 与 === 的区别？[] == ![] 为什么是 true？
subtopic: 类型与隐式转换
difficulty: middle
frequency: high
tags: [隐式转换, 相等比较, 类型转换, ToPrimitive]
order: 50
related: [js-013-typeof-instanceof]
---

请写出下列表达式的输出结果，并说明原因：

```js
console.log([] == ![])
console.log('1' == 1)
console.log(null == undefined)
console.log(null === undefined)
```

## 参考答案

```text output
true
true
true
false
```

- `===` 是严格相等：类型不同直接返回 `false`，不做任何转换。
- `==` 是宽松相等：类型不同会先按规则做隐式类型转换再比较。
- `[] == ![]` 为 `true` 的核心链路：`![]` → `false`，`[]` 转原始值 → `''`，两边再都转成数字 `0 == 0`。

`==` 的转换规则速记：

| 两边类型 | 规则 |
|---|---|
| 相同类型 | 直接比较（NaN 例外，不等于任何值） |
| null 与 undefined | 互等为 true，且不等于其他任何值 |
| 数字 vs 字符串 | 字符串转数字 |
| 布尔参与 | 布尔先转数字 |
| 对象 vs 原始值 | 对象做 ToPrimitive（先 valueOf 后 toString）再比 |

## 原理讲解

逐步还原 `[] == ![]` 的比较过程：

```js run
// 第 1 步：! 运算符先把 [] 转布尔，对象是 truthy，取反为 false
console.log('![] =', ![]) // false

// 第 2 步：[] 与布尔比较，对象先做 ToPrimitive
console.log('[].toString() =', JSON.stringify([].toString())) // ""

// 第 3 步：布尔 false 转数字为 0，'' 转数字也为 0
console.log('Number(false) =', Number(false)) // 0
console.log("Number('') =", Number('')) // 0

// 第 4 步：0 == 0，成立
console.log('最终结果: [] == ![] →', [] == ![]) // true
```

再看一组高频"反直觉"案例：

```js run
console.log(0 == '')         // true：'' 转数字是 0
console.log(0 == '0')        // true：'0' 转数字是 0
console.log('' == '0')       // false：同类型字符串直接比，内容不同
console.log(NaN == NaN)      // false：NaN 不等于任何值
console.log([1, 2] == '1,2') // true：数组 toString 后变成 '1,2'
console.log([] == [])        // false：两个不同对象，引用地址不同
```

注意最后一行：`==` 对两个引用类型比较的是**引用地址**，不发生 ToPrimitive。

## 追问与易错点

- **为什么建议一律用 ===？** `==` 的转换规则复杂且不对称（如 `0 == '0'` 为 true、`'' == '0'` 为 false），容易出意外；`===` 行为可预测。唯一被普遍接受的例外是 `x == null`，可同时匹配 null 和 undefined。
- **NaN 怎么判断相等？** 任何比较都为 false，用 `Number.isNaN(NaN)` 或 `Object.is(NaN, NaN)`。
- **Object.is 与 === 有什么区别？** 只有两点不同：`Object.is(NaN, NaN)` 为 true，`Object.is(+0, -0)` 为 false，其余与 `===` 一致。
- **ToPrimitive 的调用顺序？** 默认先 `valueOf` 再 `toString`（Date 例外，先 toString）；对象可用 `Symbol.toPrimitive` 自定义转换逻辑。
- **`[] == ![]` 为 true，那 `[] === ![]` 呢？** false，一边是对象一边是布尔，`===` 不做转换直接判负。

## 相关题目

- [js-013-typeof-instanceof](/q/js/js-013-typeof-instanceof)
