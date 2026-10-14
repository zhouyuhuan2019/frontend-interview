---
title: useEffect 的依赖数组怎么理解？有哪些常见坑？
subtopic: Hooks 基础
difficulty: middle
frequency: high
tags: [React, useEffect, 依赖数组, 闭包陷阱, 清理函数]
order: 10
---

## 参考答案

`useEffect` 的第一个参数是副作用函数，第二个参数是**依赖数组**，它决定副作用何时重新执行：

| 写法 | 行为 |
| --- | --- |
| 不传第二个参数 | 每次渲染后都执行 |
| `[]` | 只在挂载后执行一次，卸载时执行清理 |
| `[a, b]` | `a` 或 `b` 变化时重新执行 |

返回值是清理函数，在「下次执行前」和「组件卸载时」被调用：

```jsx run readonly
useEffect(() => {
  const timer = setInterval(() => setCount((c) => c + 1), 1000)
  return () => clearInterval(timer) // 清理，避免定时器泄漏
}, [])
```

四条实践要点：

1. **依赖要写全**（ESLint 的 `exhaustive-deps` 规则会检查），否则读到的是旧闭包里的值；
2. **不要用「少写依赖」来模拟只执行一次**，需要精准控制时用 `useRef` 记录状态；
3. **清理函数要成对出现**（订阅 / 取消订阅、定时器 / 清除定时器）；
4. **依赖是引用比较**，对象 / 数组 / 函数每次渲染都是新引用，需要 `useMemo` / `useCallback` 稳定。

## 原理讲解

React 每次渲染都会重新执行整个函数组件，从而创建**新的闭包**。`useEffect` 的依赖数组是 React 判断「这次渲染产生的副作用函数与上次是否等价」的唯一依据。

如果依赖写漏了，副作用函数会一直引用**首次渲染时创建的闭包**，于是出现经典问题：

```jsx run readonly
function Counter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      console.log(count) // 永远打印 0：闭包捕获的是首次渲染的 count
    }, 1000)
    return () => clearInterval(timer)
  }, []) // 缺少 count

  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

两种修法：

- 把 `count` 加进依赖数组（副作用随值重建）；
- 或者用函数式更新 `setCount((c) => c + 1)`，让逻辑不依赖外部闭包。

## 追问与易错点

- **`useEffect` 与 `useLayoutEffect` 的区别？** 前者在浏览器绘制后异步执行，后者在 DOM 变更后、绘制前同步执行，适合需要读取布局的测量。
- **`useEffect` 和组件生命周期怎么对应？** `[]` 对应 `componentDidMount`，返回值对应 `componentWillUnmount`，`[dep]` 对应 `componentDidUpdate`。
- **StrictMode 下副作用会执行两次？** 这是 React 18 有意为之，用于暴露「没有正确清理」的问题，生产环境不会重复。
- **依赖数组里放函数有什么问题？** 父组件每次渲染都会创建新函数，导致子组件副作用反复执行；用 `useCallback` 或把函数定义移到组件外。

## 相关题目

- [react-002-closure-useref](/q/react/react-002-closure-useref)
