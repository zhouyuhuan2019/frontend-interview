---
title: 水平垂直居中有哪些实现方案？
subtopic: Flex
difficulty: junior
frequency: high
tags: [水平垂直居中, Flex 居中, Grid 居中, transform, 绝对定位]
order: 30
---

## 参考答案

**首选 Flex 或 Grid**，一两行属性搞定；子元素宽高未知时用绝对定位 + `transform`。常见方案对比：

| 方案 | 核心代码 | 适用场景 |
|---|---|---|
| Flex | `display:flex` + 两个 `center` | 通用首选 |
| Grid | `display:grid; place-items:center` | 代码最少 |
| 绝对定位 + transform | `top/left: 50%` + `translate(-50%,-50%)` | 子元素宽高未知 |
| 绝对定位 + margin auto | `inset: 0` + `margin: auto` | 子元素定宽定高 |
| 绝对定位 + 负 margin | `margin: -宽/2 0 0 -高/2` | 老项目，需定宽高 |

## 原理讲解

Flex 方案（最常用）：

```css
.parent {
  display: flex;
  justify-content: center; /* 主轴（默认水平）居中 */
  align-items: center;     /* 交叉轴（默认垂直）居中 */
}
```

Grid 方案（代码最少）：

```css
.parent {
  display: grid;
  place-items: center; /* align-items + justify-items 的简写 */
}
```

绝对定位 + transform（子元素宽高未知时用）：

```css
.parent { position: relative; }
.child {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

关键在于两个 50% 的参照系不同：`top: 50%` 参照**父元素**高度，让子元素顶点落到中心；`translate(-50%, -50%)` 参照**子元素自身**宽高，再往回拉一半，实现精确居中。

绝对定位 + margin auto（子元素必须定宽定高）：

```css
.child {
  position: absolute;
  inset: 0;     /* top/right/bottom/left 全为 0 */
  margin: auto; /* auto margin 平均分配四个方向的剩余空间 */
}
```

## 追问与易错点

- **为什么 `translate(-50%, -50%)` 的百分比是相对自己的？** CSS 规定 `transform: translate` 的百分比参照元素自身的 border-box，而 `top/left` 的百分比参照包含块，两个 50% 基准不同才能互相配合。
- **只需要水平居中怎么办？** 定宽块级元素用 `margin: 0 auto`；行内内容用父元素 `text-align: center`；Flex 用 `justify-content: center`。
- **`inset: 0 + margin: auto` 为什么必须定宽高？** 需要留出"剩余空间"给 auto margin 分配；不定宽高时元素会被拉伸铺满父容器，反而失去居中效果。
- **要求"尽可能多的方案"还能答什么？** `display: table-cell + vertical-align: middle`、`line-height` 等于父高（仅限单行文本）、伪元素撑高等，了解即可，工程中已被 Flex/Grid 取代。

## 相关题目

- [html-css-002-flex-layout](/q/html-css/html-css-002-flex-layout)
