---
title: 组件报错导致整页白屏怎么处理？错误边界怎么写？
subtopic: 错误处理
difficulty: senior
frequency: medium
tags: [React, 错误边界, ErrorBoundary, 白屏, componentDidCatch]
order: 160
related: [react-003-jsx, react-009-vue-vs-react, react-015-custom-hook]
---

有这么一个个人主页组件：用户数据还没加载完时 `user` 是 `null`，此时直接读取 `user.name` 就会抛错。

```jsx
function Profile({ user }) {
  // 加载完成前 user 为 null
  return <h1>{user.name} 的主页</h1> // 访问 null.name → 抛出错误
}
```

问题：一个小组件抛了错，为什么**整页直接白屏**？怎么做才能让这一块出错、其余部分照常显示？

## 参考答案

结论：React 在渲染阶段抛出的错误，如果没有被**错误边界（Error Boundary）**接住，会**卸载整棵组件树**，界面就白了。解决办法就是给「可能出错的子树」套一层错误边界，用它渲染兜底 UI。

错误边界是一个实现了以下生命周期之一的 **class 组件**（目前 Hook 写不了）：

- `static getDerivedStateFromError(error)`：渲染阶段出错时调用，返回新 state 以渲染兜底 UI；
- `componentDidCatch(error, info)`：提交阶段调用，用来上报日志。

```jsx
import React from 'react'

class ErrorBoundary extends React.Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true } // 切换到兜底 UI
  }

  componentDidCatch(error, info) {
    reportToServer(error, info.componentStack) // 上报错误
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>这块内容出错了，请稍后重试</div>
    }
    return this.props.children
  }
}
```

使用时把易错的子树包起来，边界放在「局部」而不是整页根部：

```jsx
function App() {
  return (
    <Layout>
      <ErrorBoundary fallback={<p>侧边栏加载失败</p>}>
        <Sidebar />
      </ErrorBoundary>
      <ErrorBoundary fallback={<p>正文加载失败</p>}>
        <Article />
      </ErrorBoundary>
    </Layout>
  )
}
```

同时把「可能为空」的取值也兜住，避免无谓抛错：

```jsx
function Profile({ user }) {
  if (!user) return <Skeleton />
  return <h1>{user.name} 的主页</h1>
}
```

## 原理讲解

**现象**：一个 `user.name` 读取失败，整页变白，其它无关模块也一起消失。

**原因**：从 React 16 起，渲染阶段未捕获的错误会顺着组件树向上冒泡。如果一路上都没有错误边界，React 认为「状态已不可信」，就直接**把整棵树卸载**——目的是让错误暴露出来，而不是留下一个半坏不坏的界面。

**解决方案**：在合适的层级插入错误边界。要点如下：

- **粒度**：边界放得越低，隔离性越好，页面其余部分越不受影响；放在根部等于「整页兜底」，一处出错全站空白。
- **两种生命周期各司其职**：`getDerivedStateFromError` 负责切到兜底 UI（必须是纯函数，只返回 state），`componentDidCatch` 负责副作用（上报、埋点）。

错误边界**捕获不到**的错误，需要额外手段：

| 错误来源 | 错误边界能捕获吗 | 补充手段 |
| --- | --- | --- |
| 子组件渲染阶段抛错 | ✅ | 无需补充 |
| 事件处理函数里的错误 | ❌ | `try / catch` 包裹 |
| 异步代码（`setTimeout`、Promise） | ❌ | `window.onerror` / `unhandledrejection` |
| 错误边界组件自身抛错 | ❌ | 上层再套一层边界 |
| 服务端渲染（SSR） | ❌ | 框架级处理 |
| 组件树之外的错误 | ❌ | 全局兜底监听 |

也可以直接用社区库 `react-error-boundary`，它把 class 封装成组件，还提供重置、Hooks 等能力：

```jsx
import { ErrorBoundary } from 'react-error-boundary'

<ErrorBoundary FallbackComponent={Fallback} onReset={() => reload()}>
  <Article />
</ErrorBoundary>
```

## 追问与易错点

- **为什么不能用函数组件写错误边界？** 它依赖 `getDerivedStateFromError` / `componentDidCatch` 这两个 class 专属生命周期，Hook 里没有等价 API。
- **错误边界等于万能 `try / catch` 吗？** 不是。它只覆盖「渲染 / 生命周期」这两类错误，事件回调、异步任务、SSR 的错误都被漏掉，必须用 `try / catch` 和全局监听补齐。
- **捕获后怎么恢复？** 错误边界本身没有「重试」概念，需要业务上给一个重置入口，通过改 `key` 或重置 `hasError` 让子树重新挂载。
- **开发环境的红色错误浮层和错误边界冲突吗？** 不冲突。开发环境即使有边界，错误仍会打印到控制台便于排查；生产环境才会安静地走兜底 UI。
- **错误边界能替代全局 `window.onerror` 吗？** 不能，二者互补。错误边界管「渲染期」，全局监听管「渲染期之外的任何角落」，生产监控通常两者都上。
- **嵌套多个错误边界会怎样？** 就近生效。错误由离它最近的边界处理；处理不了（如边界组件自身出错）才会继续向上冒泡。

## 相关题目

- [react-003-jsx](/q/react/react-003-jsx)
- [react-009-vue-vs-react](/q/react/react-009-vue-vs-react)
- [react-015-custom-hook](/q/react/react-015-custom-hook)
