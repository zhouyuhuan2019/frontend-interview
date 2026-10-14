---
title: 监听对象的某个属性为什么没触发？watch 的 deep、flush 与停止监听怎么用？
subtopic: computed 与 watch
difficulty: middle
frequency: high
tags: [Vue3, watch, deep, flush, 停止监听]
order: 90
related: [vue3-004-watch-watcheffect, vue3-003-ref-vs-reactive]
---

一段很典型的「watch 不生效」代码：

```js
import { reactive, watch } from 'vue'

const state = reactive({ user: { name: 'a' }, count: 0 })

// 想监听 state.user.name 的变化
watch(state.user.name, (val) => {
  console.log('name 变了:', val) // 永远不打印
})
```

`state.user.name` 明明改了，回调却一次都不执行。为什么？`deep` 什么时候必须加？`flush` 的三个取值有什么区别？组件卸载后监听会自己停吗？

## 参考答案

- 监听 `reactive` 对象的**具体属性**，必须用 getter：`watch(() => state.user.name, cb)`；直接传 `state.user.name` 传进去的是一个普通值（字符串），不是合法的监听源。
- 监听**整个对象/数组**的深层变化要加 `{ deep: true }`；`reactive` 对象作为源时默认就是深层监听，但 getter 返回的对象不会自动深层。
- `flush` 三个取值：`'pre'`（默认，组件更新前）、`'post'`（DOM 更新后）、`'sync'`（同步立即触发）。
- 停止：`watch` 返回 `stop` 函数；在**同步作用域**里创建的监听会随组件卸载自动停止，在异步回调里创建的需要手动 `stop()`。

## 原理讲解

### 现象一：把「值」当成了「源」

`watch` 接受的源只有四种：**ref、getter 函数、reactive 对象、以及它们组成的数组**。`state.user.name` 是一个字符串，不在其中，Vue 会给出开发警告并忽略它：

```js
const state = reactive({ user: { name: 'a' } })

watch(state.user.name, cb)                    // ❌ 传的是值 'a'，不是源
watch(() => state.user.name, cb)              // ✅ getter：监听具体属性
watch(state.user, cb)                         // ✅ reactive 对象，默认深层
watch(() => state.user, cb, { deep: true })   // ✅ getter 返回对象时需手动 deep
watch([() => state.user.name, () => state.count], cb) // ✅ 监听多个源
```

### 现象二：deep 监听时 oldVal 拿不到「旧值」

深度监听一个对象时，`newVal` 和 `oldVal` 指向的是**同一个对象引用**（Proxy 原地修改），所以两者内容永远相同、无法做 diff：

```js run
const history = []

// 简化版「deep 监听」：新旧值都指向同一个对象引用
function watchDeep(newVal, oldVal) {
  history.push(`{ name: ${newVal.name} } old === new：${oldVal === newVal}`)
}

let user = { name: 'a' }
const sameRef = user
watchDeep(user, sameRef) // 深度监听：oldVal 与 newVal 是同一个对象

// 用 getter 返回快照，就能拿到真正的旧值
let prev = { ...user }
user = { ...user, name: 'b' }
watchDeep(user, prev)

console.log(history.join('\n'))
```

```text output
{ name: a } old === new：true
{ name: b } old === new：false
```

深度监听想拿到真正的旧值，要么用 getter 返回**基本类型**（`() => state.user.name`，基本类型能正确比较新旧），要么在回调里手动保存上一次的深拷贝快照。清理副作用则用回调的 `onCleanup`：

```js
watch(keyword, (val, oldVal, onCleanup) => {
  const controller = new AbortController()
  fetch(`/api?q=${val}`, { signal: controller.signal })
  onCleanup(() => controller.abort()) // keyword 再变时，先取消上一次请求
})
```

### 现象三：flush 决定回调执行时机

| flush | 执行时机 | 典型用途 |
| --- | --- | --- |
| `'pre'`（默认） | 组件更新前，回调里 `state` 已是最新、DOM 还是旧值 | 大多数逻辑、发请求 |
| `'post'` | DOM 更新后，等价于 `watchPostEffect` | 需要读取更新后的 DOM / 尺寸 |
| `'sync'` | 数据一变立即同步执行 | 极少用，容易引发多次触发和性能问题 |

```js
// 想在 DOM 更新后拿到最新高度
watch(count, () => {
  console.log(el.value.offsetHeight) // flush 默认 pre 时这里还是旧高度
}, { flush: 'post' })
```

### 现象四：异步里创建的 watch 不会自动停

```js
// 同步作用域：随组件卸载自动停止
const stop = watch(source, cb)

// 异步作用域（如 setTimeout / await 之后）：必须手动停
setTimeout(() => {
  const stop2 = watch(source, cb)
  // 组件早卸载了，这个监听仍在跑 → 内存泄漏
  onUnmounted(() => stop2())
})
```

## 追问与易错点

- **`watch` 能监听多个源吗？** 能，传数组：`watch([a, () => b.c], ([newA, newC], [oldA, oldC]) => {})`，新值和旧值也都是数组。
- **`immediate: true` 时第一次回调的 `oldVal` 是什么？** 是 `undefined`，因为此时还没有「上一次」的值，代码要做好空值判断。
- **`deep: true` 对性能有影响吗？** 有。它会递归遍历对象建立依赖，大对象/大数组上开销明显；能精确用 getter 监听属性就别整对象 deep。
- **为什么 `flush: 'post'` 里能拿到最新 DOM？** 因为回调被排到组件 patch 之后的队列执行；而默认 `'pre'` 排在更新前，此时 DOM 还是上一帧的。
- **`watch` 和 `watchEffect` 在停止监听上有区别吗？** 没有，两者都返回 `stop` 函数，生效范围规则（同步/异步作用域）也完全一致。
- **监听 `ref` 对象内部的深层属性要 deep 吗？** 要。`watch(someRef, cb)` 默认只监听 `.value` 整体替换；`someRef.value` 是对象且只想监听其中某字段时，用 `() => someRef.value.xxx`。

## 相关题目

- [vue3-004-watch-watcheffect](/q/vue3/vue3-004-watch-watcheffect)
- [vue3-003-ref-vs-reactive](/q/vue3/vue3-003-ref-vs-reactive)
