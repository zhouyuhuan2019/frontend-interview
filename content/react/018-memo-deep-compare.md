---
title: React.memo 为什么没生效？浅比较与 useMemo/useCallback 怎么配合？
subtopic: 性能优化
difficulty: senior
frequency: high
tags: [React, React.memo, 浅比较, useMemo, useCallback, 性能优化]
order: 180
related: [react-006-usememo-usecallback, react-007-key, react-013-context-render]
---

列表项组件已经用 `React.memo` 包了一层，但在输入框里打字时，每个 `Item` 仍然全部重新渲染：

```jsx
const Item = React.memo(function Item({ data, onSelect }) {
  console.log('Item 渲染')
  return <li onClick={() => onSelect(data.id)}>{data.label}</li>
})

function List({ items }) {
  const [keyword, setKeyword] = useState('')
  return (
    <ul>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      {items.map((it) => (
        // data 每次都是新对象；onSelect 每次都是新函数
        <Item key={it.id} data={{ label: it.label }} onSelect={(id) => handle(id)} />
      ))}
    </ul>
  )
}
```

请问：`memo` 明明包上了，为什么它没生效？该怎么和 `useMemo` / `useCallback` 配合？

## 参考答案

结论：`React.memo` 默认做的是 **props 浅比较（shallow compare）**，只要有任何 prop 的**引用**变了，它就重新渲染。上面代码里 `data={{ label: it.label }}` 和 `onSelect={(id) => handle(id)}` **每次渲染都会创建新的对象 / 函数引用**，浅比较必然判定为「不同」，`memo` 等于白包。

解决办法：把传给子组件的**对象用 `useMemo` 缓存、函数用 `useCallback` 缓存**，让引用稳定下来：

```jsx
const Item = React.memo(function Item({ label, onSelect }) { /* ... */ })

function List({ items }) {
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState(null)

  const handleSelect = useCallback((id) => setSelected(id), []) // 引用稳定

  return (
    <ul>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      {items.map((it) => (
        <Item key={it.id} label={it.label} onSelect={handleSelect} /> // 只传原始值
      ))}
    </ul>
  )
}
```

更简单的做法是**别传新对象**：把 `data` 拆成原始值（`label` 字符串）直接传，浅比较天然相等。

## 原理讲解

**现象**：父组件因为输入框打字频繁重渲染，`React.memo` 的子组件跟着全量重渲染。

**原因**：`React.memo` 只比较 `props`，而且默认是「浅比较」——只比较每个 key 的**引用**是否相同，不递归比较内容。父组件每次渲染产生的新对象 / 数组 / 函数都是全新引用，浅比较直接返回 `false`。

先用纯逻辑把浅比较的判据跑一遍：

```js run
function shallowEqual(a, b) {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every((k) => Object.prototype.hasOwnProperty.call(b, k) && Object.is(a[k], b[k]))
}

const shared = { name: 'Tom' }
console.log(shallowEqual(shared, shared)) // 同一引用
console.log(shallowEqual({ name: 'Tom' }, { name: 'Tom' })) // 值相同、引用不同
console.log(shallowEqual({ user: { name: 'Tom' } }, { user: { name: 'Tom' } })) // 嵌套对象
console.log(shallowEqual([1, 2], [1, 2])) // 数组
console.log(shallowEqual(1, 1)) // 原始值
console.log(shallowEqual([], {})) // 空数组 vs 空对象
```

```text output
true
true
false
true
true
true
```

最后一行 `[]` 与 `{}` 都「没有 key」，浅比较反而判为相等——这正是「浅」的体现：它看的是第一层引用，不关心内容结构。

**怎么修**：三条路径。

| 手段 | 作用 |
| --- | --- |
| 只传原始值 | 浅比较天然相等，最省事 |
| `useMemo` 缓存对象 / 数组 | 依赖不变则引用不变 |
| `useCallback` 缓存函数 | 回调引用稳定 |
| 自定义 `areEqual` | 需要时用深比较或只比关键字段 |

自定义比较函数（`React.memo` 的第二个参数）：

```jsx
const Item = React.memo(
  function Item({ data, onSelect }) { /* ... */ },
  (prev, next) => prev.data.id === next.data.id // 只比 id：其它字段变化就忽略
)
```

用 `areEqual` 要谨慎：一旦比较写得过松，就会「该更新时不更新」，出现界面不刷新的 bug。另外 `React.memo` **只比较 props**，组件的 `state`、`context` 变化它挡不住。

## 追问与易错点

- **`React.memo` 和 `PureComponent` 是什么关系？** 同源思想：都是「用一道比较挡住不必要的渲染」。`memo` 是函数组件的版本，默认行为等价于对 props 做一次浅比较。
- **`useMemo` / `useCallback` 是越多越好吗？** 不是。缓存本身有成本（存闭包、比较依赖），只有「包裹 `memo` 子组件」或「结果被当作 effect 依赖」时才划算，否则属于过度优化。
- **内联 children 也会破坏 `memo` 吗？** 会。`<Memo><span>{x}</span></Memo>` 里的 `children` 是每次新建的 JSX 对象，浅比较同样会失败。
- **`memo` 能挡住 Context 引起的重渲染吗？** 不能。`memo` 只管 props；Context 变化会让消费者组件重渲染，需要在 Provider 的 `value` 上用 `useMemo` 稳定引用。
- **用了 `useMemo` 还是失效？** 常见坑是依赖数组写漏：`useMemo(() => obj, [])` 空依赖只算一次，捕获的闭包值可能已过期，要把真正的依赖写全。
- **打日志发现 `memo` 组件仍渲染两次？** 可能是 StrictMode 开发模式的双渲染，也可能父组件确实传了新引用；开发行为与生产不同，要分清楚。

## 相关题目

- [react-006-usememo-usecallback](/q/react/react-006-usememo-usecallback)
- [react-013-context-render](/q/react/react-013-context-render)
- [react-007-key](/q/react/react-007-key)
