---
title: JS 数据类型有哪些？typeof 与 instanceof 的坑是什么？
subtopic: 类型与隐式转换
difficulty: junior
frequency: high
tags: [数据类型, typeof, instanceof, 类型判断]
order: 130
related: [js-005-type-coercion, js-007-prototype-chain]
---

## 参考答案

- JS 共 **8 种数据类型**：7 种原始类型（`undefined`、`null`、`boolean`、`number`、`string`、`symbol`、`bigint`）+ `object`（数组、函数、日期等都属于对象）。
- `typeof` 的坑：`typeof null === 'object'`（历史 bug）；区不开数组与普通对象（都是 `'object'`）。
- `instanceof` 的坑：只能判断引用类型；跨 iframe/realm 会失效；右操作数必须是有 `prototype` 的可调用对象。

`typeof` 速查表：

| 表达式 | 结果 |
|---|---|
| `typeof undefined` | `'undefined'` |
| `typeof null` | `'object'` ⚠️ |
| `typeof 1` / `typeof NaN` | `'number'` |
| `typeof 'a'` / `typeof true` | `'string'` / `'boolean'` |
| `typeof Symbol()` / `typeof 1n` | `'symbol'` / `'bigint'` |
| `typeof {}` / `typeof []` | `'object'` |
| `typeof function(){}` | `'function'` |

## 原理讲解

```js run
console.log(typeof null) // 'object'：著名历史 bug
console.log(typeof []) // 'object'：看不出是数组
console.log(typeof NaN) // 'number'
console.log(typeof function () {}) // 'function'
console.log(typeof 10n) // 'bigint'
```

`instanceof` 的原理：沿左操作数的原型链，查找右操作数的 `prototype`：

```js run
class Animal {}
class Dog extends Animal {}
const d = new Dog()

console.log(d instanceof Dog) // true
console.log(d instanceof Animal) // true：沿原型链能查到
console.log([] instanceof Array) // true
console.log([] instanceof Object) // true：所以无法精确区分数组
console.log(1 instanceof Number) // false：原始值不走原型链
```

更可靠的类型判断方式：

```js run
const toString = Object.prototype.toString

console.log(toString.call([])) // '[object Array]'
console.log(toString.call(null)) // '[object Null]'
console.log(toString.call(new Date())) // '[object Date]'

// 实际开发推荐写法
console.log(Array.isArray([])) // true：判断数组首选
console.log(Number.isNaN(NaN)) // true：不做隐式转换
```

手写 `instanceof`（高频手写题）：

```js run
function myInstanceof(obj, Constructor) {
  let proto = Object.getPrototypeOf(obj)
  while (proto) {
    if (proto === Constructor.prototype) return true
    proto = Object.getPrototypeOf(proto)
  }
  return false
}

console.log(myInstanceof([], Array)) // true
console.log(myInstanceof([], Object)) // true
console.log(myInstanceof({}, Array)) // false
```

## 追问与易错点

- **typeof null 为什么是 'object'？** JS 第一版用低位比特标记类型，null 的机器码是 0，与对象标记冲突，为兼容旧代码保留至今。
- **怎么判断数组最靠谱？** `Array.isArray` 首选；`instanceof` 在跨 iframe/realm 时会失效（不同全局环境的 Array 不是同一个）。
- **instanceof 能判断原始值吗？** 不能，`1 instanceof Number` 为 false；但 `new Number(1)` 是包装对象，结果为 true——注意原始值与包装对象的区别。
- **全局 isNaN 与 Number.isNaN 的区别？** 全局 `isNaN` 会先做隐式转换（`isNaN('abc')` 为 true）；`Number.isNaN` 不转换，只有真正的 NaN 才返回 true。
- **typeof 未声明的变量？** 返回 `'undefined'` 而不抛错，这是 typeof 的安全机制；但 `let/const` 变量在暂时性死区（TDZ）内用 typeof 会抛 ReferenceError。

## 相关题目

- [js-005-type-coercion](/q/js/js-005-type-coercion)
- [js-007-prototype-chain](/q/js/js-007-prototype-chain)
