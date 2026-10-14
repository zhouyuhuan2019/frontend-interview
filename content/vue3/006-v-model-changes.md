---
title: Vue3 的 v-model 相比 Vue2 有什么变化？
subtopic: 组件通信
difficulty: middle
frequency: medium
tags: [Vue3, v-model, modelValue, 组件通信, 自定义修饰符]
order: 60
---

## 参考答案

Vue3 对组件 `v-model` 做了四个核心改动：

| 维度 | Vue2 | Vue3 |
| --- | --- | --- |
| 默认 prop / 事件 | `value` + `input` | `modelValue` + `update:modelValue` |
| 多个 v-model | 不支持（一个组件只能一个） | 支持，`v-model:title` 可任意多个 |
| 自定义绑定名 | 靠 `model` 选项改 prop / event 名 | 直接用参数语法 `v-model:xxx` |
| `.sync` 修饰符 | 存在（`:title.sync`） | **移除**，统一用 `v-model:title` 替代 |
| 自定义修饰符 | 不支持 | 支持，通过 `xxxModifiers` prop 接收 |

一句话：**`.sync` 与 `v-model` 合并成了同一套机制，且一个组件可以用多个 v-model。**

## 原理讲解

`v-model` 的本质是「prop 下传 + 事件上传」的语法糖。Vue2 中：

```vue
<!-- Vue2 -->
<my-input :value="text" @input="text = $event" />
<!-- 等价于 -->
<my-input v-model="text" />
```

Vue3 改成 `modelValue` / `update:modelValue`，目的是支持**带参数的 v-model**——参数直接决定 prop 名和事件名：

```vue
<!-- 父组件：同时使用多个 v-model -->
<UserForm v-model:name="userName" v-model:age="userAge" />

<!-- 等价于 -->
<UserForm
  :name="userName"
  @update:name="userName = $event"
  :age="userAge"
  @update:age="userAge = $event"
/>
```

子组件实现：

```vue
<script setup>
defineProps(['name', 'age'])
const emit = defineEmits(['update:name', 'update:age'])
</script>

<template>
  <input :value="name" @input="emit('update:name', $event.target.value)" />
  <input :value="age" @input="emit('update:age', $event.target.value)" />
</template>
```

自定义修饰符是 Vue3 新增能力。比如实现 `v-model.capitalize` 自动首字母大写：

```vue
<!-- 父组件 -->
<my-input v-model.capitalize="text" />
```

```vue
<script setup>
const props = defineProps(['modelValue', 'modelModifiers'])
const emit = defineEmits(['update:modelValue'])

function onInput(e) {
  let val = e.target.value
  if (props.modelModifiers.capitalize) { // 修饰符通过 xxxModifiers prop 传入
    val = val.charAt(0).toUpperCase() + val.slice(1)
  }
  emit('update:modelValue', val)
}
</script>
```

带参数的修饰符对应 `<参数>Modifiers`，如 `v-model:title.trim` 对应 `titleModifiers` prop。

迁移注意：Vue2 的 `<comp :title.sync="t">` 直接换成 `<comp v-model:title="t">`；原生 `<input v-model>` 上的 `.trim` / `.number` / `.lazy` 三个内置修饰符保持不变。

## 追问与易错点

- **Vue2 组件里的 `model: { prop, event }` 选项还能用吗？** Vue3 已移除该选项，自定义 v-model 一律用参数语法。
- **原生元素和组件上的 `v-model` 有区别吗？** 原生元素编译成真实 DOM 的 value / checked / selected 绑定加事件监听；组件上则是 prop + 自定义事件，只是语法相同。
- **不声明 `update:modelValue` 这个 emit 会怎样？** 能运行，但未声明的事件会作为 fallthrough attribute 落到根元素上，可能导致意外的 DOM 属性，建议始终在 `emits` / `defineEmits` 中声明。
- **`v-model` 的参数可以动态吗？** 可以，`v-model:[propName]="value"` 支持动态参数。

## 相关题目

- [vue3-002-composition-api](/q/vue3/vue3-002-composition-api)
