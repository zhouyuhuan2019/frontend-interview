---
title: Pinia 怎么用？相比 Vuex 为什么要换？有哪些常见坑？
subtopic: Pinia
difficulty: middle
frequency: high
tags: [Pinia, 状态管理, Vuex, defineStore, Vue3]
order: 130
related: [vue3-002-composition-api, vue3-003-ref-vs-reactive]
---

新项目准备从 Vuex 迁移到 Pinia，同事问：Pinia 到底怎么定义和使用 store？相比 Vuex 为什么要换？日常写的时候又容易踩哪些坑？

下面这段代码是迁移后常见的写法，请指出它的问题：

```vue
<script setup>
import { useCounterStore } from '@/stores/counter'

const store = useCounterStore()
// 这样解构，视图不会随 store 变化而更新——这是个常见坑
const { count } = store
</script>
```

## 参考答案

Pinia 是 Vue 官方推荐的状态管理库，可以看成 Vuex 5 的思想落地：**去掉了 mutation，只保留 state / getters / actions 三个概念**；每个 store 就是一个 `defineStore` 定义出来的、可在组件中按需 `useXxxStore()` 获取的组合式函数。

相比 Vuex 的核心差异：

| 维度 | Vuex | Pinia |
| --- | --- | --- |
| 修改状态 | 必须 `commit` mutation，同步 | action 里直接改 state，也可同步/异步 |
| 类型推导 | 依赖字符串 mutation，TS 支持差 | 完整的 TS 类型推导，无魔法字符串 |
| 模块化 | 需要 `modules` + `namespaced` | 每个 store 天然独立，直接 import 使用 |
| 组合式复用 | 弱 | 支持 Setup Store，和 Composition API 一致 |
| 体积 | 较大 | 约 1KB，更轻 |

所以**新项目直接用 Pinia**；老项目迁移成本也不高（action 对应 mutation+action，getter 基本不变）。

上面那段解构代码的问题：直接解构 store 会**丢失响应式**，必须用 `storeToRefs` 或保留 `store.count` 访问。

## 原理讲解

**现象**：迁到 Pinia 后一切正常，但某天发现「点按钮，页面数字不更新」。

**原因**：`useCounterStore()` 返回的是一个 `reactive` 对象。对 reactive 对象做普通解构，拿到的只是当前值的快照（普通变量），后续 state 变化不会再影响它，所以视图不更新。这和 ref / reactive 的解构丢失响应式是同一个原理。

**解决方案**：

1. state 用 `storeToRefs` 解构，拿到的是 ref（保持响应式）；action / getter 里的方法本身是函数，可以直接解构。
2. 或者干脆不解构，模板里写 `store.count`。

下面用一段纯 JS 模拟 Pinia 的核心思路——一个「单例 store」：

```js run
// 用普通 JS 模拟 Pinia 的 store：state + getter + action
const counterStore = (() => {
  let _count = 0            // state
  return {
    get count() {           // getter（类似 computed，读取派生值）
      return _count
    },
    increment() {           // action（直接改状态，没有 mutation）
      _count += 1
    },
  }
})()

counterStore.increment()
counterStore.increment()
console.log(counterStore.count)
```

```text output
2
```

Pinia 的三种形态：**Options Store**（像 Vuex）、**Setup Store**（像组合式函数）、以及两者混用。

```js
// stores/counter.js —— Options Store，结构最接近 Vuex
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0, items: [] }),
  getters: {
    double: (state) => state.count * 2,
  },
  actions: {
    increment() {
      this.count++                       // 直接改 state，无需 commit
    },
    async fetchItems() {
      this.items = await fetch('/api/items').then((r) => r.json())
    },
  },
})
```

```js
// stores/counter.js —— Setup Store，和 <script setup> 写法一致
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)   // 组合式 API 也能用

  function increment() {
    count.value++
  }

  // 必须 return 所有想暴露给外部的东西
  return { count, double, increment }
})
```

在组件里正确使用：

```vue
<script setup>
import { storeToRefs } from 'pinia'
import { useCounterStore } from '@/stores/counter'

const store = useCounterStore()

// state / getter 用 storeToRefs 解构，保持响应式
const { count, double } = storeToRefs(store)
// action 是函数，可以直接解构
const { increment } = store

increment()
</script>

<template>
  <p>count：{{ count }}，double：{{ double }}</p>
</template>
```

常见坑清单：

- **解构丢响应式**：state/getter 必须走 `storeToRefs`。
- **state 必须是函数**：写成 `state: { count: 0 }` 会让多个实例共享同一份对象，SSR 时还会串数据；必须返回新对象。
- **Setup Store 忘记 return**：不 return 的变量在组件里拿到 `undefined`。
- **action 用箭头函数**：箭头函数没有自身 `this`，`this.count++` 会拿到外层的 `this`（undefined），应为普通方法。
- **直接替换整个 state**：`store.$reset()` 或 `store.$patch({...})` 才是官方推荐方式，直接 `store = xxx` 反而丢掉 store 本体。
- **持久化**：Pinia 自身不做持久化，需装 `pinia-plugin-persistedstate` 或在插件里手动订阅。

## 追问与易错点

- **为什么 state 要写成函数？** 每个组件 `useXxxStore()` 时都基于同一份 store 单例，但 SSR 每次请求需要独立的状态快照；写成函数才能按需生成，避免服务端请求间互相污染。
- **为什么 Pinia 去掉了 mutation？** mutation 只是「显式声明如何改状态」的约束，没有实际收益，反而带来一层样板代码。Pinia 用 devtools 直接追踪 action，就足够定位状态变更。
- **`storeToRefs` 和直接 `toRefs` 有什么区别？** `storeToRefs` 只对 state/getter 生成 ref，会自动跳过 action，避免把方法也包成 ref；对普通 reactive 用 `toRefs` 即可。
- **action 里能调用另一个 store 吗？** 能。在 action 里 `const other = useOtherStore()` 再调用即可，Pinia 允许 store 之间互相依赖（不要写出循环依赖）。
- **`$patch` 什么时候用？** 批量改多个字段时用 `store.$patch({ a: 1, b: 2 })`，只触发一次更新，比连续赋值更高效。
- **Typescript 下 getter 能直接用 `this` 吗？** Options Store 的 getter 用箭头函数时不能依赖 `this`（`this` 会错乱），要么用 `state` 参数，要么用普通方法配合 `this` 并显式标注返回类型。

## 相关题目

- [vue3-002-composition-api](/q/vue3/vue3-002-composition-api)
- [vue3-003-ref-vs-reactive](/q/vue3/vue3-003-ref-vs-reactive)
