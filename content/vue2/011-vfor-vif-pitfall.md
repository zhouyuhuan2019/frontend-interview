---
title: v-for 和 v-if 写在同一元素上有什么问题？怎么改才对？
subtopic: 模板与指令
difficulty: middle
frequency: high
tags: [Vue2, v-for, v-if, 优先级, 性能优化]
order: 110
related: [vue2-006-v-for-key, vue2-003-v-if-v-show]
---

「过滤出符合条件的列表」是一种很常见的需求，于是很多人顺手写成这样：

```html
<ul>
  <li v-for="user in users" v-if="user.active" :key="user.id">
    {{ user.name }}
  </li>
</ul>
```

看起来没什么问题，但在 Vue2 里它会「先遍历整个列表、再逐项判断」，还可能埋下别的坑。这段代码到底该怎么改？

## 参考答案

结论：**Vue2 中 `v-for` 的优先级高于 `v-if`，两者写在同一元素上时会「先循环、后判断」——列表里每一项都先生成 vnode 再被 `v-if` 丢掉，白白浪费性能。**

推荐改法（按优先级）：

1. **用计算属性先过滤**，模板只渲染结果集（最常用）；
2. **把 `v-if` 移到外层 `template` 或容器**，条件是「整个列表是否渲染」时用；
3. 数据量很大时，考虑虚拟滚动或分页，而不是纠结这一处。

```js
// 方案 1：数据层过滤，模板只负责渲染
computed: {
  activeUsers() {
    return this.users.filter((user) => user.active)
  },
}
```

```html
<!-- 方案 2：条件放在外层，列表不再逐项判断 -->
<template v-if="shouldShowList">
  <li v-for="user in users" :key="user.id">{{ user.name }}</li>
</template>
```

## 原理讲解

**现象**：`v-for` 和 `v-if` 写在一起时性能差、语义混乱。**原因**：两个指令的编译优先级不同。

| Vue 版本 | 优先级更高 | 结果 |
|---|---|---|
| Vue2 | `v-for` | 先循环生成每一项，再对每一项判断 `v-if` |
| Vue3 | `v-if` | 先判断条件，条件不成立时整个 `v-for` 不执行（且 `v-if` 拿不到 `v-for` 的变量） |

Vue2 编译后大致等价于：

```js
// v-for="user in users" v-if="user.active"
// 伪代码：先循环，每一项内部再判断
users.map((user) => (user.active ? renderUser(user) : createEmptyVNode()))
```

也就是说：`users` 有 1000 条、其中只有 10 条 `active`，也会先把 1000 条都走一遍 vnode 创建与条件判断，才丢弃 990 条空节点。

用纯 JS 对照两种写法「处理的数据量」：

```js run
const users = Array.from({ length: 1000 }, (_, i) => ({ id: i, active: i % 100 === 0 }))

// 写法一：v-for 内联 v-if —— 每一条都会先创建 vnode 再判断
let created = 0
let kept = 0
users.forEach((user) => {
  created++
  if (user.active) kept++
})
console.log('同元素写法：创建 vnode', created, '个，保留', kept, '个')

// 写法二：computed 先过滤 —— 只对结果集创建 vnode
const activeUsers = users.filter((user) => user.active)
console.log('过滤后写法：创建 vnode', activeUsers.length, '个')
```

```text output
同元素写法：创建 vnode 1000 个，保留 10 个
过滤后写法：创建 vnode 10 个
```

（这是近似说明：Vue2 里被过滤掉的项会生成一个空注释节点，仍会走一遍循环与判断。）

## 追问与易错点

- **Vue3 里反过来会怎样？** Vue3 的 `v-if` 优先级高于 `v-for`，此时 `v-for` 的变量在 `v-if` 里不可用，会直接报错；两个版本都不推荐把两者写在同一元素上。
- **`v-if` 里能用 `v-for` 的 item 吗？** Vue2 可以（因为先循环后判断），Vue3 不可以（先判断后循环）。这正是从 Vue2 升级到 Vue3 时容易踩的坑。
- **把 `v-if` 移到外层一定对吗？** 看语义：如果条件是「整个列表是否显示」，移到外层（`<template v-if>` 包住列表）是对的；如果条件依赖每一项的数据，就应该用计算属性过滤。
- **过滤用 computed 还是 methods？** 过滤结果由数据派生，用 computed 有缓存；methods 每次重新渲染都会重算，不推荐。
- **key 应该写在哪？** 写在真正参与循环的元素上；若用 `<template v-for>`，key 要写在 `<template>` 标签上。
- **列表很大时还该注意什么？** 虚拟滚动只渲染可视区域，效果远大于纠结 `v-for` / `v-if` 的顺序。

## 相关题目

- [vue2-006-v-for-key](/q/vue2/vue2-006-v-for-key)
- [vue2-003-v-if-v-show](/q/vue2/vue2-003-v-if-v-show)
