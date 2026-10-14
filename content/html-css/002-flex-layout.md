---
title: Flex 布局常用属性有哪些？flex:1 是什么的缩写？
subtopic: Flex
difficulty: junior
frequency: high
tags: [Flex 布局, flex:1, 主轴交叉轴, flex-grow, flex-basis]
order: 20
---

## 参考答案

Flex 属性分为**容器属性**和**子项属性**两类。

容器属性（写在父元素上）：

| 属性 | 作用 | 常用值 |
|---|---|---|
| `flex-direction` | 主轴方向 | `row` / `column` |
| `flex-wrap` | 是否换行 | `nowrap` / `wrap` |
| `justify-content` | 主轴对齐 | `center` / `space-between` / `space-evenly` |
| `align-items` | 交叉轴对齐 | `center` / `baseline` / `stretch` |
| `align-content` | 多根轴线的对齐 | `space-between` 等 |
| `gap` | 子项间距 | `10px 20px` |

子项属性（写在子元素上）：

| 属性 | 作用 |
|---|---|
| `flex-grow` | 剩余空间的放大比例，默认 `0` |
| `flex-shrink` | 空间不足时的缩小比例，默认 `1` |
| `flex-basis` | 分配前的基准尺寸，默认 `auto` |
| `align-self` | 单独覆盖交叉轴对齐 |
| `order` | 排列顺序，默认 `0` |

**`flex: 1` 是 `flex: 1 1 0%` 的缩写**，即 `flex-grow: 1; flex-shrink: 1; flex-basis: 0%`，表示子项平分容器空间，是多列等分布局的标配写法。

## 原理讲解

Flex 布局有两条轴：`flex-direction` 决定**主轴**，垂直于它的是**交叉轴**。`justify-*` 系列控制主轴，`align-*` 系列控制交叉轴，先分清轴再选属性，就不会记混。

`flex-basis` 决定放大/缩小的计算基准，是理解 `flex: 1` 的关键：

- `flex: 1`（即 `flex-basis: 0%`）：忽略内容自身宽度，把容器**全部空间**按比例分配，多列严格等宽；
- `flex: auto`（即 `flex-basis: auto`）：先按内容宽度占位，只分配**剩余空间**，内容多的列更宽。

```css
.item {
  flex: 1;
  /* 等价于 flex-grow: 1; flex-shrink: 1; flex-basis: 0%; */
}
```

三个子项都设 `flex: 1` 时严格三等分；都设 `flex: auto` 时按内容比例分配。要实现"中间自适应、两侧固定"的经典布局，也是中间项 `flex: 1`、两侧项 `flex-shrink: 0` 加定宽。

## 追问与易错点

- **`flex: 1` 与 `flex: auto` 有什么区别？** 前者 `flex-basis: 0%`，忽略内容严格等分；后者 `flex-basis: auto`，先容纳内容再分剩余空间。要严格等宽必须用 `flex: 1`。
- **`flex-shrink` 什么时候生效？** 子项尺寸之和超过容器时才生效；`flex-shrink: 0` 可禁止压缩，常用于防止图标、按钮被挤变形。
- **Flex 子项里 `text-overflow: ellipsis` 为什么不生效？** 子项默认 `min-width: auto`，不会缩得比内容更窄，需要显式设置 `min-width: 0`（或 `overflow: hidden`）。
- **`margin: auto` 在 Flex 里有什么用？** 自动吸收对应方向的剩余空间，`margin-left: auto` 可以把某个子项推到最右侧，是常见的对齐技巧。

## 相关题目

- [html-css-003-centering](/q/html-css/html-css-003-centering)
