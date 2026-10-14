---
title: 什么是 React 的闭包陷阱？useRef 怎么解决？
subtopic: 闭包陷阱与 useRef
difficulty: senior
frequency: high
tags: [React, 闭包陷阱, useRef, Hooks, 定时器]
order: 20
---

先阅读下面这段代码，回答：连续点击按钮几次后，定时器每秒打印的 `count` 是多少？为什么不是界面上显示的最新值？

```jsx
function Demo() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      console.log(count) // 这里打印的是什么？
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

## 参考答案

React 函数组件每次渲染都会生成一份新的闭包。异步回调、定时器、事件监听里读取到的 state / props，都是**捕获那一刻的值**，而不是最新值——这就是闭包陷阱（stale closure）。

三种解法：

1. **补全依赖数组**：让副作用随值重建（最符合 Hooks 心智）；
2. **函数式更新**：`setCount((c) => c + 1)`，让更新逻辑不依赖外部闭包；
3. **用 `useRef` 存最新值**：ref 对象在组件整个生命周期内保持不变，读写 `.current` 永远拿到最新值。

```jsx run readonly
function Demo() {
  const [count, setCount] = useState(0)
  const countRef = useRef(count)

  // 每次渲染同步最新值
  useEffect(() => {
    countRef.current = count
  }, [count])

  useEffect(() => {
    const timer = setInterval(() => {
      console.log(countRef.current) // 始终是最新值
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

## 原理讲解

`useState` 返回的是**这一帧的值**，像一个快照（snapshot）；`useRef` 返回的是**一个稳定的可变容器**，跨渲染共享同一个对象。

两者的差异本质上是「值语义 vs 引用语义」：

| | useState | useRef |
| --- | --- | --- |
| 跨渲染 | 每次渲染都是新的值 | 同一个对象 |
| 变更是否触发渲染 | 会 | 不会 |
| 适用场景 | 参与 UI 的数据 | 不参与 UI 的可变数据（定时器 id、DOM、上一次的值） |

注意 `useRef` 修改 `.current` **不会触发重新渲染**，这正是它适合存「不需要展示但需要读取」的数据的原因。

## 追问与易错点

- **把最新 state 写进 ref 会不会掩盖设计问题？** 有可能。优先考虑补全依赖或用函数式更新；只有在「稳定订阅 + 需要最新值」这类场景（如长连接的 `onmessage`）才用 ref。
- **`useRef` 能替代 `useState` 吗？** 不能，ref 变化不会触发渲染，UI 不会更新。
- **`useCallback(fn, [])` 里的 fn 也有闭包陷阱吗？** 有。空依赖的 `useCallback` 同样会捕获首次渲染的变量，需要把依赖写全或配合 ref。
- **Vue 里有类似问题吗？** Vue 的 `setup` 只执行一次，响应式数据是代理对象，读取 `.value` / 属性时拿到的是实时值，因此没有等价的闭包陷阱。

## 相关题目

- [react-001-useeffect-deps](/q/react/react-001-useeffect-deps)
