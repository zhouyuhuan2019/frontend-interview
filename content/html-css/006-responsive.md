---
title: 移动端适配方案怎么选（rem/vw/媒体查询）？
subtopic: 响应式与移动端适配
difficulty: middle
frequency: medium
tags: [移动端适配, rem, vw, 媒体查询, 1px 问题]
order: 60
---

## 参考答案

三种方案并不互斥，按场景选型：

| 方案 | 原理 | 优点 | 缺点 | 适用 |
|---|---|---|---|---|
| rem | 以根字号为基准，JS 按屏宽动态设 `html` 的 `font-size` | 兼容好、可控 | 依赖 JS，有首屏闪烁风险 | 老牌 H5 页面 |
| vw | `1vw = 视口宽度 1%`，纯 CSS 线性缩放 | 无需 JS | 大屏可能无限放大，需配上限 | 现代 H5 首选 |
| 媒体查询 | 按断点切换整段样式 | 控制精细 | 布局"跳变"不连续，维护成本高 | PC/移动多端同页 |

实践结论：**H5 活动页用 vw（配合 postcss-px-to-viewport 自动转换）；中后台/复杂站点可用 rem；一套代码同时适配 PC 和移动端用媒体查询 + 响应式断点。** 三者都建立在 `meta viewport` 之上。

## 原理讲解

`meta viewport` 是一切适配的前提，把布局视口设为设备宽度并禁止缩放：

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

**rem 方案**（flexible 思路）：以 750px 设计稿为例，令 `1rem = 屏宽 / 10 = 75px`，写样式时 `px / 75` 转 rem：

```js
document.documentElement.style.fontSize =
  document.documentElement.clientWidth / 10 + 'px'
```

```css
.box { width: 2rem; } /* 对应设计稿上的 150px */
```

**vw 方案**：同样 750 设计稿，`100vw = 750px`，所以 `1px ≈ 0.1333vw`：

```css
.box { width: 20vw; } /* 150 / 750 * 100 = 20vw，对应设计稿 150px */
```

工程上通常用 `postcss-px-to-viewport` 在构建时自动把 `px` 转成 `vw`，开发时按设计稿写 px 即可。防止大屏无限放大，可以给 `html` 设 `max-width`，或用 `clamp()` 限制字号区间。

**媒体查询**按断点整体切换布局：

```css
.container { width: 1200px; margin: 0 auto; }

@media (max-width: 768px) {
  .container { width: 100%; padding: 0 16px; }
}
```

**1px 问题**：retina 屏（dpr ≥ 2）下 CSS 的 `1px` 会渲染成 2~3 个物理像素，细边框偏粗。常用解法：伪元素 + `transform: scaleY(0.5)` 画线；部分场景可直接写 `0.5px`（iOS 支持较好）。

## 追问与易错点

- **rem 和 vw 怎么取舍？** 缩放效果一致；rem 需 JS 算根字号（有首屏闪烁），vw 纯 CSS 但无上限。常见折中：`html { font-size: clamp(...) }` 或 rem 配 JS 限制最大根字号。
- **dpr（设备像素比）是什么？** 物理像素 / CSS 像素，iPhone 常见为 2 或 3。图片要按 dpr 提供 2x/3x 图，否则发虚。
- **刘海屏安全区怎么适配？** `viewport-fit=cover` 配合 `env(safe-area-inset-bottom)`，给底部留出 home 指示条高度。
- **为什么不直接用百分比布局？** 百分比参照父元素尺寸且宽高基准不同（宽相对父宽、高相对父高），难以等比还原设计稿，只适合局部流式布局。

## 相关题目

- [html-css-001-box-model-bfc](/q/html-css/html-css-001-box-model-bfc)
