---
title: 手写 instanceof
subtopic: 函数工具
difficulty: middle
frequency: medium
tags: [手写, instanceof, 原型链, 原型]
order: 50
---

请实现一个 `myInstanceof(obj, ctor)`，模拟 `instanceof` 运算符的行为：判断 `ctor.prototype` 是否出现在 `obj` 的原型链上。

## 参考答案

```js run
function myInstanceof(obj, ctor) {
  if (typeof ctor !== 'function') {
    throw new TypeError('Right-hand side of instanceof is not callable')
  }
  // 基本类型直接 false（null/undefined 取原型会报错，一并兜底）
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return false
  }
  const target = ctor.prototype
  let proto = Object.getPrototypeOf(obj)
  while (proto !== null) {
    if (proto === target) return true
    proto = Object.getPrototypeOf(proto)
  }
  return false
}

// 测试 1：类与实例
class Animal {}
class Dog extends Animal {}
const dog = new Dog()
console.log('dog instanceof Dog:', myInstanceof(dog, Dog))       // true
console.log('dog instanceof Animal:', myInstanceof(dog, Animal)) // true
console.log('dog instanceof Object:', myInstanceof(dog, Object)) // true

// 测试 2：数组 / 字面量对象 / 基本类型
console.log('[] instanceof Array:', myInstanceof([], Array))     // true
console.log('[] instanceof Object:', myInstanceof([], Object))   // true
console.log('{} instanceof Array:', myInstanceof({}, Array))     // false
console.log('1 instanceof Number:', myInstanceof(1, Number))     // false
console.log('null 兜底:', myInstanceof(null, Object))            // false

// 测试 3：Object.create 指定原型
function Fake() {}
Fake.prototype = { tag: 'proto' }
const obj = Object.create(Fake.prototype)
console.log('手动原型链:', myInstanceof(obj, Fake)) // true
```

```text output
dog instanceof Dog: true
dog instanceof Animal: true
dog instanceof Object: true
[] instanceof Array: true
[] instanceof Object: true
{} instanceof Array: false
1 instanceof Number: false
null 兜底: false
手动原型链: true
```

## 原理讲解

`instanceof` 的语义一句话：**右侧函数的 `prototype` 是否在左侧对象的原型链上**。注意比较的不是「构造函数本身」，而是 `ctor.prototype` 这个对象。

1. 从 `obj` 的原型（`Object.getPrototypeOf(obj)`）开始，沿着 `__proto__` 逐级向上走；
2. 每一级都与 `ctor.prototype` 做全等比较，命中即 `true`；
3. 走到 `null`（原型链终点）还没命中，返回 `false`。

几个细节：

- **基本类型直接 false**：`1 instanceof Number` 是 `false`，因为字面量 `1` 没有原型链（只有 `new Number(1)` 这样的包装对象才有）。实现里先兜底，避免对 `null` 调 `Object.getPrototypeOf` 抛错。
- **函数也是对象**：`fn instanceof Function` 和 `fn instanceof Object` 都为 `true`，所以兜底条件里要把 `typeof obj === 'function'` 放过去。
- **为什么用 `Object.getPrototypeOf` 而不是 `__proto__`**：`__proto__` 是历史遗留的访问器属性，规范推荐用 `Object.getPrototypeOf`，且对 `Object.create(null)` 创建的无原型对象也安全。

## 追问与易错点

- **`instanceof` 能准确判断数组吗？** 单 realm（同一页面）下可以，但跨 iframe / 跨窗口时不同 realm 有各自的 `Array`，`instanceof` 会失效，稳妥做法用 `Array.isArray`。
- **和 `typeof` 的区别？** `typeof` 判断基本类型（对对象只会得到 `'object'` / `'function'`）；`instanceof` 基于原型链判断「谁是谁的实例」，只适用于对象。
- **`Symbol.hasInstance` 是什么？** 可以自定义 `instanceof` 的行为：`class Foo { static [Symbol.hasInstance](obj) { return true } }`，实现里 `myInstanceof` 若要严谨需先检查该方法。
- **为什么 `{} instanceof Object` 为 true 而 `Object.create(null)` 为 false？** 后者没有原型，`Object.getPrototypeOf` 直接返回 `null`，循环第一轮就结束。
- **修改 `ctor.prototype` 会影响判断结果吗？** 会。`instanceof` 比较的是**当前** `ctor.prototype` 的引用，重新赋值 `Foo.prototype = {}` 后，旧实例的 `instanceof Foo` 会变成 `false`。

## 相关题目

- [handwriting-004-call-apply-bind](/q/handwriting/handwriting-004-call-apply-bind)
