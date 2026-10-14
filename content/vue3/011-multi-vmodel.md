---
title: Vue3 组件上多个 v-model 怎么写？和 Vue2 的 .sync 有什么区别？
subtopic: 组件通信
difficulty: middle
frequency: medium
tags: [Vue3, v-model, 多个 v-model, .sync, 组件通信]
order: 110
related: [vue3-006-v-model-changes, vue3-010-props-emits]
---

一个弹窗组件要同时双向绑定「标题」和「是否显示」两个值。Vue2 时代我们这样写：

```vue
<BaseModal :title.sync="title" :visible.sync="visible" />
```

迁移到 Vue3 后，`.sync` 已经不存在了，等价写法是什么？子组件里又该怎么接收多个 v-model？两个值会不会互相冲突？

## 参考答案

Vue3 用**带参数的 `v-model`** 取代了 `.sync`，一个组件可以挂任意多个：

```vue
<!-- 父组件：同时双向绑定两个值 -->
<BaseModal v-model:title="title" v-model:visible="visible" />
```

它等价于「prop 下传 + `update:xxx` 事件上传」：

```vue
<BaseModal
  :title="title"
  @update:title="title = $event"
  :visible="visible"
  @update:visible="visible = $event"
/>
```

一句话对比：**Vue2 的 `.sync` 和 `v-model` 在 Vue3 里合并成了同一套机制——`v-model:name` 就是「`name` prop + `update:name` 事件」。**

## 原理讲解

### 从 Vue2 到 Vue3

| 维度 | Vue2 | Vue3 |
| --- | --- | --- |
| 单个 v-model | `value` + `input` | `modelValue` + `update:modelValue` |
| 多个双向绑定 | `.sync`：`:title.sync="t"` | `v-model:title="t"` |
| 自定义绑定名 | `model` 选项改 prop / event 名 | `v-model:参数` 直接指定 |
| 自定义修饰符 | 不支持 | 支持，通过 `xxxModifiers` prop 接收 |

参数名直接决定 prop 名和事件名：`v-model:title` → prop `title` + 事件 `update:title`。

### 本质：一组 prop / 事件对

`v-model` 没有任何魔法，就是「读 prop、在变化时 emit」的语法糖。用普通对象模拟，多个 v-model 就是多组独立的 prop/事件对：

```js run
const parentState = { title: 'hello', visible: false }

// 模拟子组件里的 v-model 绑定：读 .value 拿 prop，写 .value 相当于 emit('update:xxx')
function useVModel(key) {
  return {
    get value() {
      return parentState[key]
    },
    set value(v) {
      parentState[key] = v
    },
  }
}

const title = useVModel('title')
const visible = useVModel('visible')

title.value = title.value.toUpperCase() // 触发 update:title
visible.value = true // 触发 update:visible

console.log(parentState)
```

```text output
{"title":"HELLO","visible":true}
```

### 子组件怎么写

最直观的写法是显式声明 props 和 emits：

```vue
<script setup>
defineProps(['title', 'visible'])
const emit = defineEmits(['update:title', 'update:visible'])
</script>

<template>
  <input :value="title" @input="emit('update:title', $event.target.value)" />
  <button @click="emit('update:visible', false)">关闭</button>
</template>
```

Vue 3.4+ 可以用 `defineModel` 简写，参数名与 `v-model:` 后的名字对应：

```vue
<script setup>
const title = defineModel('title')     // 对应 v-model:title
const visible = defineModel('visible', { type: Boolean, default: false })
// 不带参数的 defineModel() 对应默认的 v-model（modelValue）
</script>

<template>
  <input v-model="title" />
  <button @click="visible = false">关闭</button>
</template>
```

自定义修饰符按参数分开传递：`v-model:title.trim` 会通过 `titleModifiers` prop 传入，`v-model.trim`（默认模型）则通过 `modelModifiers` 传入。

## 追问与易错点

- **Vue2 的 `.sync` 还能用吗？** 不能，已移除。`:title.sync="t"` 全部改写成 `v-model:title="t"`，语义完全一致。
- **子组件不声明 `update:xxx` 会怎样？** 能跑，但未声明的事件会当作 fallthrough attribute 落到根元素上，可能产生意外的 DOM 属性，建议始终在 `defineEmits` 中声明。
- **`defineModel` 有什么硬性要求？** 需要 Vue 3.4+。传参时参数名必须和 `v-model:` 后的名字一致，如 `v-model:title` 对应 `defineModel('title')`。
- **多个 v-model 会互相影响吗？** 不会，每个参数对应独立的 prop 和事件，是完全独立的数据通道。
- **一个 v-model 能同时绑定多个 prop 吗？** 不能，一个 `v-model:xxx` 只对应一个 prop；需要多个就用多个参数。
- **修改默认模型的值该 emit 什么？** 默认模型用 `emit('update:modelValue', value)`；带参数的则用 `emit('update:参数名', value)`。

## 相关题目

- [vue3-006-v-model-changes](/q/vue3/vue3-006-v-model-changes)
- [vue3-010-props-emits](/q/vue3/vue3-010-props-emits)
