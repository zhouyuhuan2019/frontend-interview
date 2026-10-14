---
title: 手写一个简易 Promise
subtopic: 手写 Promise
difficulty: senior
frequency: high
tags: [手写, Promise, 异步, 状态机, 链式调用]
order: 20
---

请实现一个简易的 `MyPromise`，要求：

- 支持 `executor(resolve, reject)`，executor 中抛错时自动 reject；
- 状态只能从 pending 变到 fulfilled / rejected，且不可逆；
- `then` 支持链式调用，回调返回值会被下一个 `then` 接收；返回 Promise 时会被「展开」；
- 支持异步 resolve（then 注册时状态还是 pending 也能正确触发）；
- 回调必须异步执行（放入微任务）。

## 参考答案

```js run
const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

class MyPromise {
  constructor(executor) {
    this.state = PENDING
    this.value = undefined
    this.reason = undefined
    this.onFulfilledCallbacks = [] // pending 时暂存的成功回调
    this.onRejectedCallbacks = []  // pending 时暂存的失败回调

    const resolve = (value) => {
      if (this.state !== PENDING) return
      this.state = FULFILLED
      this.value = value
      this.onFulfilledCallbacks.forEach((fn) => fn())
    }
    const reject = (reason) => {
      if (this.state !== PENDING) return
      this.state = REJECTED
      this.reason = reason
      this.onRejectedCallbacks.forEach((fn) => fn())
    }

    try {
      executor(resolve, reject)
    } catch (err) {
      reject(err)
    }
  }

  then(onFulfilled, onRejected) {
    // 处理 .then() 不传回调的情况，实现值穿透
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : (v) => v
    onRejected = typeof onRejected === 'function' ? onRejected : (r) => { throw r }

    const next = new MyPromise((resolve, reject) => {
      const wrap = (handler, data) => {
        queueMicrotask(() => {
          try {
            const x = handler(data)
            // 返回 Promise 则展开，否则直接 resolve
            if (x instanceof MyPromise) x.then(resolve, reject)
            else resolve(x)
          } catch (err) {
            reject(err)
          }
        })
      }
      if (this.state === FULFILLED) wrap(onFulfilled, this.value)
      else if (this.state === REJECTED) wrap(onRejected, this.reason)
      else {
        this.onFulfilledCallbacks.push(() => wrap(onFulfilled, this.value))
        this.onRejectedCallbacks.push(() => wrap(onRejected, this.reason))
      }
    })
    return next
  }

  catch(onRejected) {
    return this.then(null, onRejected)
  }
}

// 测试 1：异步 resolve + 链式 then
new MyPromise((resolve) => setTimeout(() => resolve(1), 20))
  .then((v) => {
    console.log('第一个 then:', v)
    return v * 2
  })
  .then((v) => console.log('链式 then:', v))

// 测试 2：executor 抛错进入 catch
new MyPromise(() => { throw new Error('同步抛错') })
  .catch((err) => console.log('catch:', err.message))

// 测试 3：then 返回 Promise 会被展开
new MyPromise((resolve) => resolve(10))
  .then((v) => new MyPromise((r) => setTimeout(() => r(v + 5), 20)))
  .then((v) => console.log('展开嵌套 Promise:', v))
```

```text output
catch: 同步抛错
第一个 then: 1
链式 then: 2
展开嵌套 Promise: 15
```

## 原理讲解

核心是一台**三态状态机**加**回调队列**：

1. **状态不可逆**：`resolve` / `reject` 开头都有 `if (this.state !== PENDING) return`，保证只有第一次落定生效。
2. **异步 resolve 的关键**：状态还是 pending 时，`then` 的回调不立即执行，而是 push 进 `onFulfilledCallbacks` / `onRejectedCallbacks` 数组；等 `resolve` 被调用时统一遍历触发。这就是「发布订阅」模式。
3. **链式调用的关键**：`then` 每次都 `return new MyPromise(...)`，并把「上一个回调的返回值」通过 `resolve(x)` 传给下一个 Promise。如果 `x` 本身是一个 Promise，就用 `x.then(resolve, reject)` 等待它落定后再继续——这就是「展开」。
4. **回调必须异步**：用 `queueMicrotask` 把回调包成微任务，保证同步代码先执行完，与原生 Promise 行为一致。
5. **值穿透**：`then` 不传回调时给默认函数 `(v) => v`，让 `.then().then(v => ...)` 也能拿到值。
6. **错误冒泡**：回调被 `try/catch` 包裹，抛错时 `reject(err)`，错误会顺着链传到最近的 `catch`。

## 追问与易错点

- **为什么 then 的回调要异步执行？** 保证执行顺序可预期：无论 resolve 是同步还是异步调用，`then` 回调都在同步代码之后执行，避免「时序竞态」（Zalgo 问题）。
- **`executor` 里 `resolve(promise)` 会怎样？** 标准行为是「跟随」该 Promise 的状态，本简易版未实现，完整版需在 `resolve` 里判断 value 是否为 thenable。
- **什么是 thenable？** 任何带有 `then` 方法的对象。规范（Promise/A+）用 `x.then` 做鸭子检测而不是 `instanceof`，以支持跨库的 Promise 互操作。
- **同一个 Promise 可以 then 多次吗？** 可以，回调数组就是为此设计的，多个 `then` 都会按注册顺序执行。
- **手写 Promise 最常见考点？** 链式调用的实现（then 返回新 Promise）和值穿透；进阶会让实现 `Promise.all` / `race` / 满足 Promise/A+ 规范的 `resolvePromise` 完整版。

## 相关题目

- [handwriting-008-promise-pool](/q/handwriting/handwriting-008-promise-pool)
- [js-002-event-loop-order](/q/js/js-002-event-loop-order)
