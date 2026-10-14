---
title: useMemo/useCallback/React.memo 怎么优化性能？有什么坑？
subtopic: 性能优化
difficulty: middle
frequency: high
tags: [React, 性能优化, useMemo, useCallback, React.memo]
order: 60
---

## 参考答案

三者的共同原理都是**引用相等（`Object.is`）**：

| API | 作用 | 缓存对象 |
| --- | --- | --- |
| `useMemo(fn, deps)` | 依赖不变时复用上次的**计算结果** | 值 |
| `useCallback(fn, deps)` | 依赖不变时复用上次的**函数引用** | 函数 |
| `React.memo(Comp)` | props 浅比较不变时**跳过子组件渲染** | 渲染结果 |

典型组合拳：父组件用 `useCallback` / `useMemo` 稳定引用，子组件用 `React.memo` 承接——只有 props 真的变了子组件才重渲染：

```jsx
const List = React.memo(function List({ items, onSelect }) {
  console.log('List render')
  return items.map((it) => <li key={it.id} onClick={() => onSelect(it)}>{it.name}</li>)
})

function Page() {
  const [kw, setKw] = useState('')
  const [items] = useState(rawData)

  // 重计算缓存：只有 items 或 kw 变化才重新过滤
  const filtered = useMemo(() => items.filter((it) => it.name.includes(kw)), [items, kw])

  // 函数引用缓存：配合 memo，否则每次渲染都是新函数，memo 失效
  const onSelect = useCallback((item) => console.log(item), [])

  return (
    <>
      <input value={kw} onChange={(e) => setKw(e.target.value)} />
      <List items={filtered} onSelect={onSelect} />
    </>
  )
}
```

## 原理讲解

React 默认行为是**父组件渲染，所有子组件跟着渲染**，无论 props 是否变化。`React.memo` 在渲染前对前后 props 做浅比较，全部相等就跳过重渲染、复用上次的虚拟 DOM。

浅比较意味着：只要 props 里有每次渲染新建的引用（内联对象、数组、函数），比较必然失败，memo 形同虚设。这就是 `useCallback` / `useMemo` 存在的意义——把引用稳定下来：

```jsx
// 反例：memo 被内联 props 击穿
<Child style={{ color: 'red' }} onClick={() => doX()} />

// 正例
const style = useMemo(() => ({ color: 'red' }), [])
const handleClick = useCallback(() => doX(), [])
<Child style={style} onClick={handleClick} />
```

注意 `useCallback(fn, deps)` 与 `useMemo(() => fn, deps)` 完全等价，前者只是后者的语法糖。

常见坑：

1. **依赖写错**：依赖数组漏写会拿到旧的闭包值（闭包陷阱）；多写会导致缓存频繁失效；
2. **过度优化**：缓存本身有比较和存储成本，简单计算、必定会重渲染的组件包了反而更慢；
3. **`children` 击穿 memo**：`<Wrapper><Child /></Wrapper>` 中的 `<Child />` 每次渲染都是新的 React 元素，Wrapper memo 也拦不住，可用 `useMemo` 缓存 children 或状态下沉；
4. **React 19 的 React Compiler** 可自动完成大部分记忆化，手写三件套的必要性在下降。

## 追问与易错点

- **什么时候不需要这些优化？** 组件渲染本身很便宜、props 都是原始类型、子组件本来就要随父组件更新时，直接渲染即可——先测量再优化。
- **`useMemo` 能保证永不重新计算吗？** 不能。官方明确它是性能优化而非语义保证，React 在内存压力等情况下可能丢弃缓存，不要在里面放有副作用的逻辑。
- **空依赖的 `useCallback` 里读到旧 state 怎么办？** 这是闭包陷阱：要么补全依赖，要么用 ref 存最新值，要么用函数式更新。
- **`React.memo` 能传自定义比较函数吗？** 能，第二参数 `(prevProps, nextProps) => boolean`，返回 `true` 表示相等跳过重渲染，但绝大多数场景浅比较已够用。
- **context 变化时 memo 还有用吗？** 没用。组件订阅的 context 变化会强制重渲染，绕开 memo。

## 相关题目

- [react-002-closure-useref](/q/react/react-002-closure-useref)
