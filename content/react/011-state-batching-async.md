---
title: setState 之后为什么拿不到最新值？函数式更新解决什么问题？
subtopic: 状态管理与更新
difficulty: middle
frequency: high
tags: [React, setState, 批量更新, 函数式更新, 闭包陷阱]
order: 110
related: [react-004-hooks-rules, react-002-closure-useref, react-014-usereducer]
---

点击下面这个按钮，`count` 实际加了几？`console.log` 又会打印几？为什么？：

```jsx
function Counter() {
  const [count, setCount] = useState(0)

  function handleClick() {
    setCount(count + 1)
    setCount(count + 1)
    setCount(count + 1)
    console.log('点击后 count =', count) // 打印的是几？
  }

  return <button onClick={handleClick}>+3</button>
}
```

## 参考答案

结论：

1. `setState` 是**异步**的（更准确说是「批量的」），调用后当前这次渲染里的 `count` 变量不会变；
2. 同一事件里三次 `setCount(count + 1)` 用的都是**同一次渲染的快照值 0**，最终只 +1；
3. `console.log(count)` 打印的是这次渲染的旧快照，即 `0`；
4. 想真正叠加，用**函数式更新** `setCount((c) => c + 1)`，它接收「上一次更新后的最新值」。

```jsx
function handleClick() {
  setCount((c) => c + 1)
  setCount((c) => c + 1)
  setCount((c) => c + 1) // 三次都基于最新值，最终 +3
}
```

## 原理讲解

**现象**：连点三次 `setCount(count + 1)`，界面只 +1；而且 `console.log(count)` 打印的还是旧值。

**原因**有两层：

- **快照**：每次渲染，函数组件里的 `count` 是一个当轮**常量**，不会被 `setCount` 就地改写。你在 `handleClick` 里读到的永远是「触发这次渲染时的那一份」。
- **批量更新**：React 会把同一个事件处理中的多次 `setState` 收集起来，等处理函数跑完再统一渲染一次。三次用的都是同一个快照，自然只算出 `0 + 1 = 1`。

用一段纯逻辑模拟这套「快照 + 队列」的语义：

```js run
// 用「快照 + 队列」模拟 React 的批量更新语义
let state = 0        // 当前 state：这一帧的快照
let queue = []       // 待处理的更新队列

function render() {
  // 依次执行队列里的更新，算出新的 state
  queue.forEach((updater) => {
    state = typeof updater === 'function' ? updater(state) : updater
  })
  queue = []
}
function setState(updater) {
  queue.push(updater)
}

// 写法一：三次都基于旧快照
const snapshot = state // 相当于 setCount(count + 1) 里的 count
setState(snapshot + 1)
setState(snapshot + 1)
setState(snapshot + 1)
render()
console.log('用旧值写法 +3 次后 =', state)

// 写法二：函数式更新，接收上一次的最新值
setState((c) => c + 1)
setState((c) => c + 1)
setState((c) => c + 1)
render()
console.log('函数式更新 +3 次后 =', state)
```

```text output
用旧值写法 +3 次后 = 1
函数式更新 +3 次后 = 4
```

**解决方案**：当新值依赖旧值时，一律用函数式更新 `setState((prev) => next)`，让 React 在渲染时把「最新值」喂给你的更新函数，而不是你自己去读闭包里的旧快照。

对比一下：

| 写法 | 适用场景 | 同一事件里多次调用 |
| --- | --- | --- |
| `setCount(count + 1)` | 新值与旧值无关（如直接设成常量） | 全部基于同一快照，只有最后一次生效 |
| `setCount((c) => c + 1)` | 新值依赖旧值（累加、切换、合并） | 依次基于最新值累加，结果正确 |

补充：**React 18 起，「自动批处理」从事件处理扩展到了 Promise、`setTimeout`、原生事件回调**。下面这两种写法在 React 18 中都只会触发一次渲染：

```jsx
// React 17：异步回调里两次 set 会渲染两次；React 18：合并为一次
setTimeout(() => {
  setCount((c) => c + 1)
  setFlag(true)
}, 0)

// 需要同步读取 DOM 时，flushSync 会强制立即渲染（谨慎使用）
flushSync(() => setCount((c) => c + 1))
console.log('flushSync 之后 state 已提交')
```

## 追问与易错点

- **`setState` 之后马上 `console.log(state)` 为什么还是旧值？** 因为 state 是当轮渲染的快照，新值要等下一次渲染才会出现在新的 `count` 变量里。想读最新值用 `useEffect` 监听，或存进 `useRef`。
- **函数式更新能替代补依赖吗？** 对「基于旧值的更新」可以；但需要读取其他 state 做判断时，仍可能踩闭包陷阱，要补全依赖或用 ref。
- **`setState` 传入对象会不会被合并？** 不会，React 不做浅合并，直接替换。要合并得自己写 `setState((prev) => ({ ...prev, ...patch }))`。
- **批处理一定只渲染一次吗？** 同一「批次」内是；跨批次（如 `await` 之后）会被拆开，可考虑 `unstable_batchedUpdates`（旧版本）或升级到 React 18。
- **为什么会渲染两次甚至多次？** React 18 的并发特性（如 `useTransition`、`Suspense`）可能重放渲染，但对外表现与最终状态一致；`StrictMode` 开发模式下的双调用只是用来暴露副作用问题。

## 相关题目

- [react-004-hooks-rules](/q/react/react-004-hooks-rules)
- [react-002-closure-useref](/q/react/react-002-closure-useref)
