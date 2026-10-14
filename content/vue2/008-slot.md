---
title: 插槽有几种？作用域插槽解决什么问题？
subtopic: 插槽
difficulty: middle
frequency: medium
tags: [Vue2, 插槽, slot, 作用域插槽, 组件复用]
order: 80
related: [vue2-004-component-communication]
---

## 参考答案

Vue2 插槽分三种：

| 类型 | 语法（2.6+） | 用途 |
|---|---|---|
| 默认插槽 | `<slot></slot>` | 组件预留一个内容出口 |
| 具名插槽 | `<slot name="header">` + `v-slot:header` | 一个组件多个内容出口 |
| 作用域插槽 | `<slot :item="item">` + `v-slot="props"` | 子组件把数据传给插槽内容 |

**作用域插槽解决的问题**：插槽内容写在**父组件**模板里，却需要用**子组件**的数据来渲染——让「组件负责数据和逻辑，调用方决定展示形式」，典型场景是列表 / 表格组件的自定义行渲染。

## 原理讲解

**1. 默认插槽与具名插槽**

```vue
<!-- 子组件 Card.vue -->
<template>
  <div class="card">
    <header><slot name="header">默认标题</slot></header>
    <main><slot>默认内容</slot></main>
  </div>
</template>
```

```vue
<!-- 父组件使用 -->
<Card>
  <template v-slot:header>我的标题</template>
  <p>正文内容</p>
</Card>
```

`<slot>` 标签内的内容是**后备内容**，父组件不传对应插槽时才显示。

**2. 作用域插槽**

```vue
<!-- 子组件 List.vue：把每一项的数据通过 slot props 暴露出去 -->
<template>
  <ul>
    <li v-for="(item, index) in items" :key="item.id">
      <slot :item="item" :index="index">{{ item.text }}</slot>
    </li>
  </ul>
</template>
```

```vue
<!-- 父组件：拿到子组件传出的 item，自由决定渲染方式 -->
<List :items="todos">
  <template v-slot="{ item }">
    <span :class="{ done: item.done }">{{ item.text }}</span>
  </template>
</List>
```

**核心规则：编译作用域**——父级模板里的所有内容都在**父级作用域**编译，所以插槽内容默认访问不到子组件的 data。作用域插槽相当于子组件渲染 `<slot>` 时把数据作为「参数」传给父组件提供的「函数」（插槽编译后就是一个接收 props 的函数），从而打通父子作用域。

这也是作用域插槽的意义所在：组件把「怎么渲染」的决定权交给使用方，同时把「渲染所需的数据」传出去。

## 追问与易错点

- **为什么父组件插槽里直接用不了子组件的 data？** 编译作用域决定了模板在哪个组件写就在哪个组件的作用域求值；要用子组件数据必须靠作用域插槽显式传递。
- **`v-slot` 能写在普通元素上吗？** 不能，`v-slot` 只能写在 `<template>` 或组件标签上（写在组件标签上是默认插槽的简写，仅当该组件只有一个默认插槽时可用）。
- **具名插槽可以带作用域吗？** 可以，两者可组合：`<template v-slot:row="{ item }">`。
- **作用域插槽和 props 传组件有什么区别？** 都能让父级定制渲染；作用域插槽写法更轻、与子组件模板结合自然，传渲染函数 / 组件则更灵活，适合表格列配置这类动态场景。
- **Vue2.6 前后的插槽语法差异？** 2.6 之前用 `slot="header"` 和 `slot-scope="props"`，已废弃；新语法统一为 `v-slot`（可简写为 `#header`、`#default`），面试中提一句可加分。

## 相关题目

- [vue2-004-component-communication](/q/vue2/vue2-004-component-communication)
- [vue2-006-v-for-key](/q/vue2/vue2-006-v-for-key)
