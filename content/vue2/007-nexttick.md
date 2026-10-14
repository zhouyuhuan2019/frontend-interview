---
title: $nextTick 是什么？原理是什么？
subtopic: 响应式原理
difficulty: middle
frequency: medium
tags: [Vue2, nextTick, 异步更新, 微任务, 事件循环]
order: 70
related: [vue2-001-reactivity-principle]
---

## 参考答案

**`$nextTick` 是 Vue2 提供的「等 DOM 更新完成后执行回调」的 API**：`this.$nextTick(cb)` 或 `Vue.nextTick(cb)`，支持回调和 Promise 两种用法。

存在的根本原因：**Vue2 的 DOM 更新是异步的**。修改 data 不会立即重新渲染，Vue 会把本轮同步代码中的所有数据变更**合并**到同一个异步队列，在下一个「tick」统一 flush，避免频繁重渲染。

原理一句话：**基于事件循环的异步任务降级方案——优先用微任务（Promise.then），环境不支持时依次降级到 MutationObserver → setImmediate → setTimeout。**

## 原理讲解

**1. 异步更新队列**

```vue
<script>
export default {
  data() {
    return { msg: 'hello' }
  },
  mounted() {
    this.msg = 'A'
    this.msg = 'B'
    this.msg = 'C'
    // 这里 DOM 里还是 'hello'！渲染尚未发生
    this.$nextTick(() => {
      // 此时 DOM 已更新为 'C'
      console.log(this.$el.textContent)
    })
  },
}
</script>
```

上面三次赋值只触发**一次**渲染：setter 通知 watcher 后，watcher 不会立刻执行，而是被推入队列（`queueWatcher`）并去重；随后通过 `nextTick(flushSchedulerQueue)` 把「执行整个队列」挂到异步任务。

**2. nextTick 的降级策略**

Vue2 源码按环境能力依次选择：

1. `Promise.resolve().then(cb)` —— 微任务，首选；
2. `MutationObserver` —— 微任务（旧浏览器兜底）；
3. `setImmediate` —— 宏任务（IE）；
4. `setTimeout(cb, 0)` —— 宏任务，最终兜底。

用纯 JS 模拟「合并 + 微任务」的效果：

```js run
const callbacks = []
let pending = false

function nextTick(cb) {
  callbacks.push(cb)
  if (!pending) {
    pending = true
    Promise.resolve().then(() => {
      pending = false
      const fns = callbacks.slice()
      callbacks.length = 0
      fns.forEach((fn) => fn())
    })
  }
}

console.log('start')
nextTick(() => console.log('tick 1'))
nextTick(() => console.log('tick 2'))
console.log('end')
```

输出为 `start → end → tick 1 → tick 2`：同一轮同步代码里多次调用只挂出一个微任务，回调按注册顺序执行。

## 追问与易错点

- **改了数据立刻读 DOM，为什么拿到的是旧值？** DOM 更新被推迟到异步队列 flush 之后，同步代码里读到的是更新前的 DOM；用 `$nextTick` 等待。
- **`$nextTick` 一定用微任务吗？** 不一定，取决于环境：现代浏览器是 Promise 微任务，老环境会降级到 MutationObserver / setImmediate / setTimeout。
- **`created` 钩子里能用 `$nextTick` 吗？** 可以注册，回调会在首次渲染完成后执行；但若只为等 DOM，直接用 `mounted` 语义更清晰。
- **为什么把更新合并而不是同步渲染？** 一次事件处理中数据可能改多次，同步渲染会造成大量重复布局计算；合并后一轮只渲染一次，是性能优化。
- **`$nextTick` 和 `setTimeout(fn, 0)` 能互相替代吗？** 多数场景效果接近，但 nextTick 在现代浏览器走微任务、比宏任务更早执行，且语义上绑定 Vue 的更新队列，优先用 nextTick。

## 相关题目

- [vue2-001-reactivity-principle](/q/vue2/vue2-001-reactivity-principle)
