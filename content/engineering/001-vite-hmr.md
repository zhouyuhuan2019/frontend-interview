---
title: Vite 为什么比 Webpack 快？HMR 是怎么工作的？
subtopic: 构建工具与 HMR
difficulty: middle
frequency: high
tags: [Vite, Webpack, HMR, ESM, esbuild, 依赖预构建]
order: 10
---

## 参考答案

Webpack 的开发流程是「先打包全部模块 → 再启动服务」，项目越大启动越慢；Vite 换了两条思路：

1. **开发态不打包**：直接利用浏览器原生 ESM，按需编译当前请求到的模块（`<script type="module">`），启动时间只与「首屏用到的模块数」相关；
2. **依赖预构建**：启动前用 esbuild（Go 编写，比 JS 快 1～2 个数量级）把 `node_modules` 里的 CJS / 多文件依赖打包成单个 ESM 文件，既减少请求数，也解决 CJS 转换问题。

结果：冷启动从「与项目规模成正比」变成「几乎恒定」，HMR 也从「重新打包相关模块」变成「只失效单个模块」。

## 原理讲解

**HMR 的工作链路**：

1. Vite 启动一个 WebSocket 服务，客户端在入口注入 `import.meta.hot` 运行时代码；
2. 文件被修改 → Vite 通过 chokidar 监听，只对该模块（及受影响的边界模块）做 transform，得到新的模块图节点；
3. 服务端通过 WebSocket 推送 `update` 消息，带上需要更新的模块路径与时间戳；
4. 浏览器端运行时代理 `import`，把旧 URL 换成带时间戳的新 URL，重新请求并执行；
5. 若模块**自身实现了 `import.meta.hot.accept`**，则原地替换（不刷新页面）；若找不到接受者，则冒泡到上层，最终**整页刷新**。

`import.meta.hot` 的基本用法：

```js
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    // 用新模块替换旧模块的行为
  })
  import.meta.hot.dispose(() => {
    // 清理旧模块产生的副作用，如定时器、事件监听
  })
}
```

这也是为什么 Vue 的 SFC 修改模板能**保留组件状态**：`@vitejs/plugin-vue` 会为组件注入 `accept` 回调，只替换组件定义。

## 追问与易错点

- **生产构建也是 esbuild / 不打包吗？** 不是。开发用 esbuild 做 transform，生产构建早期用 Rollup（当前新版已迁移到 Rolldown），因为需要 Tree-shaking、代码分割与成熟插件生态。
- **Vite 为什么还需要「依赖预构建」？** 直接加载 `node_modules` 里成千上百个文件会产生大量请求瀑布；预构建把它们合并成少量 chunk，并把 CJS 转成 ESM。
- **什么时候需要强制重新预构建？** 依赖更新或 `optimizeDeps` 配置变化时；可删除 `node_modules/.vite` 后重启。
- **和 Turbopack / Rspack 的区别？** 思路类似，都是「Rust/Go 重写 + 增量编译」，Rspack 兼容 Webpack 配置，迁移成本更低。

## 相关题目

- [engineering-002-module-system](/q/engineering/engineering-002-module-system)
