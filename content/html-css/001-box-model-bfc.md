---
title: 说说盒模型与 BFC
subtopic: 盒模型与 BFC
difficulty: junior
frequency: high
tags: [盒模型, BFC, margin 塌陷, 外边距重叠, box-sizing]
order: 10
---

## 参考答案

**盒模型**由内容（content）、内边距（padding）、边框（border）、外边距（margin）四层组成：

- 标准盒模型（`box-sizing: content-box`，默认）：`width` 只包含 content；
- 怪异盒模型（`box-sizing: border-box`）：`width` 包含 content + padding + border。

工程实践中通常全局设置 `border-box`，让宽高更符合直觉：

```css
*, *::before, *::after { box-sizing: border-box; }
```

**BFC（块级格式化上下文）** 是一块独立的渲染区域，内部布局不影响外部。触发方式常见有：

- `overflow` 不为 `visible`（如 `hidden` / `auto`）
- `display: flow-root`（最语义化的触发方式）
- `display: flex` / `grid` / `inline-block`
- `position: absolute` / `fixed`
- `float` 不为 `none`

BFC 的典型用途：
1. **清除浮动**，让父容器包住浮动子元素；
2. **阻止外边距重叠**（margin collapse）；
3. **避免浮动元素环绕**，实现两栏自适应布局。

## 原理讲解

外边距重叠（margin collapse）发生在**同一 BFC 内的相邻垂直外边距**之间，取较大值而不是相加：

```html
<div style="margin-bottom: 20px">A</div>
<div style="margin-top: 30px">B</div>
<!-- 两者间距是 30px，而不是 50px -->
```

要消除重叠，可以让其中一个元素进入新的 BFC：

```html
<div style="display: flow-root">
  <div style="margin: 20px 0">A</div>
</div>
<div style="margin-top: 30px">B</div>
```

## 追问与易错点

- **`overflow: hidden` 触发 BFC 有什么副作用？** 会裁剪超出容器范围的内容（如 tooltip、下拉菜单），所以能用 `flow-root` 就不要用 `overflow: hidden`。
- **`width: 100%` 与 `width: auto` 的区别？** `100%` 会精确等于父内容宽（可能因 padding 溢出），`auto` 会自适应剩余空间，在 flex 子项中行为差异尤为明显。
- **`height: 100%` 为什么不生效？** 父元素没有确定高度时百分比高度无法计算，需要父链上都有确定高度，或改用 `100vh` / `dvh`。

## 相关题目

- [design-001-virtual-scroll](/q/design/design-001-virtual-scroll)
