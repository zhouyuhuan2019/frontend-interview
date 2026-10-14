---
title: watch 与 watchEffect 的区别是什么？
subtopic: computed 与 watch
difficulty: middle
frequency: high
tags: [Vue3, watch, watchEffect, 副作用, 依赖收集]
order: 40
related: [vue3-003-ref-vs-reactive]
---

## 参考答案

一句话区别：**`watch` 显式指定监听谁、默认惰性；`watchEffect` 自动收集回调里用到的依赖、立即执行一次。**

| 维度 | `watch` | `watchEffect` |
| --- | --- | --- |
| 依赖来源 | 显式指定（ref / getter / 数组） | 回调执行时自动收集 |
| 首次执行 | 默认不执行（需 `immediate: true`） | 立即执行一次 |
| 新旧值 | 回调能拿到 `(newVal, oldVal)` | 拿不到 |
| 监听深度 | 监听 reactive 对象默认深层 | 只追踪回调里实际访问到的属性 |
| 适用场景 | 需要精确控制、对比新旧值 | 依赖多且都被用到，只想「变了就重跑」 |

## 原理讲解

两者底层是同一套 `watch` 实现（`watchEffect` 等价于自动收集依赖的版本），区别在**依赖的确定方式**：

```js
const count = ref(0)
const name = ref('a')

// watch：依赖是显式声明的，count 不变就不触发
watch(count, (newVal, oldVal) => {
  console.log(`count: ${oldVal} -> ${newVal}`)
})

// watchEffect：执行回调时访问了谁，就追踪谁
watchEffect(() => {
  console.log(count.value, name.value) // count 和 name 都被追踪
})
```

`watchEffect` 的依赖是**动态**的：某次执行因为条件分支没访问到某个属性，这个属性就不再被追踪：

```js
watchEffect(() => {
  if (flag.value) {
    console.log(count.value) // flag 为 false 时，count 变化不会触发
  }
})
```

监听响应式对象的**具体属性**必须用 getter 形式，这是高频易错点：

```js
const state = reactive({ user: { name: 'a' } })

watch(state.user, () => {})            // 监听的是对象本身，不是属性
watch(() => state.user.name, () => {}) // 正确：监听具体属性
watch(() => state.user, () => {}, { deep: true }) // 正确：深度监听整个对象
```

清理副作用：两者都通过回调的第三个参数（`watchEffect` 是第一个参数）`onCleanup` 注册清理函数，常用于取消上一次请求、清除定时器：

```js
watch(keyword, (val, oldVal, onCleanup) => {
  const controller = new AbortController()
  fetch(`/api?q=${val}`, { signal: controller.signal })
  onCleanup(() => controller.abort()) // keyword 再变时先取消上一次请求
})
```

执行时机通过 `flush` 控制：`'pre'`（默认，组件更新前）、`'post'`（DOM 更新后，等价于 `watchPostEffect`）、`'sync'`（同步触发，慎用）。

## 追问与易错点

- **深度监听对象时 `oldVal` 为什么和 `newVal` 一样？** 深度监听的是同一个对象引用，新旧值指向同一对象，这是设计使然；需要快照就手动深拷贝，或改用 getter 返回新值。
- **怎么停止监听？** 两者都返回停止函数：`const stop = watch(...); stop()`。在 `setup` 同步作用域创建的 watch 会随组件卸载自动停止；在异步回调里创建的需要手动停。
- **`watchEffect` 和 `computed` 怎么选？** 要返回值用 `computed`；纯副作用（打日志、发请求、操作 DOM）用 `watchEffect`。
- **`watch` 可以同时监听多个源吗？** 可以，传数组：`watch([a, () => b.c], ([newA, newC], [oldA, oldC]) => {})`。

## 相关题目

- [vue3-003-ref-vs-reactive](/q/vue3/vue3-003-ref-vs-reactive)
- [vue3-001-proxy-reactivity](/q/vue3/vue3-001-proxy-reactivity)
