---
title: z-index 为什么不生效？层叠上下文是什么？
subtopic: 定位与层叠上下文
difficulty: middle
frequency: medium
tags: [z-index, 层叠上下文, 层叠顺序, 定位, transform]
order: 40
---

## 参考答案

`z-index` 不生效，最常见两个原因：

1. **元素没有定位**：`z-index` 只对 `position` 非 `static` 的元素（以及 flex/grid 子项）生效；
2. **陷入了错误的层叠上下文**：父元素形成了层叠上下文且层级较低，子元素 `z-index` 再大也翻不出这个"天花板"。

**层叠上下文（stacking context）** 是一块独立的"三维堆叠区域"：同一个上下文内按规则比 `z-index`；不同上下文之间**先比父级上下文的层级**，内部 `z-index` 不跨界比较。

常见触发层叠上下文的属性：

- 根元素 `html`
- `position: relative / absolute` 且 `z-index` 不为 `auto`
- `position: fixed / sticky`
- `opacity < 1`
- `transform / filter / perspective` 不为 `none`
- `z-index` 不为 `auto` 的 flex/grid 子项
- `will-change`、`isolation: isolate` 等

## 原理讲解

同一层叠上下文内，从底到顶的层叠顺序：

1. 层叠上下文的背景与边框
2. `z-index < 0` 的定位元素
3. 普通流中的块级元素
4. 浮动元素
5. 普通流中的行内元素
6. `z-index: 0 / auto` 的定位元素
7. `z-index > 0` 的定位元素（数值越大越靠上）

典型翻车案例：

```html
<div class="a" style="position: relative; z-index: 1;">
  <div class="inner" style="position: absolute; z-index: 9999;">弹窗</div>
</div>
<div class="b" style="position: relative; z-index: 2;">遮罩</div>
```

`.inner` 的 `z-index: 9999` 看似很大，但它的"天花板"是 `.a` 的层级 1，仍被层级 2 的 `.b` 盖住。这就是"子元素 z-index 再高也没用"的根本原因——比较发生在 `.a` 和 `.b` 之间，与 `.inner` 无关。

## 追问与易错点

- **怎么排查 z-index 不生效？** 先确认元素是否定位；再沿祖先链找谁创建了层叠上下文（重点查 `transform`、`opacity`、`filter`、`will-change`）；确认比较的双方是否在同一个层叠上下文里。
- **`z-index: 9999` 是最佳实践吗？** 不是。无脑加大数值会陷入"军备竞赛"，应建立分层规范（如基础内容 0、吸顶 10、弹窗 100、全局 toast 1000）。
- **为什么 `transform` 能创建层叠上下文？** 变换需要独立合成渲染，规范规定 `transform` 非 `none` 的元素强制创建层叠上下文，顺带还会让内部 `position: fixed` 相对它定位（另一个常见坑）。
- **弹窗组件怎么避免层叠问题？** 用 Portal（传送门）挂到 `body` 下，脱离业务组件的层叠上下文，只与全局少数层级竞争。

## 相关题目

- [html-css-005-reflow-repaint](/q/html-css/html-css-005-reflow-repaint)
