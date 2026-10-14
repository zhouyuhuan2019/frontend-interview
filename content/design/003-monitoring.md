---
title: 前端监控体系怎么搭建（错误/性能/埋点）？
subtopic: 监控体系
difficulty: senior
frequency: medium
tags: [前端监控, 错误采集, 性能指标, 数据埋点, sourcemap]
order: 30
---

面试官：如果让你从 0 到 1 搭建一套前端监控体系，你会监控什么、怎么采集、怎么上报？

## 参考答案

先给结论：一套完整的前端监控 = **错误监控 + 性能监控 + 行为埋点**三条线，加上**采集 → 上报 → 存储 → 告警/看板**一条链路。

回答框架：监控什么 → 怎么采集 → 怎么上报 → 怎么消费数据。

1. **错误监控**：JS 运行时错误、Promise 未捕获、资源加载失败、接口异常（HTTP 状态码/业务码）、白屏检测。
2. **性能监控**：FP/FCP/LCP/CLS/INP 等 Web Vitals、接口耗时、页面加载瀑布、长任务。
3. **行为埋点**：PV/UV、点击/曝光事件、用户行为轨迹（breadcrumb），用于复现错误现场和转化分析。

上报与消费：

| 关注点 | 做法 |
| --- | --- |
| 上报方式 | `sendBeacon` 优先（页面关闭也能发出），降级 `fetch`/图片 ping |
| 上报策略 | 采样（错误全量、PV 按比例）、批量合并、失败本地暂存重发 |
| 数据还原 | 上传 sourcemap 还原压缩后的堆栈 |
| 消费 | 错误聚合（按指纹去重）、性能分位数看板（P75/P95）、阈值告警 |

## 原理讲解

**错误采集**的关键钩子：

```js
// 同步运行时错误
window.addEventListener('error', (e) => {
  // 区分资源错误：e.target 有 src/href 属性时是资源加载失败
  if (e.target !== window) report('resource', { url: e.target.src || e.target.href })
  else report('jserror', { message: e.message, stack: e.error?.stack })
}, true) // 资源错误不冒泡，必须捕获阶段监听

// Promise 未处理拒绝
window.addEventListener('unhandledrejection', (e) => {
  report('unhandledrejection', { reason: String(e.reason) })
})
```

框架层错误走框架自己的钩子（如 Vue 的 `app.config.errorHandler`），与全局监听互补。

**性能指标**用浏览器原生 API，不要自己打点算：

- `PerformanceObserver` 监听 `paint`（FP/FCP）、`largest-contentful-paint`（LCP）、`layout-shift`（CLS）、`event`（INP/交互延迟）；
- `performance.getEntriesByType('resource')` 拿资源与接口耗时。

**白屏检测**：页面挂载后若干秒，用 `document.elementFromPoint` 在屏幕中心/九宫格取点，若全是 `html`/`body` 且无内容节点，判定白屏。

**堆栈还原**：压缩混淆后的代码堆栈是 `app.3f2a1.js:1:12345`，需要在构建时把 sourcemap 上传到监控平台（不发到生产 CDN），平台用 `source-map` 库反查源码位置。

**用户行为轨迹（breadcrumb）**：按时间记录路由变化、点击、接口请求、console 输出，环形缓冲区保留最近 N 条，错误发生时随错误一起上报——这是定位「用户到底做了什么才报错」的关键。

## 追问与易错点

- **为什么用 `sendBeacon`？** 页面 `beforeunload` 时发 `fetch`/`xhr` 大概率被浏览器取消；`sendBeacon` 由浏览器接管排队发送，且是小数据 POST，适合上报。
- **采样会不会漏掉关键错误？** 错误类一般全量，高流量埋点采样；对 VIP 用户/特定版本可动态调采样率（后端下发配置）。
- **`addEventListener('error')` 为什么要 `true`？** 资源加载失败事件不冒泡，只能在捕获阶段拿到，且要通过 `e.target` 区分资源错误和 JS 错误。
- **跨域脚本报错只有 `Script error.` 怎么办？** 脚本标签加 `crossorigin`，且 CDN 返回 `Access-Control-Allow-Origin`，否则拿不到具体信息。
- **监控 SDK 本身出问题/影响性能怎么办？** SDK 异步加载、try-catch 包裹所有采集逻辑、控制上报体积与频率，做「监控的监控」。

## 相关题目

- [design-005-micro-frontend](/q/design/design-005-micro-frontend)
