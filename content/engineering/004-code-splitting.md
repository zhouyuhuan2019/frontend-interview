---
title: 分包策略有哪些？如何做首屏加载优化？
subtopic: 分包与 Tree-shaking
difficulty: middle
frequency: high
tags: [代码分割, 懒加载, 首屏优化, 缓存, 预加载]
order: 40
---

## 参考答案

**分包（Code Splitting）常用策略**：

1. **入口分包**：多页应用每个 entry 一个 chunk；
2. **路由级懒加载**：用动态 `import()` 按路由拆分，最常用；
3. **vendor 拆分**：把 `node_modules` 第三方库单独打成 chunk，利用其低频变化特性做长缓存；
4. **公共模块抽取**：多个 chunk 共用的模块抽成 shared chunk（Webpack `splitChunks` 默认行为）；
5. **组件/功能级懒加载**：弹窗、图表、富文本编辑器等重组件按需加载。

**首屏加载优化**的核心思路是「首屏只加载必要的，能提前的提前，能推迟的推迟」：

- 路由懒加载 + 只保留首屏所需模块；
- 关键资源 `<link rel="preload">`，次要资源 `<link rel="prefetch">`；
- gzip / brotli 压缩、HTTP/2、CDN；
- 静态资源带 `contenthash` 做长缓存，HTML 不缓存；
- 骨架屏 / 内联关键 CSS，极端场景上 SSR/SSG。

## 原理讲解

**动态 `import()` 是分包的基础**。静态 `import` 会被打包进同一个 chunk，而 `import('./xxx')` 让打包器把 `xxx` 单独切成一个 chunk，运行时按需请求：

```js
// 路由懒加载示例（Vue Router / React Router 同理）
const Editor = () => import('./Editor.vue')
```

**splitChunks 与长缓存**。Webpack 默认把 `node_modules` 里的共享依赖抽成 vendor chunk，配合 `[contenthash]`：

```js
output: {
  filename: '[name].[contenthash:8].js'
}
```

内容不变 → hash 不变 → 浏览器直接用缓存。把「基本不变的第三方库」和「经常变的业务代码」分开，发版时用户只需重新下载业务 chunk。

**preload 与 prefetch 的区别**：

| 指令 | 优先级 | 用途 |
| --- | --- | --- |
| `preload` | 高 | 当前页面马上要用，如首屏字体、关键 chunk |
| `prefetch` | 低（空闲时） | 下个页面可能用，如下一跳路由的 chunk |

**首屏优化看指标**：关注 FCP、LCP、TTI，而不是单纯的「加载完成时间」。分包解决的是 JS 体积，但首屏还受 CSS 阻塞、字体、图片影响，需要综合治理：内联关键 CSS、图片懒加载、骨架屏占位。

**Tree-shaking 与分包是互补关系**：Tree-shaking 减单 chunk 体积，分包控制「什么时候加载哪个 chunk」，两者结合才能把首屏 JS 压到最小。

## 追问与易错点

- **chunk 是不是越多越好？** 不是。过多小 chunk 会放大请求开销（即使有 HTTP/2），且每个 chunk 都有模块运行时的固定成本，应避免生成大量碎片 chunk。
- **懒加载的路由切换会白屏吗？** 会有短暂加载间隙，常用 prefetch 在空闲时提前下载下一页 chunk，或加 loading 态兜底。
- **vendor 里的库一年不更新，但每次发版 hash 都变？** 检查是否把运行时模块映射表（runtime/manifest）打进了 vendor，应配置 `runtimeChunk: 'single'` 单独抽出。
- **首屏 JS 已经很小但还是慢？** 排查 SSR/缓存/CDN、接口瀑布、主线程长任务；JS 体积只是首屏性能的一部分。

## 相关题目

- [engineering-003-tree-shaking](/q/engineering/engineering-003-tree-shaking)
- [engineering-001-vite-hmr](/q/engineering/engineering-001-vite-hmr)
