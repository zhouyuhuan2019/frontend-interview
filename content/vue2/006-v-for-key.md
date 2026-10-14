---
title: v-for 为什么要加 key？用 index 做 key 有什么问题？
subtopic: 虚拟 DOM 与 diff
difficulty: middle
frequency: high
tags: [Vue2, v-for, key, diff, 虚拟DOM]
order: 60
---

## 参考答案

**key 的作用**：给每个 vnode 一个唯一标识，让 diff 算法准确判断「哪些节点是同一个」，从而**最大化复用已有 DOM、正确定位移动 / 删除**，避免错误的就地复用。

**用 index 做 key 的问题**：

- 列表**顺序稳定、纯静态展示**时，用 index 没有明显问题；
- 一旦列表会**增删、排序、头部插入**，index 做 key 会导致：
  1. **状态错乱**：元素的内部状态（输入框内容、组件内部 data）被错误复用到别的数据行上；
  2. **多余更新**：key 对不上时 Vue 只能逐项更新 DOM，性能反而更差。

结论：**能用数据自身的唯一 id 就用 id；index 只适用于「不会变化的静态列表」。**

## 原理讲解

Vue2 的 diff 在同层比较时，先用 key 建立旧节点的映射表 `key -> 旧vnode`；遍历新节点时按 key 查表：

- 找到了 → 复用该 DOM（打补丁 + 必要时移动位置）；
- 找不到 → 创建新 DOM；
- 映射表里剩下的 → 删除。

没有 key（或 key 重复）时，Vue 退化为「就地复用」策略：按位置一一对比，能 patch 就 patch。看一个出问题的例子：

```vue
<template>
  <ul>
    <li v-for="(item, index) in list" :key="index">
      <input :value="item.text" />
    </li>
  </ul>
</template>
```

假设 `list = [A, B, C]`，在头部插入新项 X 变成 `[X, A, B, C]`：

- **key 用 index**：新旧列表第 0 项 key 都是 0，Vue 认为「是同一个节点」，于是复用旧的 `<input>`，只把绑定值从 A 改成 X——但用户在输入框里**手动输入的内容**（不受 `:value` 同步的内部状态）会留在错误的行上，视觉上 A 行输入的内容跑到了 X 行。
- **key 用 `item.id`**：A、B、C 的 key 不变，Vue 知道它们是「移动」而不是「变化」，只做 DOM 移动，状态完全正确；X 是新 key，单独创建。

这也是官方文档强调「不要用会变化的值（如 index）作为 key」的原因。

## 追问与易错点

- **key 用随机数（如 `Math.random()`）可以吗？** 不行。每次渲染 key 都变，等于告诉 diff「全是新节点」，强制销毁重建所有 DOM，比不加 key 还糟。
- **没有 key 时控制台为什么有警告？** Vue2 对 `v-for` 会提示缺少 key；没有 key 就走就地复用，存在状态错乱风险，也无法利用 key 映射优化移动。
- **key 可以用重复的值吗？** 不可以。key 在兄弟节点间必须唯一，重复 key 会让映射表错乱，渲染结果不可预期。
- **为什么列表只在尾部追加时 index 也能凑合？** 此时新旧列表前 N 项 index 一致，就地复用的结果恰好正确；但这只是巧合，一旦需求变化就埋雷。
- **`<transition-group>` 对 key 有什么要求？** 必须提供稳定且唯一的 key，否则过渡动画无法正确追踪元素的移动与增删。

## 相关题目

- [vue2-003-v-if-v-show](/q/vue2/vue2-003-v-if-v-show)
