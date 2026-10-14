---
title: 手写 Promise 并发控制（限制并发数）
subtopic: 事件与调度
difficulty: senior
frequency: high
tags: [手写, Promise, 并发控制, 异步, 调度]
order: 80
---

请实现一个 `promisePool(tasks, limit)`：`tasks` 是返回 Promise 的函数数组，要求**同一时刻最多只有 `limit` 个任务在执行**，一个任务完成后立刻补位下一个，全部完成后按**原始顺序**返回结果数组；任一任务失败则整体 reject。

典型场景：批量上传文件 / 批量请求接口时限制并发，避免瞬间打满浏览器连接数。

## 参考答案

```js run
function promisePool(tasks, limit) {
  return new Promise((resolve, reject) => {
    const results = new Array(tasks.length)
    let index = 0    // 下一个待启动的任务下标
    let finished = 0 // 已完成的任务数

    function runNext() {
      if (index >= tasks.length) return // 没有可启动的任务了
      const current = index
      index += 1
      Promise.resolve()
        .then(() => tasks[current]())
        .then((value) => {
          results[current] = value // 按下标存，保证顺序
          finished += 1
          if (finished === tasks.length) resolve(results)
          else runNext() // 完成一个，补位一个
        })
        .catch(reject)
    }

    // 启动 limit 个「worker」，每个 worker 完成后自己拉新任务
    for (let i = 0; i < Math.min(limit, tasks.length); i += 1) {
      runNext()
    }
  })
}

// 测试：5 个任务，限制并发 2，验证最大并发数不超过 2
let running = 0
let maxRunning = 0
const makeTask = (id, ms) => () =>
  new Promise((resolve) => {
    running += 1
    maxRunning = Math.max(maxRunning, running)
    console.log(`任务 ${id} 开始，当前并发 ${running}`)
    setTimeout(() => {
      running -= 1
      console.log(`任务 ${id} 完成`)
      resolve(id)
    }, ms)
  })

const tasks = [
  makeTask(1, 60),
  makeTask(2, 40),
  makeTask(3, 50),
  makeTask(4, 30),
  makeTask(5, 20),
]

promisePool(tasks, 2).then((results) => {
  console.log('结果保持顺序:', results.join(','))
  console.log('历史最大并发:', maxRunning)
})
```

```text output
任务 1 开始，当前并发 1
任务 2 开始，当前并发 2
任务 2 完成
任务 3 开始，当前并发 2
任务 1 完成
任务 4 开始，当前并发 2
任务 4 完成
任务 5 开始，当前并发 2
任务 3 完成
任务 5 完成
结果保持顺序: 1,2,3,4,5
历史最大并发: 2
```

## 原理讲解

这是「**固定数量的 worker 不断从任务队列取活干**」的经典模型：

1. **启动 `limit` 个 worker**：开头的 `for` 循环调用 `limit` 次 `runNext`，相当于放出 limit 个并发槽位。
2. **完成即补位**：每个任务 `then` 回调里再调一次 `runNext()`——只要自己这格空出来，就立刻启动队列中的下一个任务。这样任意时刻在跑的任务数恒不超过 `limit`。
3. **`index` 是共享指针**：所有 worker 共用一个 `index` 标记下一个待执行任务，保证任务不重复、不遗漏。
4. **结果保序**：任务的完成顺序是乱的，但用 `results[current] = value` 按启动下标写入，最终结果顺序与输入一致（`Promise.all` 的语义）。
5. **收尾条件**：`finished === tasks.length` 时 `resolve(results)`；任何一个任务失败直接 `reject`，整个池子失败（与 `Promise.all` 一致）。

用 `Promise.resolve().then(() => tasks[current]())` 包一层，是为了兼容 tasks 里混有同步函数 / 返回非 Promise 值的情况。

## 追问与易错点

- **和 `Promise.all` 的区别？** `Promise.all` 是全量并发，本实现限流；返回语义无区别（保序 + 一个失败全失败）。如果要「全部 settle 后汇总成败」，把 `catch(reject)` 改成记录错误并继续补位即可得到 `allSettled` 版。
- **有哪些现成的实现可参考？** 业界经典是 `p-limit`（限制并发数的装饰器）和 `p-queue`（任务队列），面试可提一句；ES2025 也原生化了 `Promise.try` 等工具。
- **能用 `async/await` 写吗？** 可以，更符合直觉：`async function worker() { while (index < tasks.length) { const i = index++; results[i] = await tasks[i]() } }`，启动 `limit` 个 `worker()` 再 `Promise.all` 等待。注意 `index++` 在单线程事件循环里是安全的（取号与自增之间没有 await）。
- **失败任务要不要重试？** 进阶考点：在 `catch` 里给任务加 `retries` 计数，未超次数就重新入队。
- **实际项目哪里用得到？** 文件分片上传（每片一个请求，限 3~6 并发）、爬虫 / 批量抓取限流、图片懒加载队列。

## 相关题目

- [handwriting-002-promise](/q/handwriting/handwriting-002-promise)
- [js-010-async-await](/q/js/js-010-async-await)
