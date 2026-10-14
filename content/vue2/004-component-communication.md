---
title: Vue2 组件通信方式有哪些？
subtopic: 组件通信
difficulty: middle
frequency: high
tags: [Vue2, 组件通信, props, eventBus, provide-inject]
order: 40
related: [vue2-008-slot]
---

## 参考答案

按组件关系分类，常用方式如下：

| 关系 | 方式 |
|---|---|
| 父 → 子 | `props` |
| 子 → 父 | `$emit` 自定义事件 / `.sync` 修饰符 |
| 跨层级（祖先后代） | `provide` / `inject`、`$attrs` / `$listeners` |
| 任意组件 | EventBus（事件总线）、Vuex |

选型建议：**父子用 props / $emit，跨级用 provide/inject，全局共享状态用 Vuex；EventBus 只适合小型项目的临时方案。**

## 原理讲解

**1. props / $emit（最基础）**

```vue
<!-- 父组件 -->
<template>
  <Child :title="msg" @change="onChange" />
</template>
```

```vue
<!-- 子组件 -->
<script>
export default {
  props: { title: String },
  methods: {
    notify() {
      this.$emit('change', 'new value')
    },
  },
}
</script>
```

原则是**单向数据流**：子组件不直接改 props，而是通过事件通知父组件修改。`.sync` 是「props 下行 + update 事件上行」的语法糖：`:title.sync="msg"` 等价于 `:title="msg" @update:title="msg = $event"`。

**2. provide / inject（跨层级）**

```vue
<script>
// 祖先组件
export default {
  provide() {
    return { theme: this.theme }
  },
}

// 任意后代组件
export default {
  inject: ['theme'],
}
</script>
```

注意 Vue2 中 provide 的数据**默认不是响应式的**，需要传响应式对象（如整个组件实例或一个已被观察的对象）。

**3. EventBus（任意组件）**

```js
// bus.js：一个空的 Vue 实例当事件中心
import Vue from 'vue'
export const bus = new Vue()

// 发送方
bus.$emit('refresh', payload)

// 接收方（注意在 beforeDestroy 中解绑）
bus.$on('refresh', handler)
```

**4. $attrs / $listeners（高阶组件封装）**

`$attrs` 收集父级传入但未声明为 props 的属性，`$listeners` 收集父级绑定的事件，配合 `v-bind="$attrs"` / `v-on="$listeners"` 可把它们透传给下层组件。

## 追问与易错点

- **EventBus 有什么坑？** 组件销毁后忘记 `$off` 会导致回调重复触发和内存泄漏；事件名全局散落、数据来源难追踪，大项目应换 Vuex。
- **子组件能直接修改 props 吗？** 语法上对象类型 props 的属性可以被改（引用共享），但这是反模式，破坏单向数据流，应通过 `$emit` 通知父组件。
- **`$parent` / `$refs` 算通信方式吗？** 能拿到组件实例直接读写数据，但耦合极强、破坏封装，只建议在表单类等紧耦合场景使用。
- **provide 的数据为什么不是响应式的？** Vue2 的 provide 只在初始化时注入一次引用，注入的键本身没有被依赖收集；把提供的数据做成响应式对象（或提供整个实例）即可让后代拿到响应式内容。

## 相关题目

- [vue2-001-reactivity-principle](/q/vue2/vue2-001-reactivity-principle)
- [vue2-008-slot](/q/vue2/vue2-008-slot)
