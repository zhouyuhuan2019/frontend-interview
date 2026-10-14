---
title: async/await 与 Promise 是什么关系？错误怎么捕获？
subtopic: 事件循环与 Promise
difficulty: junior
frequency: high
tags: [async-await, Promise, 错误处理, try-catch]
order: 100
related: [js-002-event-loop-order, js-009-promise-static]
---

## 参考答案

- `async/await` 是 **Promise 的语法糖**：`async` 函数总是返回一个 Promise；`await` 会暂停当前 async 函数的后续代码，等待 Promise settle 后取出结果（后续代码相当于放进了 `.then` 的微任务）。
- 错误捕获三种方式：① `try/catch` 包住 `await`（推荐）；② 给返回的 Promise 挂 `.catch`；③ 并发场景用 `Promise.all` 统一 `catch`。
- `await` 的 Promise rejected 且无人捕获 → 整个 async 函数返回 rejected promise（产生 unhandledrejection）。

## 原理讲解

async 函数与 Promise 的等价关系：

```js run
async function foo() {
  return 42 // 等价于 return Promise.resolve(42)
}
foo().then(v => console.log('foo 返回 Promise:', v))

async function bar() {
  throw new Error('oops') // 等价于 return Promise.reject(...)
}
bar().catch(e => console.log('bar rejected:', e.message))
```

两种错误捕获方式对比：

```js run
async function mayFail(shouldFail) {
  if (shouldFail) throw new Error('请求失败')
  return 'ok'
}

// 方式一：try/catch（推荐，同步写法符合直觉）
async function withTryCatch() {
  try {
    await mayFail(true)
  } catch (e) {
    console.log('try/catch 捕获:', e.message)
  }
}

// 方式二：链式 catch，把错误转成兜底值
async function withChain() {
  const v = await mayFail(true).catch(e => '兜底值: ' + e.message)
  console.log(v)
}

withTryCatch()
withChain()
```

高频陷阱：`forEach` 里的 `await` 不会被等待，串行与并行的正确写法：

```js run
const delay = (v, t) => new Promise(r => setTimeout(() => r(v), t))

async function demo() {
  // 错误示范：forEach 的回调互不等待，全部同时触发
  ;[1, 2].forEach(async n => console.log('forEach:', await delay(n, 10)))

  // 正确·串行：for...of 才会逐个等待
  for (const n of [1, 2]) console.log('for...of:', await delay(n, 10))

  // 正确·并行：Promise.all + map
  const rs = await Promise.all([1, 2].map(n => delay(n, 10)))
  console.log('并行结果:', rs)
}
demo()
```

## 追问与易错点

- **await 后面跟非 Promise 值？** 会被 `Promise.resolve` 包一层，`await 1` 得到 1，但仍会让出一次微任务。
- **await 会阻塞主线程吗？** 不会。它只暂停当前 async 函数的后续代码，主线程可继续执行其他任务，暂停的部分进入微任务队列等待恢复。
- **最外层没有 catch 会怎样？** 产生 unhandledrejection，浏览器控制台报错，Node 高版本默认直接 crash。好习惯：入口统一 `.catch`。
- **多个互不依赖的请求怎么写？** 连续 `await` 是串行；应先创建 Promise 再统一 `await Promise.all(...)`，实现并发。
- **async 函数能继续 then 吗？** 能，它返回的就是 Promise，可继续 `then/catch/finally`，也可被其他函数 `await`。

## 相关题目

- [js-002-event-loop-order](/q/js/js-002-event-loop-order)
- [js-009-promise-static](/q/js/js-009-promise-static)
