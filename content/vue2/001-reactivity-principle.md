---
title: Vue2 的响应式原理是什么？它有哪些缺陷？
subtopic: 响应式原理
difficulty: middle
frequency: high
tags: [Vue2, 响应式, defineProperty, 数组, 依赖收集]
order: 10
---

## 参考答案

Vue2 用 `Object.defineProperty` 把 data 的每个属性改写成 getter / setter：

- **getter**：收集依赖（把当前正在渲染的 watcher 记入 `dep`）；
- **setter**：数据变化时通知 `dep`，`dep` 再通知所有 watcher 更新。

核心链路：`data → defineProperty 拦截 → Dep（依赖容器）→ Watcher（订阅者）→ 派发更新`。

它有三个典型缺陷：

1. **无法检测属性的新增与删除**，必须用 `Vue.set` / `Vue.delete`；
2. **无法检测数组下标赋值与长度修改**（`arr[0] = x`、`arr.length = 0` 不触发更新），只能重写 `push` / `pop` / `shift` / `unshift` / `splice` / `sort` / `reverse` 七个方法；
3. **必须递归遍历全部属性**，初始化时性能开销大，深层对象成本高。

## 原理讲解

简化版的响应式实现：

```js
function defineReactive(obj, key) {
  let value = obj[key]
  const dep = []
  Object.defineProperty(obj, key, {
    get() {
      if (currentWatcher && !dep.includes(currentWatcher)) dep.push(currentWatcher)
      return value
    },
    set(next) {
      if (next === value) return
      value = next
      dep.forEach((watcher) => watcher())
    },
  })
}
```

数组的处理是在 `Observer` 阶段把 `Array.prototype` 上的七个方法替换为「先执行原方法，再手动 `ob.dep.notify()`」的版本，所以 Vue2 里 `push` 能触发更新，而下标赋值不能。

## 追问与易错点

- **`Vue.set` 为什么能生效？** 它在新属性上补一次 `defineReactive`，并手动触发 `ob.dep.notify()`。
- **`v-if` 和 `v-show` 的响应式行为有区别吗？** `v-if` 是创建/销毁组件（会重新走一遍响应式初始化），`v-show` 只切 `display`，切换成本更低。
- **为什么大量数据用 Vue2 会卡？** 递归 `defineProperty` 是初始化瓶颈；Vue3 换成 `Proxy` 后可以做到「访问到才代理」，惰性化明显。
- **Vue2 有什么优化手段？** `Object.freeze` 冻结大对象跳过响应式处理；把不需要响应的数据不放进 `data`。

## 相关题目

- [vue3-001-proxy-reactivity](/q/vue3/vue3-001-proxy-reactivity)
