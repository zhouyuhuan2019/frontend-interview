---
title: 十万条数据的长列表怎么渲染？说说虚拟滚动方案
subtopic: 大数据量渲染
difficulty: senior
frequency: high
tags: [虚拟滚动, 长列表, 性能优化, 无限加载, 分片渲染]
order: 10
---

## 参考答案

一次渲染十万条 DOM 节点必然卡顿（内存与布局开销都不可接受）。核心思路是**只渲染可视区 + 少量缓冲区的节点**，其余用占位高度撑起滚动条。

方案对比：

| 方案 | 思路 | 适用场景 |
| --- | --- | --- |
| 虚拟滚动 | 只渲染视口内节点，容器高度 = 总数 × 单项高度 | 定高列表、表格 |
| 分片渲染 | 分批渲染（`requestAnimationFrame` / `setTimeout`） | 数据量中等、必须全部可见 |
| 分页 / 无限加载 | 按需请求下一批 | 数据在服务端、后端可分页 |
| 内容可见性 | `content-visibility: auto` | 浏览器原生懒渲染，改造成本最低 |

虚拟滚动三要素：

1. **固定/估算高度**：单项高度 `itemHeight`，容器可视高度 `viewportHeight`；
2. **计算索引区间**：`start = floor(scrollTop / itemHeight)`，`end = start + ceil(viewportHeight / itemHeight)`；
3. **偏移与占位**：用 `translateY(start * itemHeight)` 把渲染区域移到正确位置，外层容器高度设为 `total × itemHeight`。

## 原理讲解

```js
// 核心计算（定高场景）
const startIndex = Math.floor(scrollTop / itemHeight)
const visibleCount = Math.ceil(viewportHeight / itemHeight)
// 上下各多渲染几个，减少快速滚动时的白屏
const start = Math.max(0, startIndex - buffer)
const end = Math.min(total, startIndex + visibleCount + buffer)
```

**不定高场景**的常见做法：先给每项一个估算高度渲染，再用 `ResizeObserver` 测出真实高度并回写「位置偏移表」（prefix sum），滚动时用二分查找定位区间。这也是各类虚拟列表库的主要复杂度所在。

滚动事件不要直接触发渲染，要配合以下优化：
- 用 `requestAnimationFrame` 对齐帧；
- 用 `transform` 做位移（不触发布局，只触发合成）；
- 避免在滚动回调里读取 `offsetHeight` 等属性，防止强制同步布局（layout thrashing）。

## 追问与易错点

- **为什么用 `transform` 而不是 `top`？** 修改 `top` 会触发布局（reflow），`transform` 只影响合成层，性能差异在滚动场景非常明显。
- **快速滚动出现白屏怎么办？** 增加缓冲区（overscan）、用 `scrollTop` 预估方向做增量预渲染，或把滚动容器换成「纯 CSS 定位 + 少量节点复用」。
- **表格场景有什么额外难点？** 列宽需要与表头对齐，横向虚拟化更复杂，通常直接用成熟的虚拟表格方案。
- **`content-visibility: auto` 能替代虚拟滚动吗？** 能大幅降低渲染成本，但 DOM 节点仍然存在，内存占用不会下降；数据量极大时仍需虚拟化。

## 相关题目

- [handwriting-001-debounce-throttle](/q/handwriting/handwriting-001-debounce-throttle)
