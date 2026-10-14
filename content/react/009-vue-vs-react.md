---
title: React 与 Vue 的核心差异有哪些？
subtopic: 与 Vue 的对比
difficulty: middle
frequency: high
tags: [React, Vue, 响应式, 虚拟DOM, 框架对比]
order: 90
---

## 参考答案

最核心的差异在**更新心智**：React 是「数据变了就重新渲染整棵组件子树，靠 Diff 找出差异」；Vue 是「响应式系统精确追踪依赖，数据变了直接更新用到它的组件」。

| 维度 | React | Vue |
| --- | --- | --- |
| 定位 | UI 库，路由 / 状态靠生态 | 渐进式框架，官方全家桶 |
| 数据范式 | 不可变数据，`setState` 触发更新 | 响应式代理（Proxy），直接修改触发更新 |
| 更新粒度 | 组件级重渲染 + Diff，需手动优化 | 依赖追踪精确到组件，编译时进一步优化 |
| 视图表达 | JSX，一切用 JS 表达 | SFC 模板（指令）+ 可选 JSX |
| 逻辑复用 | Hooks | 组合式 API（Composables） |
| 性能优化 | 手动：`memo` / `useMemo` / `useCallback` | 自动为主：依赖追踪 + 编译优化 |
| 样式方案 | CSS-in-JS / Modules，生态自选 | SFC 内置 scoped style |

## 原理讲解

**响应式 vs 显式更新**：

- Vue 3 用 `Proxy` 代理数据，渲染时记录「谁读了哪些属性」（依赖收集），属性变化时精确通知对应的组件重新渲染，开发者只管改数据；
- React 的数据是普通 JS 值，必须通过 `setState` 显式通知，且默认父组件渲染会带动所有子组件渲染，优化靠浅比较（`React.memo`），所以才有 `useMemo` / `useCallback` 三件套。

**编译时优化的差距**：

Vue 的模板在编译期就能分析出哪些部分是静态的：

```text
- 静态提升：纯静态节点移出渲染函数，跳过 Diff
- PatchFlag：动态节点打上标记（只有 text 动态 / 只有 class 动态）
- Block Tree：按动态节点收集，Diff 时跳过整块静态子树
```

所以 Vue 也有虚拟 DOM，但 Diff 工作量小得多。React 的 JSX 太灵活，编译期难以静态分析，传统上靠运行时 Diff + 手动记忆化；React 19 的 **React Compiler** 正在把自动记忆化补回来，两者思路在互相靠近。

**Hooks vs 组合式 API**：

```jsx
// React：函数每次渲染重新执行，靠调用顺序 + 闭包
const [count, setCount] = useState(0)
useEffect(() => { document.title = count }, [count])

// Vue：setup 只执行一次，响应式引用持续生效
const count = ref(0)
watchEffect(() => { document.title = count.value })
```

由此衍生出经典差异：React 有闭包陷阱（stale closure）、要维护依赖数组；Vue 没有闭包陷阱，但要区分 `ref` 的 `.value` 和解构丢响应性的问题。

## 追问与易错点

- **「Vue 不需要虚拟 DOM」对吗？** 不对。Vue 3 仍基于虚拟 DOM，只是编译优化大幅减少了 Diff 范围；真正抛弃虚拟 DOM 的是 Svelte。
- **React 的不可变数据有什么好处？** 变化检测只需引用比较，时间旅行、纯函数推理更容易；代价是要写展开运算符 / immer。
- **为什么 React 需要 key 而 Vue 的 `v-for` 也要 key？** 两者 Diff 原理相通，key 都是节点身份标识，最佳实践一致。
- **团队选型怎么答？** 大型复杂交互、跨端（React Native）、生态灵活性选 React；追求上手快、模板约束强、中后台快速交付选 Vue。更稳妥的回答是结合团队储备与业务场景，而非框架优劣。
- **两者都在向对方学什么？** React 学编译时优化（React Compiler），Vue 提供 JSX / 渲染函数保留灵活性，底层理念逐渐趋同。

## 相关题目

- [react-002-closure-useref](/q/react/react-002-closure-useref)
- [react-006-usememo-usecallback](/q/react/react-006-usememo-usecallback)
