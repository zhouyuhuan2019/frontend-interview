---
title: 同步死循环为什么会让页面卡死？
subtopic: 事件循环与 Promise
difficulty: middle
frequency: medium
tags: [事件循环, 主线程, 阻塞, 运行器]
order: 40
---

## 参考答案

浏览器里 JS 执行与页面渲染共用**同一个主线程**。一段同步死循环会一直占用主线程，导致：

1. 事件循环无法进入下一轮，队列里的宏任务 / 微任务都得不到执行；
2. 渲染流程被阻塞，页面无法重绘，表现为「卡死」；
3. 用户点击等交互事件无法被处理，浏览器可能提示「页面无响应」。

因此前端必须避免把重计算放在主线程，常见解法是**切片（时间分片）**或**搬进 Web Worker**。

## 原理讲解

下面的代码会持续占用主线程，点击「运行」可以观察本站在 3 秒后强制终止它——这正是本站在独立线程里运行示例代码的原因（`worker.terminate()` 可以硬中断，父页面完全不受影响）。

```js run
// 注意：这是一个刻意的死循环，用于演示运行器的超时保护
while (true) {
  // 什么都不做，仅占用主线程
}
```

正确的做法是让出主线程：

```js run
// 时间分片：每处理一批任务就让出一次控制权
let sum = 0
let index = 0

function chunk() {
  const start = Date.now()
  while (index < 5000000 && Date.now() - start < 8) {
    sum += index
    index += 1
  }
  if (index < 5000000) {
    setTimeout(chunk)
  } else {
    console.log('计算完成，结果：', sum)
  }
}

chunk()
```

这里每次最多占用 8ms，然后通过 `setTimeout` 把控制权还给事件循环，页面依然可以响应交互与渲染。

## 追问与易错点

- **Web Worker 能彻底解决吗？** 能解决纯计算场景，但 worker 无法访问 DOM，且线程间通信有结构化克隆成本。
- **`requestAnimationFrame` 能用来做分片吗？** 可以，它天然与渲染节奏对齐，适合需要同步到帧的动画 / 布局计算。
- **异步函数里写死循环也会卡吗？** 会。`async` 只是把后续代码变成微任务，循环本身仍然是同步执行的。
- **如何排查？** Performance 面板看长任务（Long Task），或用 `PerformanceObserver` 监听 `longtask`。

## 相关题目

- [js-002-event-loop-order](/q/js/js-002-event-loop-order)
