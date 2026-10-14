---
title: 什么时候该用 useReducer 而不是 useState？
subtopic: 状态管理与更新
difficulty: middle
frequency: medium
tags: [React, useReducer, useState, 状态管理, dispatch]
order: 140
related: [react-011-state-batching-async, react-004-hooks-rules]
---

下面是一个编辑器组件的状态写法。字段之间互相关联，每处修改都要手动同步好几个 `setState`，很容易漏改。请问：这种状态该用 `useState` 还是 `useReducer`？`useReducer` 到底适合什么场景？

```jsx
function Editor() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  // 每次修改都要手动同步好几个 setState，容易漏改
}
```

## 参考答案

结论：当一份状态由**多个互相关联的字段**组成、「下一个状态依赖上一个状态」、且有多种**明确的转移动作**时，用 `useReducer` 更好：

| 判断依据 | 更适合 `useState` | 更适合 `useReducer` |
| --- | --- | --- |
| 字段数量 | 少、彼此独立 | 多、互相关联 |
| 更新逻辑 | 简单赋值 | 有分支 / 校验 / 组合 |
| 新状态依赖旧状态 | 不依赖 | 强依赖 |
| 逻辑复用与测试 | 内联即可 | 想抽成纯函数单独测试 |

`useReducer` 把 state 收进一个对象，逻辑集中到纯函数 `reducer(state, action) => newState`，组件只负责 `dispatch({ type, ... })`。

```jsx
function editorReducer(state, action) {
  switch (action.type) {
    case 'change':
      return { ...state, [action.field]: action.value, dirty: true }
    case 'saving':
      return { ...state, saving: true, error: null }
    case 'saved':
      return { ...state, saving: false, dirty: false }
    case 'error':
      return { ...state, saving: false, error: action.error }
    default:
      return state
  }
}

function Editor() {
  const [state, dispatch] = useReducer(editorReducer, {
    title: '',
    content: '',
    dirty: false,
    saving: false,
    error: null,
  })
  // 组件里只发动作，不再散落一堆 setXxx
}
```

## 原理讲解

**现象**：用 `useState` 管理一组联动字段时，更新逻辑散落在各处，改一个状态要记住同步另外几个，容易不一致。

**原因**：`useState` 的粒度是「单个值」。当状态之间存在**转移关系**（保存中 → 保存成功 → 清空 dirty）时，把这套关系拆成若干个独立的 `setXxx`，就等于把「状态机」打散，逻辑没有集中点。

`useReducer` 本质上就是 **`useState` 的推广形式**：`useState` 是 `(值, set值)`，`useReducer` 是 `(值, dispatch动作)`，把「怎么变」统一交给一个 reducer 纯函数。用一段纯逻辑演示 reducer 的转移过程：

```js run
// reducer 是纯函数：同样的 (state, action) 永远得到同样的新 state
function counterReducer(state, action) {
  switch (action.type) {
    case 'inc':
      return { ...state, count: state.count + 1 }
    case 'setStep':
      return { ...state, step: action.step }
    case 'reset':
      return { count: 0, step: 1 }
    default:
      return state
  }
}

let state = { count: 0, step: 1 }
const actions = [
  { type: 'inc' },
  { type: 'setStep', step: 5 },
  { type: 'inc' },
  { type: 'inc' },
  { type: 'reset' },
]

for (const action of actions) {
  state = counterReducer(state, action)
  console.log(`${action.type} => count=${state.count}, step=${state.step}`)
}
```

```text output
inc => count=1, step=1
setStep => count=1, step=5
inc => count=2, step=5
inc => count=3, step=5
reset => count=0, step=1
```

**解决方案**：把互换的状态合并成一个对象，把「怎么变」写成 reducer。好处：

1. **逻辑集中**：所有转移都在一个函数里，改需求只改一处；
2. **便于测试**：reducer 是纯函数，不依赖 React 环境就能单测；
3. **`dispatch` 引用稳定**：不像内联 `setXxx` 每次渲染都变，`dispatch` 可以安全地通过 props 传给子组件（配合 `React.memo` 不会被击穿）；
4. **可组合**：把多个 reducer 组合、或配合 `useContext` 做「轻量全局状态」都很自然。

还有一点：`useReducer` 也支持**惰性初始化**。当初始 state 的计算比较昂贵时，把 `init` 函数作为第三个参数，就能只在首次渲染时算一次：

```jsx
// 第三个参数是 init 函数，第二参数是它的入参
const [state, dispatch] = useReducer(reducer, initialArg, init)
```

## 追问与易错点

- **`useReducer` 一定比 `useState` 性能好吗？** 不一定。它主要是「组织逻辑」的工具，减少了闭包依赖，但并不减少渲染次数。
- **reducer 里能写副作用吗？** 不能。reducer 必须是**纯函数**，副作用（发请求、打日志）应在 `dispatch` 之后或 `useEffect` 里做。
- **`dispatch` 传引用稳定吗？** 稳定。React 保证同一个 `useReducer` 返回的 `dispatch` 在组件生命周期内引用不变。
- **一个组件能用多个 `useReducer` 吗？** 能，就像多次调用 `useState` 一样，前提是遵守 Hooks 调用规则、位置固定。
- **状态再复杂该用什么？** 需要跨组件共享、带中间件、要时间旅行调试时，上 Redux Toolkit / Zustand 等状态库；单个组件的局部复杂状态，`useReducer` 通常够。

## 相关题目

- [react-011-state-batching-async](/q/react/react-011-state-batching-async)
- [react-004-hooks-rules](/q/react/react-004-hooks-rules)
