---
title: Context 会导致不必要的重渲染吗？怎么优化？
subtopic: 状态管理与更新
difficulty: middle
frequency: medium
tags: [React, Context, 重渲染, useMemo, 性能优化]
order: 130
related: [react-006-usememo-usecallback, react-011-state-batching-async]
---

下面这个组件里，`Toolbar` 其实只用到了 `theme`，但每次 `user` 变化它也会跟着重渲染。请问：Context 变化时是不是所有消费者都会重渲染？`value` 里明明只有一部分数据变了，该怎么优化？

```jsx
function App() {
  const [user, setUser] = useState(null)
  const [theme, setTheme] = useState('light')

  // 每次 App 渲染，value 都是新对象
  return (
    <UserContext.Provider value={{ user, theme }}>
      <Toolbar /> {/* 只用到 theme，却因 user 变化也重渲染 */}
    </UserContext.Provider>
  )
}
```

## 参考答案

结论：**会**。Context 的 `value` 用 `Object.is` 比较**引用**。上面 `value={{ user, theme }}` 每次 `App` 渲染都会新建一个对象，引用必然不同，于是**所有消费该 Context 的组件都会重渲染**，哪怕它只用了其中一个字段，或者根本没用到变化的那部分。

优化三招：

1. **`useMemo` 稳定引用**：把 `value` 缓存起来，依赖真正的字段；
2. **拆分 Context**：把变化频率不同的数据拆到不同 Context，消费方各取所需；
3. **状态下沉 / 组合**：把不依赖变化的子树用 `children` 传进去，或把 Provider 下移到真正需要的位置。

```jsx
// 招 1：内容不变则引用不变
const value = useMemo(() => ({ user, theme }), [user, theme])
<UserContext.Provider value={value}>
  <Toolbar />
</UserContext.Provider>

// 招 2：按变化频率拆分
<UserContext.Provider value={useMemo(() => ({ user }), [user])}>
  <ThemeContext.Provider value={theme}>
    <Toolbar />
  </ThemeContext.Provider>
</UserContext.Provider>

// 招 3：把不受影响的节点当 children 传进去，避免中间层重渲染
function Layout({ children }) {
  return <div className="layout">{children}</div>
}
```

## 原理讲解

**现象**：只改了 `theme`，却连带让只关心 `user` 的组件也重渲染了。

**原因**：Context 在消费者侧是靠**引用比较订阅**的。Provider 传下来的对象只要是**同一次渲染里新造出来的**，即使内容一模一样，React 也会判定「变了」，然后通知所有 `useContext` 的组件更新。这就是上面 `value={{ user, theme }}` 的问题 —— 它每次渲染都是新对象。

用一段纯逻辑模拟这套「引用比较」的通知机制：

```js run
// 模拟 Context：value 用 Object.is 做引用比较，相同则不通知消费者
function createContext() {
  return { current: undefined, subscribers: new Set() }
}
const ThemeContext = createContext()

let renders = 0
ThemeContext.subscribers.add(() => {
  renders++ // 相当于一个订阅了 Context 的组件重渲染
})

function publishValue(value) {
  if (Object.is(ThemeContext.current, value)) return // 引用相同 → 不通知
  ThemeContext.current = value
  ThemeContext.subscribers.forEach((fn) => fn())
}

// 未记忆化：内容一样，但每次都是新对象，引用不同 → 又通知一次
publishValue({ theme: 'dark' })
publishValue({ theme: 'dark' })
console.log('未记忆化，消费者渲染次数 =', renders)

// 记忆化后：值不变时复用同一个引用 → 不再通知
renders = 0
const stable = { theme: 'dark' }
publishValue(stable)
publishValue(stable)
console.log('记忆化后，消费者渲染次数 =', renders)
```

```text output
未记忆化，消费者渲染次数 = 2
记忆化后，消费者渲染次数 = 1
```

**解决方案**：

- `useMemo(() => ({ user, theme }), [user, theme])`：只有当真正的字段变化时才产生新引用；
- 按「变化频率」拆 Context：低频的（如 `theme`、`locale`）和高频的（如实时数据）分开，避免「一颗老鼠屎坏了一锅汤」；
- 组合（`children`）技巧：`<Provider>` 变化时，作为 `children` 传入的 React 元素引用不变，React 会跳过它们的重渲染 —— 这正是「状态下沉」的常见落地方式。

另外要记住：**`React.memo` 拦不住 Context 变化引发的重渲染**。组件一旦 `useContext`，Context 值变化就会强制它更新，memo 的浅比较不生效。

## 追问与易错点

- **`Context` 变化是「强制」重渲染吗？** 是。订阅了该 Context 的组件，只要 value 引用变了就必须重渲染，无法用 memo 跳过。
- **`value` 传原始值也需要 useMemo 吗？** 不需要。`value={theme}` 传的就是字符串，比较天然稳定；只有传对象 / 数组 / 函数时才需要。
- **拆得越细越好吗？** 不是。Context 太多会增加嵌套和心智负担；按「更新频率 + 使用群体」拆，够用即可。
- **能用外部状态库替代 Context 吗？** 可以。Zustand、Jotai 等提供了「选择器订阅」，能只订阅某个字段的变化，天然规避整体重渲染。
- **`useContextSelector` 有什么问题？** 它是社区方案（不是 React 内置 Hook），实现有成本且需谨慎使用；优先考虑拆分 + `useMemo`。

## 相关题目

- [react-006-usememo-usecallback](/q/react/react-006-usememo-usecallback)
- [react-011-state-batching-async](/q/react/react-011-state-batching-async)
