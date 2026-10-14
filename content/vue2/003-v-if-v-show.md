---
title: v-if 与 v-show 的区别是什么？
subtopic: 模板与指令
difficulty: junior
frequency: high
tags: [Vue2, v-if, v-show, 指令, 条件渲染]
order: 30
---

## 参考答案

一句话结论：**`v-if` 是「真实的条件渲染」——条件为假时元素根本不创建；`v-show` 是「始终渲染」——只切换 CSS 的 `display`。**

| 对比项 | v-if | v-show |
|---|---|---|
| 渲染方式 | 条件为假时不渲染 DOM | 始终渲染，切换 `display: none` |
| 初始开销 | 低（条件为假时几乎零成本） | 高（无论如何都要渲染一次） |
| 切换开销 | 高（销毁 / 重建元素和组件） | 低（只改样式） |
| 组件生命周期 | 切换会触发创建 / 销毁 | 不触发 |
| 支持 `<template>` | 支持 | **不支持**（template 无实体 DOM） |
| 适用场景 | 条件很少变化 | 频繁切换显示状态 |

选型口诀：**频繁切换用 `v-show`，条件稳定用 `v-if`。**

## 原理讲解

编译后的差异可以直观看到。模板：

```html
<div v-if="visible">A</div>
<div v-show="visible">B</div>
```

大致等价于：

```js
// v-if：条件为假时返回注释节点，整个分支不渲染
visible ? createElement('div', 'A') : createCommentVNode()

// v-show：照常创建元素，只是挂一个指令标记
withDirectives(createElement('div', 'B'), [[vShow, visible]])
```

`v-show` 对应一个指令，patch 阶段只执行 `el.style.display = value ? '' : 'none'`，DOM 结构完全不动，所以切换几乎零成本；而 `v-if` 走完整的「销毁旧子树 → 创建新子树 → 插入」流程，涉及组件实例的创建与销毁。

另外两点容易忽略：

1. `v-if` 是**惰性**的：初始条件为假时，内部组件完全不初始化，连响应式依赖都不会收集。
2. `v-if` 可配合 `v-else-if` / `v-else` 组成条件链，`v-show` 没有类似语法。

## 追问与易错点

- **`v-if` 和 `v-for` 能写在同一个元素上吗？** 不推荐。Vue2 中 `v-for` 优先级更高，会先循环再逐项判断 `v-if`，性能差且语义混乱；应先用计算属性过滤，或把 `v-if` 移到外层 `template`。
- **为什么 `v-show` 不支持 `<template>`？** `v-show` 需要操作真实元素的 `style.display`，而 `<template>` 编译后没有对应 DOM 节点。
- **频繁切换的弹窗该用哪个？** 一般 `v-show`；但如果弹窗内容很重且大部分时间不打开，用 `v-if` 避免无谓的初始渲染。
- **`v-if` 切换时内部组件状态会保留吗？** 不会，重建是全新实例；需要保留状态可配合 `<keep-alive>`。

## 相关题目

- [vue2-006-v-for-key](/q/vue2/vue2-006-v-for-key)
