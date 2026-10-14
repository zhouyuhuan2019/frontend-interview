---
title: useEffect 与 useLayoutEffect 的区别是什么？
subtopic: Hooks 基础
difficulty: middle
frequency: medium
tags: [React, useEffect, useLayoutEffect, 渲染流程, 副作用]
order: 50
---

## 参考答案

核心区别在**执行时机**：

| | useEffect | useLayoutEffect |
| --- | --- | --- |
| 执行时机 | 浏览器**绘制完成后**异步执行 | DOM 变更后、浏览器**绘制前**同步执行 |
| 是否阻塞绘制 | 不阻塞 | 阻塞（执行完才绘制） |
| 适合场景 | 数据请求、订阅、日志等绝大多数副作用 | DOM 测量、同步修改样式避免闪烁 |
| SSR | 正常 | 会触发警告 |

一句话记忆：**默认用 `useEffect`；只有当用户能「看见」错误的中间状态（闪烁）时，才换 `useLayoutEffect`**。

典型的闪烁场景——先按旧位置绘制了一帧，再修正：

```jsx
function Tooltip() {
  const ref = useRef(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  // 用 useEffect：第一帧 tooltip 在 (0,0)，用户看到跳动
  // 用 useLayoutEffect：绘制前就把位置算好，用户无感知
  useLayoutEffect(() => {
    const rect = ref.current.getBoundingClientRect()
    setPos({ x: rect.left, y: rect.bottom })
  }, [])

  return <div ref={ref} style={{ left: pos.x, top: pos.y }}>提示</div>
}
```

## 原理讲解

一次更新的完整流程：

```text
触发更新 → render 阶段（调用组件、Diff）→ commit 阶段（提交 DOM 变更）
→ 同步执行 useLayoutEffect → 浏览器绘制 → 异步执行 useEffect
```

`useLayoutEffect` 和类组件的 `componentDidMount / componentDidUpdate` 在同一时机触发：此时 DOM 已更新但还没绘制，在里面读取布局（`getBoundingClientRect`、`offsetHeight`）并同步修改样式，浏览器会把两帧合并成一次绘制，用户看不到中间态。

代价是它**阻塞渲染**：如果里面做了重计算或长任务，页面会直接卡住。所以非必要不使用。

执行顺序上，子组件的 layout effect 先于父组件执行（与挂载顺序一致），保证父组件测量时子树 DOM 已就绪。

React 18 还提供了 `useInsertionEffect`，时机更早（DOM 变更前），专为 CSS-in-JS 库注入样式设计，业务代码基本用不到。

## 追问与易错点

- **SSR 下为什么 `useLayoutEffect` 会报警告？** 服务端没有绘制环节，执行它没有意义。React 提示改用 `useEffect`；需要同构时可以封装 `useIsomorphicLayoutEffect`（服务端环境降级为 `useEffect`）。
- **在 `useLayoutEffect` 里 `setState` 会怎样？** 会在绘制前同步触发一次重新渲染，两帧合并，用户无感知；在 `useEffect` 里则会先绘制一次再更新，可能闪烁。
- **执行顺序是「子先父后」吗？** 对两种 effect 都是：先执行子组件的，再执行父组件的。
- **性能上怎么选？** 能放 `useEffect` 就别放 `useLayoutEffect`，后者阻塞主线程绘制，长任务直接造成卡顿。
- **清理函数时机一样吗？** 一样，都是在「下次执行前」和「卸载时」调用，只是各自遵守自己的同步 / 异步节奏。

## 相关题目

- [react-001-useeffect-deps](/q/react/react-001-useeffect-deps)
