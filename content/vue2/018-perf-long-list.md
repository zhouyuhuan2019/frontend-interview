---
title: 长列表渲染卡顿怎么优化？v-if/v-show、key、虚拟滚动怎么选？
subtopic: 性能优化
difficulty: senior
frequency: high
tags: [Vue2, 性能优化, 长列表, 虚拟滚动, key]
order: 180
related: [design-001-virtual-scroll, vue2-006-v-for-key, vue2-003-v-if-v-show]
---

一个渲染上万条数据的列表，滚动时明显掉帧，在筛选框里输入也会卡一下：

```vue
<template>
  <div class="list" @scroll="onScroll">
    <div v-for="(item, i) in list" :key="i">
      <Row :data="item" />
    </div>
  </div>
</template>
```

同事给了几条建议：用 `v-show` 代替 `v-if`、加稳定的 `key`、上虚拟滚动、分片渲染……请说明：卡顿的根本瓶颈在哪？这几种手段分别解决哪一段问题？应该怎么选和组合？

## 参考答案

先定位瓶颈，再对症下药。

- **卡顿的根本原因是「DOM 节点太多」+「每次更新都要重排/重绘」**，通常不是 JS 计算慢。上万条 `v-for` 会生成几万个真实节点，浏览器布局与合成直接吃不消。
- **`key`**：让 diff 能精确复用节点，避免就地复用导致的错位和多余 patch；这是正确性 + 性能的地基，别用易变的 index 当 key。
- **`v-if` / `v-show`**：`v-if` 减少**初始**渲染的节点（不渲染整段），`v-show` 避免**频繁切换**时的销毁重建。长列表首屏用 `v-if` 按需渲染更省。
- **虚拟滚动**：只渲染「可视区 + 缓冲」的少量节点，把 DOM 数量从 N 降到常数级，是长列表**最有效的根本手段**。
- **Vue2 特有加分项**：`data` 里的大列表会被递归劫持成响应式，如果数据是只读的，用 `Object.freeze` 冻结可跳过响应式转换，省掉大量开销。

一句话选型：**节点多到卡 → 虚拟滚动；同屏切换 → v-if/v-show 按场景选；保证稳定唯一 key；只读大数据 → Object.freeze。**

## 原理讲解

**现象 → 原因**：滚动掉帧来自两件事——① 节点数太大，浏览器每帧要处理的布局、绘制量爆炸；② 数据一变，`v-for` 要走一遍 `patch`，若 `key` 不稳定会大量复用/重建。

**1. `key` 的作用**

```vue
<!-- 反例：用 index 当 key，插入/删除时后续项全部错位复用 -->
<div v-for="(item, i) in list" :key="i">{{ item.name }}</div>
<!-- 正例：用数据自身的唯一 id -->
<div v-for="item in list" :key="item.id">{{ item.name }}</div>
```

`key` 让 Vue 知道「哪个旧节点对应哪个新节点」，从而最小化 DOM 操作。用 `index` 会让「删除第 1 条」看起来像「所有项都变了」，触发无谓的 patch。详见 v-for/key 那题。

**2. `v-if` / `v-show` 的取舍**

| | v-if | v-show |
|---|---|---|
| 初始开销 | 低（假分支不渲染） | 高（总要渲染一次） |
| 切换开销 | 高（销毁/重建） | 低（只改 `display`） |
| 组件生命周期 | 切换触发创建/销毁 | 不触发 |

长列表场景要的是「**少渲染**」：首屏、Tab 未激活的分页，用 `v-if` 直接不渲染；而频繁开关的小浮层才用 `v-show`。注意别把 `v-show` 用在「本来可以不渲染」的大列表上，那样反而更慢。

**3. 虚拟滚动的核心计算**

思路：用一个和真实列表等高的「占位容器」撑出滚动条，只把可视区那一段的节点渲染出来，并用 `transform` / `padding` 做偏移，让滚动位置对齐。

```js run
// 给定滚动位置，算出应渲染的区间与偏移量
const total = 1000          // 总条数
const itemHeight = 40       // 每项固定高度
const viewportHeight = 400  // 可视区高度
const scrollTop = 2000      // 当前滚动距离

const startIndex = Math.floor(scrollTop / itemHeight)
const endIndex = Math.min(total, Math.ceil((scrollTop + viewportHeight) / itemHeight))

console.log('startIndex:', startIndex)
console.log('endIndex:', endIndex)
console.log('offsetY:', startIndex * itemHeight)
```

```text output
startIndex: 50
endIndex: 60
offsetY: 2000
```

也就是「第 50~60 项」这 11 个节点需要真实渲染，其余用占位高度顶住——无论总数是 1 万还是 10 万，DOM 数量都是常数级。

**4. 分片渲染（没有虚拟滚动时的过渡方案）**

一次性插入上万节点会长时间阻塞主线程，可以按 `requestAnimationFrame` 分批插入，让页面先响应、再逐步补齐：

```js
renderChunk(index = 0) {
  const size = 50
  const end = Math.min(this.list.length, index + size)
  this.visible = this.list.slice(0, end)
  if (end < this.list.length) {
    requestAnimationFrame(() => this.renderChunk(end))
  }
}
```

**5. Vue2 专属：冻结只读大列表**

```js
export default {
  data() {
    // Vue2 会递归遍历所有属性并定义 getter/setter；
    // 数据只读时用 Object.freeze 跳过劫持，初始化大幅提速
    return { table: Object.freeze(bigList) }
  },
}
```

`Object.freeze` 之后数据不再响应式，**只适合不会被修改的列表**；一旦需要增删改，就不能冻结。

**选型决策表**

| 场景 | 推荐做法 |
|---|---|
| 万级以上、行高固定/可测 | 虚拟滚动（配固定 key） |
| 千级、一次性展示 | 分片渲染 + `v-if` 按需 |
| 多个 Tab 切换 | 未激活 Tab 用 `v-if`，频繁切换用 `v-show` |
| 只读大数据 | `Object.freeze` 跳过响应式 |
| 请求分段加载 | 分页 / `IntersectionObserver` 触底加载 |

## 追问与易错点

- **`key` 用 index 会怎样？** 插入/删除/排序时节点复用错位，可能出现输入框内容「串行」等诡异 bug，且 patch 量变大。
- **`v-if` 和 `v-for` 能写一起吗？** 不推荐。Vue2 中 `v-for` 优先级更高，会先循环再逐项判断，既费性能又语义混乱；应先过滤数据，或用外层 `<template v-if>` 包裹。
- **`v-show` 一定能加速吗？** 不能。它「始终渲染」，用在「本来该隐藏的大列表」上会平白多出全部节点，比 `v-if` 更慢。
- **虚拟滚动有什么代价？** 行高不定时需动态测高，复杂度陡增；原生 `Ctrl+F`、无障碍、SEO 会受影响；所以不是所有长列表都无脑上。
- **`Object.freeze` 用了为什么不更新了？** 冻结后属性没有 getter/setter，Vue 侦测不到变化；需要交互的列表不要冻结。
- **虚拟滚动还能再优化吗？** 可以：减少列表项组件的 `watch`/计算属性、`v-once` 静态内容、`<Row>` 用函数式组件或 `props` 浅比较，避免每项都做重渲染。

## 相关题目

- [design-001-virtual-scroll](/q/design/design-001-virtual-scroll)
- [vue2-006-v-for-key](/q/vue2/vue2-006-v-for-key)
- [vue2-003-v-if-v-show](/q/vue2/vue2-003-v-if-v-show)
