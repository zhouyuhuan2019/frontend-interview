---
title: 回流与重绘有什么区别？如何减少回流？
subtopic: 回流与重绘
difficulty: middle
frequency: high
tags: [回流, 重绘, 渲染性能, 合成层, GPU 加速]
order: 50
---

## 参考答案

- **回流（reflow / 重排）**：元素的几何属性（宽高、位置、显隐）变化，浏览器要**重新计算布局**，再走绘制、合成，成本最高；
- **重绘（repaint）**：只改了外观（颜色、背景、阴影）而**不影响布局**，跳过布局直接重画，成本较低；
- **回流必然引起重绘，重绘不一定回流**。

减少回流的核心手段：

| 手段 | 说明 |
|---|---|
| 批量修改样式 | 用 `class` 切换代替逐条改 `style`；离线处理（`display: none` / `DocumentFragment`）后再挂回 |
| 读写分离 | 避免"写—读—写—读"交替，先集中读布局值，再集中写 |
| 缓存布局值 | `offsetWidth` 等读取会强制刷新布局，存变量复用 |
| 用 transform / opacity 做动画 | 不触发回流重绘，只走合成层（GPU） |
| 脱离文档流 | 对 `absolute / fixed` 元素做动画，回流范围限于局部 |
| 避免 table 布局 | 单元格相互影响，一处改动可能整表回流 |

## 原理讲解

浏览器渲染流水线：**DOM/CSSOM → 渲染树 → 布局（回流）→ 绘制（重绘）→ 合成**。改动落在越靠后的阶段，代价越小：改几何属性从布局阶段重来；改颜色从绘制阶段开始；改 `transform / opacity` 只走合成。

读取布局信息（`offsetWidth`、`getBoundingClientRect()`、`getComputedStyle()` 等）时，浏览器必须立刻执行一次回流保证返回值准确。下面用计数模拟"读写交错"与"读写分离"的差异：

```js run
let layoutCount = 0
function readLayout() { layoutCount++; return 100 } // 模拟昂贵的布局计算
function writeLayout(w) { /* 写操作使布局失效，下次读需重算 */ }

const boxes = [1, 2, 3, 4, 5]

// 写法一：读写交错，每次循环都触发布局
layoutCount = 0
boxes.forEach(b => {
  const w = readLayout()
  writeLayout(w + b)
})
console.log('读写交错触发布局次数:', layoutCount)

// 写法二：先集中读，再集中写，只算一次
layoutCount = 0
const widths = boxes.map(() => readLayout())
boxes.forEach((b, i) => writeLayout(widths[i] + b))
console.log('读写分离触发布局次数:', layoutCount)
```

真实 DOM 场景的等价做法：把循环里 `el.offsetWidth` 的读取从"读—写"交替中抽出来，先批量读取再批量修改。

动画优先用 `transform` 和 `opacity`，它们由合成器在 GPU 上直接处理，不经过主线程的布局和绘制：

```css
/* 好：只触发合成 */
.box { transition: transform .3s; }
.box:hover { transform: translateX(100px); }

/* 差：每帧都触发回流 */
.box { transition: left .3s; position: relative; left: 0; }
.box:hover { left: 100px; }
```

## 追问与易错点

- **哪些属性只触发重绘不触发回流？** `color`、`background`、`box-shadow`、`visibility`、`outline` 等纯外观属性。
- **`display: none` 和 `visibility: hidden` 分别触发什么？** `display: none` 从渲染树移除，触发回流 + 重绘；`visibility: hidden` 保留占位，只触发重绘。
- **`will-change: transform` 有什么用？** 提示浏览器提前把元素提升为独立合成层，动画更流畅；但合成层占内存，不要滥用。
- **怎么验证页面的回流开销？** Chrome DevTools 的 Performance 面板看紫色 Layout 事件；Rendering 面板开启 Paint Flashing 可观察重绘区域。

## 相关题目

- [html-css-004-z-index-stacking](/q/html-css/html-css-004-z-index-stacking)
