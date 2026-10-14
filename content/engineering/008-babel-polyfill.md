---
title: Babel 是做什么的？core-js/polyfill 怎么配置？
subtopic: 构建工具与 HMR
difficulty: middle
frequency: medium
tags: [Babel, polyfill, core-js, browserslist, 语法降级]
order: 80
---

## 参考答案

**Babel 是 JavaScript 编译器**，把高版本 ES 代码转成目标环境能运行的低版本代码。它做的事情分两类，必须区分清楚：

1. **语法转换**：箭头函数、class、解构、可选链等「新语法」→ 旧语法，由 `@babel/preset-env` 完成；
2. **API 补齐（polyfill）**：`Promise`、`Array.prototype.includes` 等「新 API」在低版本引擎里根本不存在，语法转换无能为力，需要 core-js 提供实现。

**标准配置**：`@babel/preset-env` + `useBuiltIns: 'usage'` + `corejs: 3`，配合 browserslist 声明目标浏览器，按需注入 polyfill：

```json
{
  "presets": [
    ["@babel/preset-env", {
      "useBuiltIns": "usage",
      "corejs": 3
    }]
  ]
}
```

```json
{
  "browserslist": ["> 1%", "last 2 versions", "not dead"]
}
```

## 原理讲解

**useBuiltIns 的三个取值**：

| 取值 | 行为 | 问题 |
| --- | --- | --- |
| `false`（默认） | 不注入任何 polyfill | 需手动 `import 'core-js'`，全量引入体积大 |
| `'entry'` | 入口处的 `import 'core-js'` 被替换为按目标环境裁剪后的集合 | 仍偏大，且污染全局 |
| `'usage'` | 按**源码实际用到的 API** 逐文件按需注入 | 最推荐，体积最小 |

`'usage'` 的工作方式：Babel 扫描每个文件，发现你写了 `arr.includes(...)` 且目标环境不支持，就在该文件顶部自动加一条 `import 'core-js/modules/es.array.includes.js'`。你不用手写任何 polyfill 引入。

**browserslist 的角色**：它是「目标环境清单」的统一标准，preset-env、Autoprefixer、esbuild、Vite 都读它。Babel 根据清单查 compat 数据，决定哪些语法要转、哪些 API 要补。目标环境越新，产物越小。

**应用和库的策略不同**：

- **应用**：`preset-env + usage` 即可，允许污染全局（反正全局都是你的）；
- **库**：不能污染使用者的全局环境，应使用 `@babel/plugin-transform-runtime`——它把 polyfill 改成本地模块导入（core-js-pure），并把 helper 函数（如 `_classCallCheck`）抽成共享模块，避免每个文件重复内联：

```json
{
  "plugins": [
    ["@babel/plugin-transform-runtime", { "corejs": 3 }]
  ]
}
```

**transpile-only 趋势**：esbuild、SWC、Vite 默认只做语法降级、不注入 polyfill（快得多），新项目里 Babel 的角色在收缩；但「要不要 polyfill」的判断逻辑不变——目标环境缺的 API 总得有人补。

## 追问与易错点

- **语法转换和 polyfill 能互相替代吗？** 不能。`Promise` 在老引擎里没有被定义，把箭头函数转成 `function` 也变不出 `Promise`，两者缺一不可（当然现代浏览器清单下可能两者都不需要）。
- **配置了 usage 为什么体积还是暴涨？** 常见原因：browserslist 目标太老（如包含 `ie 11`）；某个依赖触发了一串 polyfill；或 core-js 大版本没对齐（`corejs: 2` 与 3 差异很大）。
- **node_modules 里的依赖需要过 Babel 吗？** 默认跳过以提速；但某些库发布的是未降级源码，需要调整 `exclude` 把它们也转一遍，否则老浏览器直接语法报错。
- **async/await 是怎么被处理的？** 语法层面 preset-env 会转成 generator + regenerator-runtime（目标环境够新则保留原生）；`transform-runtime` 可自动带上 regenerator。

## 相关题目

- [engineering-001-vite-hmr](/q/engineering/engineering-001-vite-hmr)
- [engineering-003-tree-shaking](/q/engineering/engineering-003-tree-shaking)
