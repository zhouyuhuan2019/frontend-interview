---
title: 手写发布订阅 EventBus
subtopic: 事件与调度
difficulty: middle
frequency: high
tags: [手写, 发布订阅, EventBus, 事件, 观察者模式]
order: 90
---

请实现一个 `EventBus` 类，要求：

- `on(event, fn)` 订阅事件，可重复订阅多个回调；
- `off(event, fn)` 取消指定订阅；
- `once(event, fn)` 只触发一次的订阅；
- `emit(event, ...args)` 触发事件并传参。

## 参考答案

```js run
class EventBus {
  constructor() {
    this.events = new Map() // event -> Set<fn>
  }

  on(event, fn) {
    if (!this.events.has(event)) this.events.set(event, new Set())
    this.events.get(event).add(fn)
    return () => this.off(event, fn) // 返回取消订阅函数，方便清理
  }

  off(event, fn) {
    const set = this.events.get(event)
    if (set) set.delete(fn)
  }

  once(event, fn) {
    const wrapper = (...args) => {
      this.off(event, wrapper) // 先移除再执行，保证只触发一次
      fn(...args)
    }
    this.on(event, wrapper)
  }

  emit(event, ...args) {
    const set = this.events.get(event)
    if (!set) return
    // 拷贝一份再遍历，防止回调里 off 自己导致漏触发
    for (const fn of [...set]) fn(...args)
  }
}

const bus = new EventBus()

// 测试 1：多个订阅者 + 传参
bus.on('login', (user) => console.log('埋点上报:', user))
const offLogger = bus.on('login', (user) => console.log('日志记录:', user))
bus.emit('login', '张三')

// 测试 2：off 取消订阅
offLogger()
bus.emit('login', '李四')

// 测试 3：once 只触发一次
bus.once('pay', (amount) => console.log('支付成功:', amount))
bus.emit('pay', 100)
bus.emit('pay', 200) // 不再触发
```

```text output
埋点上报: 张三
日志记录: 张三
埋点上报: 李四
支付成功: 100
```

## 原理讲解

1. **数据结构**：`Map<事件名, Set<回调>>`。用 Map 而不是普通对象，键不受字符串限制、性能更好；用 Set 而不是数组，`add` 天然去重、`delete` 是 O(1)，且避免同一函数重复订阅。
2. **on 返回取消函数**：`on` 返回 `() => this.off(event, fn)`，调用方不用记住回调引用也能取消订阅——React/Vue 的副作用清理里常见这种写法。
3. **once 的技巧**：包一层 `wrapper`，回调触发时**先 off 再执行**。先移除是关键：如果回调内部又 `emit` 同名事件，先 off 能防止递归中重复触发。
4. **emit 拷贝遍历**：`for (const fn of [...set])` 先复制一份快照再遍历。如果直接遍历 Set，而某个回调里调用了 `off` 删除后面的回调，会导致后面的回调被跳过。
5. **发布订阅 vs 观察者模式**：观察者模式里 Subject 直接持有 Observer 列表并通知；发布订阅多了一个「事件中心」做中介，发布者和订阅者互不知晓，解耦更彻底。EventBus 就是典型的事件中心。

## 追问与易错点

- **Vue2 的 `$on/$emit` 和 Vue3 的变化？** Vue2 组件实例自带 EventBus 能力，常用 `new Vue()` 做总线；Vue3 移除了实例的 `$on/$off/$once`，官方推荐用 `mitt` 这类第三方库。
- **EventBus 有什么缺点？** 事件流隐式、难以追踪调试；订阅忘记 off 会内存泄漏（组件销毁时必须在 `onUnmounted` / `beforeDestroy` 里取消）；滥用会破坏单向数据流。
- **怎么防止内存泄漏？** 组件销毁时统一 off；或提供 `off(event)` 不传 fn 清空该事件全部订阅的写法；进阶可用 WeakMap 存回调（但会牺牲遍历能力）。
- **emit 需要支持异步回调吗？** 基础版同步触发即可；若要支持，`emit` 里收集回调返回值并用 `Promise.all` 等待，得到 `emitAsync`。
- **和 Node 的 `EventEmitter` 有什么区别？** 核心 API 一致（on/off/once/emit）；EventEmitter 还有 `prependListener`、最大监听数告警（默认 10 个，防泄漏）等工程化细节。

## 相关题目

- [handwriting-001-debounce-throttle](/q/handwriting/handwriting-001-debounce-throttle)
