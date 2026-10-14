---
title: Promise.all/race/allSettled/any 的区别是什么？
subtopic: 事件循环与 Promise
difficulty: middle
frequency: high
tags: [Promise, 并发, allSettled, race]
order: 90
related: [js-002-event-loop-order, js-010-async-await]
---

## 参考答案

一句话总结：**all 求全、race 抢先、allSettled 看全、any 求一**。

| 方法 | 何时成功 | 何时失败 | 成功结果 |
|---|---|---|---|
| `Promise.all` | 全部 fulfilled | 任一 rejected（立即失败） | 结果数组，**按入参顺序** |
| `Promise.race` | 第一个 settle 的 | 同左（先到先得，不论成败） | 单个结果 |
| `Promise.allSettled` | 永远成功，等全部 settle | 不会 reject | `[{status, value/reason}]` 数组 |
| `Promise.any` | 任一 fulfilled | 全部 rejected | 第一个成功的值；全败抛 `AggregateError` |

版本记忆：`allSettled` 是 ES2020，`any` 是 ES2021。

## 原理讲解

四个方法的行为对比：

```js run
const ok = (v, t) => new Promise(r => setTimeout(() => r(v), t))
const fail = (e, t) => new Promise((_, rej) => setTimeout(() => rej(new Error(e)), t))

Promise.all([ok('a', 30), ok('b', 10)])
  .then(v => console.log('all:', v)) // ['a', 'b']：顺序与入参一致，与完成先后无关

Promise.race([ok('快', 10), ok('慢', 50)])
  .then(v => console.log('race:', v)) // '快'：谁先到用谁

Promise.allSettled([ok('a', 10), fail('boom', 20)])
  .then(v => console.log('allSettled:', JSON.stringify(v))) // 成败都记录

Promise.any([fail('x', 10), ok('y', 20)])
  .then(v => console.log('any:', v)) // 'y'：忽略失败，取第一个成功

Promise.all([ok('a', 10), fail('boom', 20)])
  .catch(e => console.log('all 遇错立即 reject:', e.message))
```

高频手写题：`Promise.all` 的简易实现：

```js run
Promise.myAll = function (promises) {
  return new Promise((resolve, reject) => {
    const results = []
    let count = 0
    promises.forEach((p, i) => {
      Promise.resolve(p).then(v => { // 包一层，兼容非 Promise 值
        results[i] = v // 用下标保持入参顺序
        if (++count === promises.length) resolve(results)
      }, reject) // 任一失败立即 reject
    })
  })
}

Promise.myAll([Promise.resolve(1), 2, Promise.resolve(3)])
  .then(v => console.log('myAll:', v)) // [1, 2, 3]
```

## 追问与易错点

- **传入空数组会怎样？** `all([])` 立即 resolve `[]`；`allSettled([])` resolve `[]`；`any([])` reject `AggregateError`；`race([])` 永远 pending。
- **all 的结果顺序按完成时间吗？** 不是，严格按入参数组顺序，这也是为什么手写实现要用下标赋值而不是 push。
- **all 中一个失败，其他 Promise 会被取消吗？** 不会。Promise 本身不可取消，只是返回的 Promise 立即 reject，其余的仍会继续跑完。
- **race 的典型应用场景？** 请求超时控制：`Promise.race([request, timeoutPromise])`，超时 Promise 先 reject 即判定超时。
- **any 全败时错误长什么样？** 抛 `AggregateError`，其 `errors` 属性是所有失败原因组成的数组。

## 相关题目

- [js-002-event-loop-order](/q/js/js-002-event-loop-order)
- [js-010-async-await](/q/js/js-010-async-await)
