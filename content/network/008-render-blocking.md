---
title: 浏览器渲染流程是什么？CSS/JS 分别会阻塞什么？
subtopic: 浏览器渲染流程
difficulty: middle
frequency: high
tags: [浏览器渲染, 关键渲染路径, 回流重绘, async, defer]
order: 80
related: [network-007-url-to-page]
---

## 参考答案

**渲染主流程**：HTML 解析成 DOM 树，CSS 解析成 CSSOM，两者合成渲染树（Render Tree），然后 Layout（计算几何）→ Paint（绘制像素）→ Composite（合成上屏）。

**阻塞规则（高频考点）**：

| 资源 | 阻塞 HTML 解析 | 阻塞渲染 | 阻塞后续 JS 执行 |
| --- | --- | --- | --- |
| CSS | 否 | **是**（渲染树需要 CSSOM） | **是**（JS 可能读取样式） |
| 普通 JS | **是**（JS 可能改写 DOM） | 间接是 | — |
| `async` JS | 否（下载完立即执行，执行时阻塞） | 不确定 | — |
| `defer` JS | 否（解析完后、`DOMContentLoaded` 前按序执行） | 否 | — |

口诀：**CSS 阻塞渲染不阻塞解析，JS 阻塞解析；CSS 还会卡住它后面的 JS**。

## 原理讲解

**为什么 JS 会阻塞 HTML 解析？** 因为 JS 里可能写着 `document.write` 或删除节点的代码，浏览器无法预知脚本会怎么改 DOM，只能先停下手里的解析，下载并执行完脚本再继续。所以 `<script>` 要放 body 底部，或加 `async`/`defer`。

**为什么 CSS 会阻塞渲染？** 渲染树由 DOM + CSSOM 合成，CSSOM 没建好就渲染，用户会先看到无样式内容（FOUC）。所以浏览器宁可等 CSS 加载完。但 CSS 不阻塞 HTML 继续向下解析——DOM 照常构建。

**为什么 CSS 会阻塞 JS？** 如果脚本里有 `getComputedStyle(el)`，就必须等样式算好才能返回正确结果。于是浏览器规定：脚本执行前，它前面的 CSS 必须加载解析完毕。这会产生一个隐蔽的坑——**一个慢 CSS 会间接拖住后面所有脚本的执行**。

**`async` vs `defer`**：

```html
<script src="a.js" async></script>   <!-- 下载完立刻执行，顺序不保证，适合独立脚本（统计/广告） -->
<script src="b.js" defer></script>   <!-- 等 HTML 解析完按顺序执行，适合有依赖关系的业务脚本 -->
```

**回流与重绘**：渲染树建成后，JS 修改几何属性（宽高、位置）触发**回流（Reflow/Layout）**，改颜色等外观只触发**重绘（Repaint）**，`transform`/`opacity` 交给合成层处理**两者都不触发**，性能最好。回流的代价远大于重绘，因为会引发下游全部重算。

对照下面这段经典写法，阻塞链路一目了然：

```html
<head>
  <link rel="stylesheet" href="slow.css"> <!-- 不阻塞解析，但阻塞渲染 -->
  <script src="a.js"></script>            <!-- 必须等 slow.css 就绪后才执行，且执行时阻塞解析 -->
</head>
<body>
  <!-- 此处内容要等 a.js 执行完才会被解析渲染 -->
</body>
```

## 追问与易错点

- **CSS 放头部、JS 放底部是为什么？** CSS 放头部是为了尽早构建 CSSOM、避免 FOUC 和二次渲染；JS 放底部是为了不阻塞首屏 DOM 解析。
- **`async` 和 `defer` 的执行顺序有保证吗？** `defer` 严格按文档顺序执行；`async` 谁先下载完谁先执行，顺序不保证。
- **动态插入的 script 默认是什么行为？** 等价于 `async`（`script.async` 默认为 true），可通过设为 false 强制按插入顺序执行。
- **回流一定比重绘贵吗？** 是。回流会重新计算布局并连带重绘，且会向上向下传播；重绘只更新像素。读取 `offsetTop` 等布局属性还会强制同步回流，要避免「读写交替」。
- **如何减少关键渲染路径的阻塞？** CSS 做媒体查询拆分/关键 CSS 内联；JS 用 `defer`、按需分包；提前 `preload` 关键资源、`preconnect` 关键域名。

## 相关题目

- [network-007-url-to-page](/q/network/network-007-url-to-page)
- [network-001-http-cache](/q/network/network-001-http-cache)
