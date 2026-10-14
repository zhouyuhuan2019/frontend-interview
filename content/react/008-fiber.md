---
title: Fiber 架构是什么？为什么需要 Fiber？
subtopic: Fiber 与调和
difficulty: senior
frequency: medium
tags: [React, Fiber, 并发渲染, 时间切片, 调度]
order: 80
---

## 参考答案

Fiber 是 React 16 重写的**协调引擎（reconciler）架构**：每个组件 / DOM 元素对应一个 **Fiber 节点**，它既是虚拟 DOM 的单元，也是一个**可中断的工作单元**。

为什么需要它——旧架构的痛点：

- React 15 用**递归**方式遍历虚拟 DOM 树做 Diff，一旦开始不可中断；
- 组件树大时，一次更新要占用主线程几百毫秒，期间无法响应输入、动画掉帧，页面「卡死」。

Fiber 的解法：把渲染工作拆成一个个小单元，做到三件事——**可中断、可恢复、有优先级**。

| 维度 | React 15（Stack） | React 16+（Fiber） |
| --- | --- | --- |
| 遍历方式 | 递归调用栈，不可中断 | 链表 + 循环，可中断恢复 |
| 调度 | 同步一口气做完 | 时间切片，分片执行 |
| 优先级 | 无 | 用户输入等高优任务可插队 |

## 原理讲解

Fiber 节点用**链表**而非纯树结构组织，使遍历可以从任意节点暂停和继续：

```text
每个 Fiber 节点关键字段：
- return / child / sibling  ：构成可遍历的链表结构（父 / 第一个子 / 下一个兄弟）
- alternate                 ：指向另一棵树上的自己（双缓存）
- memoizedState             ：函数组件的 Hooks 链表头
- lanes                     ：本节点的更新优先级
```

**双缓存机制**：内存中同时存在两棵树——

- `current` 树：对应屏幕上已渲染的内容；
- `workInProgress` 树：正在后台构建的新树。

渲染完成后，把指针一切换，新树变成 current。这样中途放弃也不影响界面。

**两个阶段**：

```text
render 阶段（可中断）：
  遍历 Fiber 树、执行组件函数、Diff、标记需要变更的节点（副作用标记）
  —— 可以被高优任务打断，之后从断点继续

commit 阶段（不可中断，同步执行）：
  把标记的变更一次性提交到 DOM，执行 useLayoutEffect、ref 挂载等
```

React 18 基于 Fiber 的调度能力开放了**并发特性**：`useTransition`（把更新标记为低优先级，可被打断）、`Suspense`（异步挂起与恢复）。

调度上 React 没有用 `requestIdleCallback`（兼容性与触发频率问题），而是用 `MessageChannel` 自己实现了 Scheduler，按 `lanes` 优先级模型安排任务。

## 追问与易错点

- **Fiber 让应用变快了吗？** 单次更新不一定更快，甚至略有开销；它提升的是**响应性**——高优任务不被长渲染阻塞，体感更流畅。
- **为什么 render 阶段能中断而 commit 不能？** commit 要操作真实 DOM，半途而废会让界面处于不一致状态；render 只是纯计算，可以随时丢弃重来。
- **并发渲染下 render 可能执行多次？** 是的，被中断后可能从头再来，所以 render 阶段（组件函数体）必须保持纯净，不能写副作用。
- **Fiber 与 Hooks 有什么关系？** 函数组件的 Hooks 状态就挂在 Fiber 节点的 `memoizedState` 链表上，Hooks 的顺序规则由此而来。
- **时间切片是怎么让出主线程的？** Scheduler 每执行一个 Fiber 工作单元就检查剩余时间（约 5ms 一帧预算），时间不够就通过 MessageChannel 让出，等下一帧继续。

## 相关题目

- [react-004-hooks-rules](/q/react/react-004-hooks-rules)
- [react-007-key](/q/react/react-007-key)
