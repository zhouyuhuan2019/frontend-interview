---
title: Teleport/Suspense/Fragment 等新特性是什么？
subtopic: 内置组件与新特性
difficulty: middle
frequency: medium
tags: [Vue3, Teleport, Suspense, Fragment, 内置组件]
order: 70
related: [vue3-002-composition-api]
---

## 参考答案

Vue3 的三个代表性新特性：

| 特性 | 是什么 | 解决什么问题 |
| --- | --- | --- |
| `Fragment` | 组件模板可以有多个根节点 | 不再需要一个无意义的包裹 `<div>`，DOM 结构更干净 |
| `Teleport` | 把组件的一部分模板「传送」到 DOM 其他位置渲染 | 弹窗、Toast 跳出父组件的 `overflow: hidden` / `z-index` 层叠上下文 |
| `Suspense`（实验性） | 等待嵌套的异步依赖时展示 fallback 内容 | 优雅处理 `async setup` 与异步组件的加载态 |

其他常被一起问到的新特性：`<script setup>` 语法糖、`defineProps` / `defineEmits` 编译器宏、`emits` 选项、自定义渲染器 API、CSS 中的 `v-bind()`。

## 原理讲解

**Fragment**：Vue2 的模板编译产物必须有唯一根节点；Vue3 编译器支持多根。代价是属性继承（`$attrs` 自动落到根元素）失效，多根组件中需要显式指定落点：

```vue
<template>
  <header v-bind="$attrs">...</header> <!-- 显式指定 attrs 落点 -->
  <main>...</main>
  <footer>...</footer>
</template>
```

**Teleport**：逻辑上仍属于当前组件（能访问组件的响应式状态，事件照常按组件树冒泡），物理上渲染到 `to` 选择器指定的任意 DOM 节点：

```vue
<template>
  <button @click="open = true">打开弹窗</button>

  <Teleport to="body">
    <div v-if="open" class="modal">
      <p>即使父组件 overflow: hidden，弹窗也能正常铺满视口</p>
      <button @click="open = false">关闭</button>
    </div>
  </Teleport>
</template>
```

典型场景：Modal、Drawer、Tooltip、Toast。配合 `:disabled="true"` 可临时禁用传送（比如全屏模式时收回原位置）。

**Suspense**：组件树中存在「异步依赖」时（`async setup()`、`<script setup>` 顶层 `await`、`defineAsyncComponent`），`Suspense` 在 `#default` 就绪前渲染 `#fallback`：

```vue
<template>
  <Suspense>
    <template #default>
      <AsyncDashboard /> <!-- 内部顶层 await 获取数据 -->
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

注意：`Suspense` 目前仍是实验性 API，不建议生产环境重度依赖；它只等待**异步依赖**，不会接管 `onMounted` 里发的普通请求——那种 loading 状态仍需自己管理。

## 追问与易错点

- **Teleport 里的组件还能用父组件的 provide 吗？** 能。Teleport 只改变 DOM 挂载位置，组件树层级不变，provide / inject、事件冒泡都按逻辑树走。
- **Suspense 能捕获接口报错吗？** 可以配合 `onErrorCaptured` 捕获异步依赖的失败，但 Suspense 自身没有 error 插槽，需要外层组件捕获后切换 UI。
- **Fragment 会破坏哪些 Vue2 用法？** 依赖 `$el` 是唯一元素、以及在子组件上写 `class` / `style` 期望自动继承到唯一根节点的代码，都需要调整。
- **Teleport 的 `to` 目标必须在挂载时存在吗？** 是，目标元素必须在 Teleport 挂载时已存在于 DOM 中，否则内容不会渲染（目标后来出现也不会自动补渲染）。
- **还有哪些「隐藏」新特性值得提？** `v-if` 与 `v-for` 优先级互换（`v-if` 现在优先）、过滤器 filter 被移除、全局 API 从 `Vue.prototype` 改为 `app.config.globalProperties`、事件总线 `$on` / `$off` 被移除。

## 相关题目

- [vue3-002-composition-api](/q/vue3/vue3-002-composition-api)
- [vue3-005-lifecycle-mapping](/q/vue3/vue3-005-lifecycle-mapping)
