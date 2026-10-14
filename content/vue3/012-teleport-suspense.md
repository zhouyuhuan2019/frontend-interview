---
title: Teleport 与 Suspense 平时怎么用？弹窗挂载与异步组件加载怎么处理？
subtopic: 内置组件与新特性
difficulty: middle
frequency: medium
tags: [Vue3, Teleport, Suspense, 弹窗, 异步组件]
order: 120
related: [vue3-007-new-features, vue3-002-composition-api]
---

实际项目里常遇到两个「结构性」问题：

1. 弹窗写在某个卡片组件内部，结果被父级的 `overflow: hidden` 裁剪，`z-index` 也压不过外层，怎么摆都不对。
2. 某个页面要等接口返回才渲染，只能在 `onMounted` 里手写 `loading` 状态和各种判断，很难看。

这两个问题分别对应 Vue3 的哪个内置组件？具体怎么用？

## 参考答案

| 问题 | 用什么 | 一句话 |
| --- | --- | --- |
| 弹窗 / 抽屉 / Tooltip / Toast 被父容器裁切或层级压不过 | **`Teleport`** | 把元素从组件内部「传送」到 `body` 等指定 DOM 节点渲染 |
| 等异步依赖（接口、异步组件）就绪再渲染，期间展示加载态 | **`Suspense`** | 用 `#fallback` 兜住异步依赖未就绪的阶段 |

注意：`Suspense` 目前仍是**实验性** API，不建议在生产环境重度依赖；它只接管「异步依赖」，`onMounted` 里发的普通请求它并不等待。

## 原理讲解

### Teleport：只搬 DOM，不搬逻辑

`Teleport` 把模板的一部分「物理」渲染到 `to` 选择器指定的节点，但组件树层级不变：

- **物理位置**：真实 DOM 挂到了 `body` 下，所以能逃出父级的 `overflow: hidden` 和层叠上下文。
- **逻辑位置**：仍属于当前组件，能访问组件内的响应式状态，`provide` / `inject` 和事件冒泡都按逻辑树走。

```vue
<template>
  <button @click="open = true">打开弹窗</button>

  <!-- 弹窗被传送到 body，不再受父容器裁剪 -->
  <Teleport to="body">
    <div v-if="open" class="modal">
      <p>即使父组件 overflow: hidden，弹窗也能正常铺满视口</p>
      <button @click="open = false">关闭</button>
    </div>
  </Teleport>
</template>
```

配合 `:disabled` 可以临时禁用传送（比如全屏模式下把弹窗收回原位）：

```vue
<Teleport to="#modal-root" :disabled="isFullscreen">
  <!-- disabled 为 true 时，内容就在原地渲染 -->
</Teleport>
```

### Suspense：等待异步依赖

当组件树里出现「异步依赖」时，最近的 `Suspense` 会先渲染 `#fallback`，就绪后切换到 `#default`。被识别的异步依赖包括：`async setup()`、`<script setup>` 顶层的 `await`、以及 `defineAsyncComponent` 包裹的异步组件。

```vue
<template>
  <Suspense>
    <template #default>
      <AsyncDashboard /> <!-- 内部顶层 await 拿数据 -->
    </template>
    <template #fallback>
      <LoadingSpinner />
    </template>
  </Suspense>
</template>
```

```vue
<script setup>
// 顶层 await 让组件成为异步依赖，被最近的 Suspense 接管
const res = await fetch('/api/dashboard')
const data = await res.json()
</script>
```

它的行为就是「未就绪先兜底、就绪再渲染」，用普通 Promise 模拟一下：

```js run
// 模拟 Suspense：异步依赖就绪前渲染 fallback，就绪后渲染 default
function loadData() {
  return new Promise((resolve) => setTimeout(() => resolve({ name: 'dashboard' }), 0))
}

let data = null

console.log('渲染 fallback: 加载中...')

loadData().then((res) => {
  data = res
  console.log('渲染 default:', data.name)
})
```

```text output
渲染 fallback: 加载中...
渲染 default: dashboard
```

配合 `defineAsyncComponent` 做代码分割时也很自然：

```js
import { defineAsyncComponent } from 'vue'

const AsyncHeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'))
// 多个异步组件会被同一个 Suspense 一起等待
```

## 追问与易错点

- **`Teleport` 的 `to` 目标必须在挂载时存在吗？** 必须。目标元素要在 Teleport 挂载那一刻已存在于 DOM 中，之后才出现的目标不会自动补渲染。
- **`Teleport` 里的组件还能用父组件的 `provide` 吗？** 能。它只改变 DOM 挂载位置，组件树层级不变，`provide` / `inject`、事件冒泡都按逻辑树走。
- **`Suspense` 能捕获异步依赖的报错吗？** 它自身没有 error 插槽。可以配合 `onErrorCaptured` 在外层组件捕获失败后切换 UI。
- **`Suspense` 会等待 `onMounted` 里的请求吗？** 不会。它只等待 `async setup` / 顶层 `await` / 异步组件这类「异步依赖」，事件回调里的普通请求得自己管 loading。
- **有多个异步依赖会怎样？** `Suspense` 会等**所有**嵌套的异步依赖都 resolve 后才渲染 `#default`，任何一个还在 pending 就继续显示 fallback。
- **生产环境能用 `Suspense` 吗？** 它是实验性 API，可配合 `defineAsyncComponent` 做代码分割，但不建议把核心业务逻辑压在上面，注意后续版本行为可能调整。

## 相关题目

- [vue3-007-new-features](/q/vue3/vue3-007-new-features)
- [vue3-002-composition-api](/q/vue3/vue3-002-composition-api)
