---
title: 自定义 Hook 怎么写才规范？如何用它复用逻辑？
subtopic: 自定义 Hook
difficulty: middle
frequency: high
tags: [React, 自定义 Hook, 逻辑复用, Hooks 规则]
order: 150
related: [react-004-hooks-rules, react-001-useeffect-deps, react-006-usememo-usecallback]
---

「监听窗口宽度」和「切换 loading 状态」这两段逻辑，在两个页面里被原样复制了两遍。你打算把它们抽成自定义 Hook，但目前是这么写的：

```jsx
// 页面 A 与页面 B 里各复制了一份
function PageA() {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const [loading, setLoading] = useState(false)
  // ...
}
```

请问：抽成自定义 Hook 要注意哪些规范？`useWindowWidth`、`useToggle` 这类 Hook 应该长什么样？

## 参考答案

自定义 Hook 就是**名字以 `use` 开头、内部可以调用其他 Hook 的普通函数**。它复用「带状态的逻辑」，不负责复用 UI。三条硬性规范：

1. **命名必须以 `use` 开头**（如 `useWindowWidth`）。这样 React 的 lint 插件才能识别它是 Hook，并对调用位置做规则校验；
2. **只在组件或其它 Hook 的顶层调用**，不能放进条件、循环、嵌套函数里——和普通 Hook 的规则完全一致；
3. **返回「状态 + 操作」的可组合接口**（对象或数组），把内部实现细节藏起来，调用方只关心结果。

```jsx
// useWindowWidth.js —— 把重复的监听逻辑收拢成一个 Hook
import { useEffect, useState } from 'react'

export function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth) // 惰性初始化，避免多算一次

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize) // 清理成对出现
  }, [])

  return width
}
```

调用方一行搞定，页面 A / B 不再各自维护一套 `useState + useEffect`：

```jsx
function PageA() {
  const width = useWindowWidth()
  return <div>当前宽度：{width}</div>
}
```

## 原理讲解

**现象**：同一个 `useState + useEffect` 组合在多处复制，改一处漏一处，清理逻辑很容易写错。

**原因**：React 没有 Vue 的 `mixin`，也没有高阶组件那样能复用 UI 的手段。组件间的逻辑复用，唯一「不破坏组件树、不增加嵌套」的方式，就是把「用到 Hook 的那段逻辑」封装成函数——这就是自定义 Hook。

自定义 Hook 的本质，是「一个会在内部调用 `useState` / `useEffect` 的普通函数」，返回值通常是一个**带状态和操作方法的对象**。用纯函数把这种形态模拟出来，可以直观看清它到底返回了什么：

```js run
function createToggle(initial = false) {
  let value = initial
  const listeners = new Set()
  const set = (next) => {
    value = typeof next === 'function' ? next(value) : next
    listeners.forEach((l) => l(value))
  }
  return {
    read: () => value,
    toggle: () => set((v) => !v),
    subscribe: (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

const visible = createToggle()
console.log(visible.read())
visible.toggle()
console.log(visible.read())
visible.toggle()
console.log(visible.read())
```

```text output
false
true
false
```

`createToggle` 就相当于 `useToggle` 去掉 React 外壳后的骨架：内部保存状态，对外抛出 `read / toggle / subscribe`。换成 React 版：

```jsx
export function useToggle(initial = false) {
  const [value, setValue] = useState(initial)
  const toggle = useCallback(() => setValue((v) => !v), [])
  return { value, toggle }
}
```

**解决方案**——写自定义 Hook 时的落地清单：

| 要点 | 做法 | 不这么做会怎样 |
| --- | --- | --- |
| 命名 | 以 `use` 开头 | lint 不校验，容易在条件里误用 |
| 依赖 | `useEffect` 依赖写全 | 读到旧闭包值 |
| 清理 | `return` 清理函数 | 监听 / 定时器泄漏 |
| 引用稳定 | 返回的函数用 `useCallback` | 每次渲染新引用，拖累下游 `memo` |
| 组合 | Hook 里调用其他 Hook | 这正是复用的核心价值 |
| 不复用 UI | 只返回数据，JSX 交给组件 | 憋成「伪组件」，丧失组合性 |

自定义 Hook 之间还能互相组合：`useUser` 内部可以用 `useRequest`、`useToggle`，层层拼装出业务逻辑。这也是它比高阶组件更受欢迎的原因——不增加组件层级，不劫持 `props`。

## 追问与易错点

- **两个组件用同一个自定义 Hook，状态会共享吗？** 不会。自定义 Hook 里的 `useState` 是「跟着调用它的组件走」的，每个组件各持一份独立 state，要共享状态得用 Context 或状态库。
- **自定义 Hook 一定要以 `use` 开头吗？** 是的。`use` 前缀不只是命名约定，它是 React 判断「这里面可能有 Hook」从而施加规则校验的唯一信号；写成 `getWindowWidth` 会被 lint 当成普通函数，条件调用也不报错。
- **能返回 JSX 吗？** 技术上可以，但那样它就更像一个组件。复用的逻辑越纯（只返回数据和操作），越容易在不同 UI 里被复用。
- **`useCallback` 包返回函数是必须的吗？** 不必须，但如果这个函数会被下游 `React.memo` 的子组件当 `props` 用，不包就会破坏 `memo` 效果。
- **`useEffect` 里能直接写 `async` 函数吗？** 不能，`useEffect(async () => ...)` 返回的是 Promise 而不是清理函数。应在内部定义 async 函数再调用，或在自定义 Hook 里统一处理。

## 相关题目

- [react-004-hooks-rules](/q/react/react-004-hooks-rules)
- [react-001-useeffect-deps](/q/react/react-001-useeffect-deps)
- [react-006-usememo-usecallback](/q/react/react-006-usememo-usecallback)
