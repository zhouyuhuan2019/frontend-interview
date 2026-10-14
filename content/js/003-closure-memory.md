---
title: 什么是闭包？它为什么会造成内存泄漏？
subtopic: 闭包
difficulty: middle
frequency: high
tags: [闭包, 作用域链, 内存泄漏, 垃圾回收]
order: 30
---

## 参考答案

闭包（closure）指的是**函数与其定义时所在词法作用域的组合**。只要内部函数被外部引用，外部函数执行完其作用域也不会被回收。

```js run
function createCounter() {
  let count = 0
  return () => {
    count += 1
    return count
  }
}

const counter = createCounter()
console.log(counter()) // 1
console.log(counter()) // 2
```

`count` 本应在 `createCounter` 返回后销毁，但因为返回的箭头函数引用了它，这个变量被保留下来，这就是闭包的价值：**私有状态 + 状态持久化**。

常见用途：
- 计数器、缓存（记忆化）
- 防抖 / 节流（保存 timer）
- 模块私有变量（IIFE）
- 柯里化与函数工厂

## 原理讲解

JS 采用词法作用域，函数在**定义时**就确定了作用域链。执行上下文被销毁时，如果其中的变量仍被内部函数引用，这些变量会被转移到该函数的 `[[Scopes]]` 上而不会被 GC 回收。

用 Chrome DevTools 可以直接观察：

```js
function outer() {
  // 断点放在这行，观察 count 是否被保留在函数作用域中
  let count = 0
  return () => count++
}
```

## 追问与易错点

- **闭包一定导致内存泄漏吗？** 不一定。只要引用最终被释放（比如外部不再持有该函数），变量就会被回收。泄漏的本质是**引用链意外长期存活**。
- **哪些写法容易泄漏？**
  1. 定时器 / 事件监听的回调长期不清理，且引用了大对象；
  2. 把 DOM 节点存在闭包里，而 DOM 已被移除；
  3. 全局缓存（Map）只写不清，键不断累积。
- **如何避免？** 在组件卸载时清理定时器与监听器（`useEffect` 返回清理函数）；缓存用 WeakMap/WeakMap 类似的弱引用结构；避免在闭包中长期持有大对象。
- **for + setTimeout 的输出为什么是 3 个 3？** 因为 `var` 是函数作用域，三个回调共享同一个 `i`；换成 `let` 后每轮迭代是独立绑定。

## 相关题目

- [js-001-var-let-const](/q/js/js-001-var-let-const)
- [handwriting-001-debounce-throttle](/q/handwriting/handwriting-001-debounce-throttle)
