---
title: 什么时候需要微前端？qiankun 的原理是什么？
subtopic: 架构与目录设计
difficulty: senior
frequency: medium
tags: [微前端, qiankun, 沙箱隔离, 应用拆分, single-spa]
order: 50
---

面试官：你们项目为什么上微前端？如果让你选型，你怎么评估要不要用、用哪个方案？

## 参考答案

**先泼冷水：微前端是组织与工程问题的解法，不是银弹。** 适用的核心信号是：

1. 多个团队在同一产品上并行开发，技术栈/发布节奏不一致；
2. 巨石应用构建慢、改一处全量回归、无人敢动的老模块需要渐进迁移；
3. 各子业务需要**独立开发、独立部署**，但对外是同一个站点。

不适用的情况：小团队小项目、子模块间高度耦合、对首屏性能极度敏感——上了微前端只会徒增复杂度。

主流方案对比：

| 方案 | 隔离能力 | 特点 |
| --- | --- | --- |
| qiankun | JS 沙箱 + CSS 隔离 | 基于 single-spa，开箱即用，国内生态成熟 |
| Module Federation | 无（需自行处理） | 构建时共享模块，粒度细到组件/依赖共享 |
| iframe | 天然完全隔离 | 通信难、路由/弹窗/加载体验差 |
| Web Components | 样式隔离 | 浏览器原生，生态与工程化支持弱 |

## 原理讲解

qiankun 的两个基石是**应用调度**和**隔离沙箱**。

**应用调度**（来自 single-spa）：主应用维护一份子应用注册表，每条含 `name`、`entry`（入口 HTML/JS）、`container`（挂载节点）、`activeRule`（激活的路由规则）。监听路由变化，命中 `activeRule` 时经历 `bootstrap → mount → unmount` 生命周期。子应用入口通过 `import-html-entry` 拉取 HTML、解析出 JS/CSS 再执行，而不是直接 script 标签加载。

**JS 沙箱**：核心是防止子应用污染全局变量。
- **快照沙箱**（不支持 Proxy 时降级）：mount 前遍历 `window` 拍快照，unmount 时对比差异恢复现场，同时把修改记录下来下次 mount 重新应用；
- **Proxy 沙箱**（主流）：给每个子应用一个 `Proxy` 包装的 fakeWindow，读写全局变量都先落在沙箱的属性表里，真正的 `window` 不被修改，天然支持多实例共存。

```js
// Proxy 沙箱的极简示意
const fakeWindow = new Proxy(window, {
  get(target, key) {
    return key in sandboxStore ? sandboxStore[key] : target[key]
  },
  set(target, key, value) {
    sandboxStore[key] = value // 写操作被拦截在沙箱内
    return true
  },
})
// 子应用代码用 with(fakeWindow) 包裹执行，全局访问被劫持
```

**CSS 隔离**：
- **严格模式**（experimentalStyleIsolation）：给子应用样式加属性选择器前缀（类似 scoped），限制作用范围；
- **Shadow DOM 模式**：挂载到 shadow root，隔离最彻底但会破坏依赖 body 的弹窗类组件。

**应用间通信**：qiankun 提供 `initGlobalState` 的全局状态订阅机制（发布-订阅）；简单场景也可以用自定义事件或共享的父应用方法通过 props 下发。

## 追问与易错点

- **微前端最大的坑是什么？** 公共依赖重复加载（React/AntD 各打一份）、样式互相污染、子应用间隐式耦合（全局变量、路由抢占）。要用 externals/Module Federation 共享依赖、约定全局命名规范。
- **主应用与子应用技术栈必须一致吗？** 不需要，这正是微前端的卖点；但同构技术栈能更好共享依赖与组件。
- **子应用为什么本地开发调试麻烦？** 跨域、入口格式（需暴露生命周期函数、禁用匿名 umd 名）、要与主应用联调。通常配 `devServer.headers` 允许跨域 + 本地 mock 主应用环境。
- **qiankun 和 Module Federation 怎么选？** 要「应用级拆分 + 运行时加载 + 强隔离」选 qiankun；要「模块级共享 + 构建时优化 + 粒度高」选 MF。两者也可以混用。
- **隔离和性能如何权衡？** 沙箱 Proxy 劫持、样式前缀都有运行时开销，多子应用同时激活更明显；大型场景可考虑只激活单个子应用（`singular` 模式）。

## 相关题目

- [design-003-monitoring](/q/design/design-003-monitoring)
