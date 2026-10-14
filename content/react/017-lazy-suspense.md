---
title: React 组件和路由怎么懒加载？Suspense 与 fallback 怎么配合？
subtopic: 路由与懒加载
difficulty: middle
frequency: high
tags: [React, 懒加载, React.lazy, Suspense, 路由, 代码分割]
order: 170
related: [react-008-fiber, react-016-error-boundary, react-010-useeffect-race-cleanup]
---

首页首屏要等 1.8MB 的包全部下载、解析完才渲染，白屏时间很长。你发现所有页面都被一次性打进了首包：

```jsx
// 所有页面在首屏就被打包进来
import Home from './pages/Home'
import Dashboard from './pages/Dashboard' // 里面引了图表库，几百 KB
import Settings from './pages/Settings'
```

请问：组件和路由页面该怎么做成按需加载？`React.lazy` 与 `Suspense` 的 `fallback` 应该怎么配合使用？

## 参考答案

结论：用 `React.lazy` 把动态 `import()` 包成组件，再用 `<Suspense fallback={...}>` 提供加载占位。

```jsx
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard')) // 模块必须有默认导出
const Settings = lazy(() => import('./pages/Settings'))

function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  )
}
```

三个要点：

1. `React.lazy` 接收一个返回 Promise 的函数，Promise 解析出的模块**必须有 `default` 导出**；
2. 懒加载的组件必须被**某个 `<Suspense>` 包住**，否则渲染时会直接抛错；
3. `fallback` 是加载期间显示的占位内容，加载完成后自动切换到真实内容。

## 原理讲解

**现象**：首页首屏要等全部页面代码下载并解析完才渲染，首屏时间很长。

**原因**：静态 `import` 会被打包器（webpack / Vite）**静态分析并打进同一个小包**，代码在首屏要发出、解析、执行。页面越多（尤其图表、富文本这类重依赖），首包越大。

**解决方案**：把「非首屏必需」的模块改成**动态 `import()`**，打包器会在构建期把它切成独立 chunk，运行时才按需下载——这就是代码分割。`React.lazy` 只是把这套能力包装成了「惰性组件」。

先看动态加载「只执行一次」的纯逻辑模型：

```js run
// 懒加载的本质：把「组件工厂」延迟到首次用到时才执行，且只执行一次
const cache = new Map()
let builtTimes = 0

function lazyLoad(key, factory) {
  if (!cache.has(key)) {
    cache.set(key, factory())
    builtTimes += 1
  }
  return cache.get(key)
}

const factory = () => Promise.resolve({ default: 'PageModule' })
lazyLoad('page', factory)
lazyLoad('page', factory)
console.log('工厂执行次数 =', builtTimes)
```

```text output
工厂执行次数 = 1
```

`React.lazy` 内部也是类似的缓存：同一个 `lazy` 组件只发起一次 `import()`。它规定「必须默认导出」，就是为了能确定取到的是哪个组件：

```jsx
// ✅ 默认导出 —— lazy 直接取到组件
export default function Dashboard() { /* ... */ }

// ✅ 具名导出 —— 用 .then 转换出 default
const Dashboard = lazy(() =>
  import('./pages/Dashboard').then((m) => ({ default: m.Dashboard }))
)
```

配合路由时的几种常见用法：

| 需求 | 做法 |
| --- | --- |
| 每个页面独立 fallback | 在各自的 `element` 里包一层 `<Suspense>` |
| 统一加载占位 | 在 `<Routes>` 外层包一层 `<Suspense>` |
| 切换路由不闪白 | React 18 用 `useTransition` / `startTransition` |
| 提前加载 | 空闲时调 `import('./pages/Dashboard')` 预热（预加载） |

`Suspense` 边界要按「用户感知」来放：整页级边界适合路由切换，局部级边界适合大数据面板，避免一处慢导致满屏骨架屏。

React 18 里还可以用 `startTransition` 让已显示的旧页面「挂着」直到新页面就绪，减少 fallback 闪烁：

```jsx
import { useTransition } from 'react'

function App() {
  const [isPending, startTransition] = useTransition()
  // 切换路由时把导航更新标为 transition，保留旧界面
}
```

## 追问与易错点

- **`React.lazy` 为什么要求默认导出？** 因为它直接把动态导入的模块当作组件用，只有 `default` 是约定俗成的「组件位」；具名导出可用 `.then` 手动映射。
- **`Suspense` 只能给懒加载用吗？** 不止。React 18 里任何「会挂起」的数据源、并发特性都能共用同一套边界，懒加载只是最基本的一种。
- **包裹位置放错会怎样？** 懒组件如果没有任何 `Suspense` 祖先，渲染时会抛出错误（同步输入下出现挂起会直接失败）。
- **懒加载组件报错会被谁接住？** 由外层错误边界接住。`Suspense` 管「加载中」，错误边界管「渲染 / 加载失败」，是两套独立机制，通常需要一起用。
- **拆得太碎会不会反而更慢？** 会。每个 chunk 都有一次额外的网络往返，路由级拆分通常最划算，粒度过细要权衡请求数。
- **SSR 下能直接懒加载吗？** 传统 SSR 不支持 `React.lazy` 的挂起，需要框架方案（如 Next.js 的 `dynamic`）或支持 Suspense 的服务端渲染。

## 相关题目

- [react-016-error-boundary](/q/react/react-016-error-boundary)
- [react-008-fiber](/q/react/react-008-fiber)
