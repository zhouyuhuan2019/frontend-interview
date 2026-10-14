---
title: setup 里怎么获取 DOM 或子组件实例？模板 ref 怎么用？
subtopic: 模板 ref 与 DOM
difficulty: junior
frequency: high
tags: [模板ref, ref, defineExpose, DOM, nextTick]
order: 160
related: [vue3-002-composition-api, vue3-005-lifecycle-mapping]
---

需求：页面加载后自动让输入框获得焦点，另外还要调用子组件暴露出来的方法。用 `<script setup>` 写法，应该怎么拿到 DOM 元素和子组件实例？

```vue
<script setup>
import { ref } from 'vue'

// 想拿到下面这个 input，然后调用它的 focus()
const inputRef = ref(null)
</script>

<template>
  <input ref="inputRef" />
</template>
```

## 参考答案

Vue3 里通过**模板 ref** 获取 DOM 或子组件实例，三步走：

1. 在 `<script setup>` 里声明一个 `ref(null)` 变量；
2. 在模板上给元素/组件加 `ref="变量名"`（字符串要和变量名**完全一致**）；
3. 在 `onMounted` 之后通过 `变量.value` 访问真实 DOM 或组件实例。

完整示例：

```vue
<script setup>
import { ref, onMounted } from 'vue'

const inputRef = ref(null)

onMounted(() => {
  inputRef.value?.focus()      // 挂载完成后才有值
})
</script>

<template>
  <input ref="inputRef" />
</template>
```

对子组件，则需要子组件先用 `defineExpose` 把方法/属性暴露出来，父组件才能通过模板 ref 调用。

## 原理讲解

**现象**：写成 `const el = document.querySelector('#input')` 也能跑，但一放到组件里、或元素由 `v-if` 控制时就拿不到、或拿到的是过期节点。

**原因**：

- 模板 ref 的值在**组件挂载完成后**才被赋值为真实 DOM/实例；在 `<script setup>` 顶层立即访问必然是 `null`，因为那时还没渲染。
- 对于子组件，`<script setup>` 默认是**封闭**的——父组件拿到的实例上没有任何内部属性/方法，必须由子组件 `defineExpose` 显式开放。

**解决方案**：

**① 基础用法（关注时机）**

```vue
<script setup>
import { ref, onMounted } from 'vue'

const inputRef = ref(null)

// 在 onMounted 里访问，此时组件已挂载
onMounted(() => {
  console.log(inputRef.value)   // <input> 元素
  inputRef.value?.focus()
})
</script>

<template>
  <input ref="inputRef" />
</template>
```

这里 `ref` 变量的角色就是一个「容器」——它不直接保存 DOM，而是把 DOM 放在 `.value` 里，所以模板更新时能同步刷新：

```js run
// 用纯 JS 说明 ref 的「容器」本质：模板 ref 复用的就是这个结构
function createRef(initial) {
  return { value: initial }
}

const inputRef = createRef(null)
inputRef.value = '<input class="focused">'   // 挂载后 Vue 帮我们写入真实 DOM
console.log(inputRef.value)
```

```text output
<input class="focused">
```

**② 拿子组件实例（必须 `defineExpose`）**

```vue
<!-- Child.vue -->
<script setup>
import { ref } from 'vue'

const count = ref(0)
function reset() {
  count.value = 0
}

// 只暴露需要给父组件用的东西
defineExpose({ count, reset })
</script>

<template>
  <button @click="count++">count: {{ count }}</button>
</template>
```

```vue
<!-- Parent.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import Child from './Child.vue'

const childRef = ref(null)

onMounted(() => {
  childRef.value.reset()        // 调用子组件暴露的方法
  console.log(childRef.value.count)
})
</script>

<template>
  <Child ref="childRef" />
</template>
```

**③ `v-for` 里的多个元素 ref → 用函数式 ref**

```vue
<script setup>
import { ref } from 'vue'

const itemRefs = ref([])     // 或写成普通对象作 map
</script>

<template>
  <ul>
    <li
      v-for="item in 3"
      :key="item"
      :ref="(el) => (itemRefs[item] = el)"
    >
      第 {{ item }} 项
    </li>
  </ul>
</template>
```

**④ 元素由 `v-if` 控制**：`v-if` 为真时才渲染，因此要等下一次 DOM 更新完成后再取 —— 用 `nextTick`：

```js
import { ref, nextTick } from 'vue'

const show = ref(false)
const boxRef = ref(null)

async function open() {
  show.value = true
  await nextTick()            // 等 DOM 更新完成
  boxRef.value?.scrollIntoView()
}
```

## 追问与易错点

- **为什么 ref 要用 `.value` 访问？** 模板 ref 变量本身是一个响应式容器，真实值存在 `.value` 里；Vue 在挂载/卸载时负责写入它，放在模板中的 `ref="inputRef"` 只是把变量名告诉编译器。
- **在 `<script setup>` 顶层直接 `inputRef.value.focus()` 为什么报错？** 那时组件还没挂载，`inputRef.value` 是 `null`。要放进 `onMounted`，或用 `inputRef.value?.focus()` 做空值保护。
- **`v-if` 控制的元素什么时候能拿到？** 在 `v-if` 变 true 且 DOM 更新完成后，通常配合 `await nextTick()` 或在 `onUpdated` 里取值；变量设置为 true 的那一刻 DOM 还没生成。
- **为什么拿不到子组件里定义的方法？** `<script setup>` 组件默认封闭，实例上没有内部成员；必须在子组件里 `defineExpose({ ... })`，父组件才能访问。
- **`ref` 变量名和模板里的字符串不一致会怎样？** 该 ref 永远为 `null`（Vue 会告警「模板 ref 未绑定」）。名字必须逐字符一致；用 `useTemplateRef('inputRef')`（Vue 3.5+）时则以字符串名为准。
- **组件卸载后 ref 会自动置空吗？** 会。元素/组件被移除时，Vue 会把对应 ref 置为 `null`，因此取值时建议始终做 `?.` 保护。

## 相关题目

- [vue3-002-composition-api](/q/vue3/vue3-002-composition-api)
- [vue3-005-lifecycle-mapping](/q/vue3/vue3-005-lifecycle-mapping)
