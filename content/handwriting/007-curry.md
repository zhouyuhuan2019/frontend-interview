---
title: 手写函数柯里化
subtopic: 函数工具
difficulty: middle
frequency: medium
tags: [手写, 柯里化, curry, 闭包, 高阶函数]
order: 70
---

请实现一个 `curry(fn)`，把多参数函数转换成可逐参调用的柯里化函数，要求：

- 支持 `curry(fn)(1)(2)(3)`、`curry(fn)(1, 2)(3)`、`curry(fn)(1)(2, 3)` 等任意组合；
- 参数收集够后立即执行原函数并返回结果。

## 参考答案

```js run
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      // 参数够了：执行原函数
      return fn.apply(this, args)
    }
    // 参数不够：返回新函数继续收集，并拼接已收集的参数
    return function (...rest) {
      return curried.apply(this, [...args, ...rest])
    }
  }
}

const sum3 = (a, b, c) => a + b + c
const curriedSum = curry(sum3)

console.log('逐参调用:', curriedSum(1)(2)(3))
console.log('混合调用:', curriedSum(1, 2)(3))
console.log('混合调用:', curriedSum(1)(2, 3))
console.log('一次传齐:', curriedSum(1, 2, 3))

// 柯里化的价值：参数复用
const add = (a, b) => a + b
const addTen = curry(add)(10)
console.log('复用偏函数:', addTen(1), addTen(20))
```

```text output
逐参调用: 6
混合调用: 6
混合调用: 6
一次传齐: 6
复用偏函数: 11 30
```

## 原理讲解

柯里化（Currying）的本质：**用闭包记住已传入的参数，没凑齐就返回函数继续等，凑齐就执行**。

1. **`fn.length` 是终止条件**：函数的 `length` 属性表示其「形参个数」（不含剩余参数和带默认值的参数之后的形参）。已收集参数数 ≥ 形参数，说明可以执行了。
2. **递归收集**：参数不够时返回一个新函数，新函数被调用时把新参数 `rest` 与闭包里的 `args` 拼接，再递归调用 `curried` 重新判断。每次调用都形成一层闭包保存中间参数。
3. **为什么支持混合传参**：判断条件是「累计参数总数」而不是「调用次数」，所以 `(1, 2)(3)` 和 `(1)(2)(3)` 效果一致。
4. **保留 this**：`fn.apply(this, args)` 保证柯里化后的函数作为对象方法调用时 this 不丢失。

## 追问与易错点

- **柯里化和偏函数（partial）的区别？** 柯里化把 n 元函数拆成一串一元调用链（面试实现通常放宽为可混合传参）；偏函数只是「预先固定前几个参数」，一次固定一批，返回的仍是多参函数。
- **`fn.length` 有什么坑？** 默认参数、剩余参数会让 `length` 变小：`(a, b = 1, ...rest) => {}` 的 `length` 是 1。所以柯里化对带默认值 / 剩余参数的函数会提前触发执行。
- **经典追问：实现 `add(1)(2)(3)()` 或支持无限链的 add？** 这种「不定参」写法没有明确的终止信号，通常靠 `valueOf` / `toString` 隐式转换：返回的函数重写 `toString`，在 `console.log` / 模板字符串 / `+add` 触发转换时输出累计和。
- **柯里化有什么用？** 参数复用（如 `addTen`）、延迟执行（事件处理先传配置后传事件）、配合函数组合（compose / pipe）写 point-free 风格代码。
- **箭头函数能柯里化吗？** 可以，且因为箭头函数没有自己的 this，`curried.apply(this, ...)` 中的 this 会穿透到外层，与调用处一致。

## 相关题目

- [handwriting-004-call-apply-bind](/q/handwriting/handwriting-004-call-apply-bind)
- [handwriting-001-debounce-throttle](/q/handwriting/handwriting-001-debounce-throttle)
