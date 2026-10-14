---
title: 前端如何实现 AI 对话界面（流式渲染、打字机效果、Markdown 渲染）？
subtopic: 前端 AI 集成
difficulty: middle
frequency: medium
tags: [流式渲染, 打字机效果, Markdown, 虚拟列表, 对话状态]
order: 100
related: [ai-009-streaming-sse, design-001-virtual-scroll]
---

面试官让你做一个类 ChatGPT 的对话框：后端用 SSE 推 token，前端要边收边渲染 Markdown。你会怎么设计？

## 参考答案

把界面拆成三层，问题就清晰了：**数据层（消息模型）→ 渲染层（增量更新）→ 体验层（打字机、滚动、性能）**。

| 挑战 | 做法 | 关键点 |
| --- | --- | --- |
| 消息状态 | `messages` 数组，最后一条带 `streaming` 状态 | 区分 `idle / streaming / done` |
| 增量更新 | 把 `delta` 追加到末条 `content` | 用 `shallowRef`/不可变替代，避免大字符串深度响应 |
| Markdown | markdown-it + DOMPurify，流式中间态容错 | 未闭合的 ``` / `**` 要能渲染 |
| 打字机 | 队列 + 定时消费，生产与消费解耦 | 用 `requestAnimationFrame` 平滑，别一次性 setState |
| 自动滚动 | 只有用户贴底时才跟随 | 否则显示「回到最新」按钮 |
| 长对话性能 | 虚拟列表 + 流式期间合并渲染 | 只重渲染最后一条消息 |

一句话：**流式数据是「生产快、消费稳」，用一个队列/缓冲把抖动吸收掉，UI 按固定节奏消费。**

## 原理讲解

**1. 消息数据模型**

```ts
type Role = 'user' | 'assistant' | 'system'
interface ChatMessage {
  id: string
  role: Role
  content: string
  status?: 'streaming' | 'done' | 'error'
}
```

生成开始时先插入一条空的 assistant 消息（`status: 'streaming'`），每收到一个 `delta` 就 `content += delta`，收到 `[DONE]` 后置为 `done`、把正文交给 Markdown 渲染。

**2. 增量更新为什么容易卡**

如果 `content` 是深度响应的大字符串，每来一个 token 都触发一次整棵子树 diff，几百个 token 就是几百次渲染。做法：

- Vue 用 `shallowRef` 存消息列表，或只让「末条消息」参与依赖收集；
- React 用不可变更新 + `memo` 包住历史消息，确保只重渲染最后一条；
- 流式期间对渲染**节流合并**（如每 30~60ms 才 flush 一次），让 DOM 更新频率与刷新率对齐，而不是与 token 频率对齐。

**3. 打字机效果（队列模型）**

后端 token 到达是不均匀的（有时一次来一大段），直接 append 会「一顿一顿」。加一个消费队列，生产端只管入队，消费端按固定节奏出字：

```js run
// 生产者：不均匀到达的增量文本（真实场景来自流式接口）
const incoming = ['你', '好，', '世界']

// 队列吸收抖动，消费端按固定节奏逐字吐出（真机由 requestAnimationFrame 驱动）
let pending = incoming.join('')
let shown = ''
while (pending.length > 0) {
  shown += pending[0]
  pending = pending.slice(1)
  console.log(shown)
}
```

```text output
你
你好
你好，
你好，世
你好，世界
```

**4. Markdown 流式渲染的坑**

- 流式中间态是「半截 Markdown」：代码围栏只有一个 ```、粗体只有 `**` 没闭合。渲染器要**容错**（把未闭合的当普通文本，或先补全再渲染），否则会闪烁、错位；
- 代码高亮（Shiki / highlight.js）通常**异步**，流式期间反复整体高亮很贵 → 只在 `done` 后高亮，流式中用等宽纯文本展示；
- **AI 输出必须消毒**：LLM 返回的文本可能被提示注入塞入 `<img src=x onerror=...>`，要用 `DOMPurify` 过滤后再 `innerHTML`（Vue 的 `v-html` / React 的 `dangerouslySetInnerHTML`）。

**5. 自动滚动**

判断用户是否贴底：`scrollHeight - scrollTop - clientHeight < 阈值`。只有贴底时才 `scrollIntoView` 跟随，用户上滑阅读历史时不要强行拉回，改显示「回到最新」按钮。

## 追问与易错点

- **为什么流式渲染要节流？** token 每秒可达几十上百个，每个都触发渲染会打满主线程；按帧（16ms）或 30~60ms 合并，视觉上仍是连续的。
- **Markdown 为什么不在服务端渲染？** 前端要边流边渲染；也要注意渲染频率，避免每来一个字符就整段重解析。
- **流式时用户点了「停止」怎么办？** 用 `AbortController` 中断 fetch，把当前半截内容标记为 `done`，别丢掉已生成部分。
- **长对话为什么会卡？** 消息列表越来越长，整棵子树 diff 成本线性上升；用虚拟列表（只渲染视口内消息）+ 历史消息 `memo`。
- **打字机效果一定要做吗？** 不是。若后端是真流式，逐 token append 本身就有打字机感；打字机队列主要用于「后端一次性返回、想伪装流式」或平滑抖动。

## 相关题目

- [ai-009-streaming-sse](/q/ai/ai-009-streaming-sse)
- [design-001-virtual-scroll](/q/design/design-001-virtual-scroll)
