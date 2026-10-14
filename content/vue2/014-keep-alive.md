---
title: keep-alive 怎么用？为什么页面被缓存后数据不刷新了？
subtopic: 缓存与 keep-alive
difficulty: middle
frequency: high
tags: [Vue2, keep-alive, 路由缓存, activated, 生命周期]
order: 140
related: [vue2-002-lifecycle, vue2-007-nexttick, vue2-018-perf-long-list]
---

列表页跳转到详情页，再返回列表页时，希望保留滚动位置和筛选条件。于是用 `<keep-alive>` 包住 `<router-view>`：

```vue
<!-- App.vue -->
<template>
  <keep-alive :include="['ListPage']">
    <router-view />
  </keep-alive>
</template>
```

结果页面确实不重新加载了，但**列表数据也一直停留在旧状态**：切换 Tab、从别的页面回来，接口都不会重新请求，新增的数据看不到。

请说明：`<keep-alive>` 到底缓存了什么？为什么缓存后数据不刷新？需要「进入页面时重新拉取数据」该怎么写才对？

## 参考答案

结论：`<keep-alive>` 缓存的是**组件实例**（连同它的 `data`、DOM、滚动位置），被缓存的组件**不会被卸载，也就不会重新执行 `created` / `mounted`，因此里面的数据请求自然不会再次触发**。

记住三条：

1. 缓存组件首次显示走 `created → mounted → activated`；**之后每次重新显示只触发 `activated`**，`created` / `mounted` 不再执行。
2. 想在「每次回来」时刷新数据，把请求写进 **`activated`**；同时把首次请求从 `mounted` 里挪走（或加条件），否则首次会请求两次。
3. 想让某个页面**彻底不被缓存**（或缓存后强制重建），用 `include` / `exclude` 动态控制，或给它换一个 `:key` 让实例重建。

## 原理讲解

**现象**：数据不刷新，`mounted` 里的请求不再执行。

**原因**：`keep-alive` 是个抽象组件，它不渲染真实 DOM，而是在内部用一个 `cache` 对象把匹配到的子组件 VNode / 实例存起来（默认以组件的 `key` 为索引）。命中缓存时**直接复用旧实例**而不再创建，所以 `created` / `mounted` 不会被再次调用——数据请求多半写在 `mounted` 里，于是就「不刷新」了。

它内部的缓存策略是 **LRU（最近最少使用）**：配合 `:max` 超过上限时，淘汰最久未被激活的那个实例。这个逻辑可以用普通 JS 直观体会：

```js run
// keep-alive 内部用 LRU 缓存组件实例（配 :max 后按最近最少使用淘汰）
class LRUCache {
  constructor(limit = 2) { this.limit = limit; this.map = new Map() }
  get(key) {
    if (!this.map.has(key)) return undefined
    const value = this.map.get(key)
    this.map.delete(key)      // 先删后插，把它挪到队尾 = 最近使用
    this.map.set(key, value)
    return value
  }
  set(key, value) {
    if (this.map.has(key)) this.map.delete(key)
    this.map.set(key, value)
    if (this.map.size > this.limit) {
      const oldest = this.map.keys().next().value   // 队首 = 最久未使用
      this.map.delete(oldest)
    }
  }
  keys() { return [...this.map.keys()] }
}

const cache = new LRUCache(2)
cache.set('list', 'list 组件实例')
cache.set('detail', 'detail 组件实例')
console.log('访问 list 前:', cache.keys().join(','))
cache.get('list')                          // 访问 list，使其成为「最近使用」
cache.set('profile', 'profile 组件实例')     // 超出上限，淘汰最久未使用的
console.log('插入 profile 后:', cache.keys().join(','))
console.log('detail 是否被淘汰:', cache.get('detail') === undefined)
```

```text output
访问 list 前: list,detail
插入 profile 后: list,profile
detail 是否被淘汰: true
```

**解决方案一：把刷新逻辑放进 `activated`**

```js
export default {
  name: 'ListPage',
  data() {
    return { list: [], loadedOnce: false }
  },
  mounted() {
    // 首次进入时请求一次
    this.fetchList()
    this.loadedOnce = true
  },
  activated() {
    // 从缓存恢复时，mounted 不再执行，这里才是「每次回来」的时机
    if (this.loadedOnce) this.fetchList()
  },
  methods: {
    async fetchList() {
      this.list = await api.getList(this.query)
    },
  },
}
```

> 注意 `keep-alive` 还提供 `deactivated` 用于离开时清理（如定时器、事件监听）。**只有被 keep-alive 的组件才会有 `activated` / `deactivated`。**

**解决方案二：按需决定谁被缓存**

```vue
<!-- 只缓存列表页与详情页 -->
<keep-alive :include="['ListPage', 'DetailPage']" :max="5">
  <router-view />
</keep-alive>
```

`include` / `exclude` 匹配的是**组件的 `name` 选项**（不是路由 name）。所以要确保每个页面组件都显式写了 `name`。

**解决方案三：用 `:key` 强制重建**

```vue
<!-- 需要彻底刷新时，key 变化会让旧实例被销毁、新实例重新走完整生命周期 -->
<router-view :key="$route.fullPath" />
```

**选型对照**

| 需求 | 做法 |
|---|---|
| 保留滚动 / 输入状态，但每次回来刷新数据 | keep-alive + `activated` 里请求 |
| 保留状态且**不刷新** | 只 keep-alive，不在 `activated` 里请求 |
| 完全不缓存某页 | 用 `exclude`，或该路由不套在 keep-alive 内 |
| 同一路由不同参数要独立缓存 | `:key="$route.fullPath"` |
| 缓存过多怕内存涨 | 加 `:max` 限制数量 |

## 追问与易错点

- **`activated` 和 `mounted` 谁先执行？** 首次显示是 `mounted` 在前、`activated` 在后；之后每次回来只有 `activated`。若两处都写请求会重复请求。
- **`include` 为什么有时不生效？** 它按组件 `name` 匹配，`name` 缺失或在 `include` 写成了路由 `name` 都会导致缓存没命中。
- **keep-alive 能缓存 `v-if` 切换的组件吗？** 可以，缓存的是组件实例本身；但 `include` 写错名字或组件没有 `name` 时不会缓存。
- **缓存会带来内存泄漏吗？** 实例与其闭包一直被持有；配 `:max` 或及时用 `exclude` 清理，长期不用时把实例销毁。
- **同一个组件被多个路由复用，缓存的是同一个实例吗？** 默认按组件 `key` 索引，通常是同一个实例；需要各自独立就给它不同的 `:key`。

## 相关题目

- [vue2-002-lifecycle](/q/vue2/vue2-002-lifecycle)
- [vue2-007-nexttick](/q/vue2/vue2-007-nexttick)
- [vue2-018-perf-long-list](/q/vue2/vue2-018-perf-long-list)
