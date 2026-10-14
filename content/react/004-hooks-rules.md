---
title: 为什么 Hooks 不能写在条件/循环里？useState 的原理是什么？
subtopic: Hooks 基础
difficulty: middle
frequency: high
tags: [React, Hooks, useState, 调用顺序, 链表]
order: 40
---

## 参考答案

一句话结论：**React 靠「调用顺序」而不是名字来识别每一个 Hook**。

函数组件对应的 Fiber 节点上挂着一条 **Hooks 单向链表**，每次渲染时 React 拿着一个游标按顺序往后走：第 1 次调用 `useState` 取链表第 1 个节点，第 2 次取第 2 个……如果 Hook 写在条件或循环里，两次渲染之间调用顺序可能发生变化，游标与链表节点错位，state 就会「张冠李戴」。

`useState` 的原理：

1. **首次渲染（mount）**：创建 hook 节点 `{ memoizedState, queue, next }` 挂到链表上，`memoizedState` 存当前 state，`queue` 存更新队列；
2. **触发更新**：`setState` 把更新动作放入 `queue`，并调度一次重新渲染；
3. **重新渲染（update）**：按调用顺序取出对应 hook 节点，依次执行队列中的更新，算出新 state 返回。

```jsx
// 错误示范：条件里的 Hook
function Demo({ showExtra }) {
  const [a, setA] = useState(0)
  if (showExtra) {
    const [b, setB] = useState(0) // showExtra 变化时，链表顺序被打乱
  }
  const [c, setC] = useState(0) // 可能拿到 b 的位置，数据错乱
}

// 正确：Hook 一律写在顶层，把条件挪进 Hook 内部
function Demo({ showExtra }) {
  const [b, setB] = useState(0)
  useEffect(() => {
    if (showExtra) {
      // 条件逻辑写在里面
    }
  }, [showExtra])
}
```

## 原理讲解

Hooks 链表大致长这样：

```text
Fiber.memoizedState → Hook(useState a) → Hook(useEffect) → Hook(useState c) → null
```

渲染开始时游标指向链表头，每调用一次 Hook，游标后移一位。React 在开发模式下会用 `dispatcher` 检查调用上下文，一旦检测到顺序异常（比如某次渲染少调了一个 Hook），就会抛出经典报错：

```text output
Rendered fewer hooks than expected. This may be caused by an accidental early return statement.
```

`setState` 的两个细节：

- **函数式更新**：`setCount((c) => c + 1)` 中的更新函数会放进队列，渲染时依次执行，因此多次调用能拿到正确的累加结果；
- **批量更新**：React 18 起所有更新（包括 Promise、setTimeout 里的）都会自动批处理，一次事件中的多个 `setState` 只触发一次渲染。

## 追问与易错点

- **多次调用 `useState`，React 怎么区分谁是谁？** 只靠调用顺序，这也是规则存在的根本原因。
- **为什么不能在嵌套函数 / 回调里调 Hook？** 同样会破坏「每次渲染以相同顺序执行」的前提。
- **早期 return 也会违反规则吗？** 会。`if (loading) return null` 写在中途会跳过后续 Hook，应把所有 Hook 放在 return 之前。
- **类组件为什么没有这个限制？** 类组件的 state 是 `this` 上的一个对象，生命周期方法位置固定，不存在「按调用顺序登记」的问题。
- **自定义 Hook 就能随便写了吗？** 不能，自定义 Hook 内部依然要遵守规则——它只是逻辑的抽取，调用栈最终仍落在同一个组件的链表上。

## 相关题目

- [react-001-useeffect-deps](/q/react/react-001-useeffect-deps)
- [react-002-closure-useref](/q/react/react-002-closure-useref)
