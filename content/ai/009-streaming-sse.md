---
title: 大模型流式输出怎么实现？SSE 与 WebSocket 怎么选？
subtopic: 流式渲染与 SSE
difficulty: middle
frequency: high
tags: [SSE, 流式输出, WebSocket, 大模型, 长连接]
order: 90
related: [ai-010-ai-chat-ui, network-006-http2-http3]
---

产品要求聊天框里的回复像 ChatGPT 一样「一个字一个字」冒出来，而不是等整段生成完再显示。你会怎么实现？SSE 和 WebSocket 该选哪个？

## 参考答案

结论先行：**大模型流式输出首选 SSE（Server-Sent Events）**——它的需求形态是「服务端单向把增量 token 推给客户端」，而这正是 SSE 的设计目标；WebSocket 的双向能力在这里是浪费。

| 维度 | SSE | WebSocket |
| --- | --- | --- |
| 底层 | 普通 HTTP + `text/event-stream` | 独立 `ws://` 协议，需 HTTP 101 Upgrade |
| 方向 | 单向（服务端 → 客户端） | 全双工双向 |
| 自动重连 | `EventSource` 内置，带 `Last-Event-ID` 续传 | 需自己实现心跳与重连 |
| 消息格式 | 纯文本，`data:` 行 | 二进制/文本帧 |
| 门槛 | 低，走标准 HTTP 基础设施 | 高，网关/代理需支持长连接 |
| 典型场景 | LLM 流式回答、通知推送 | 实时协作、IM、在线游戏 |

一个前端常见误区：**调 LLM 一般不用 `EventSource`**，而是用 `fetch` + `ReadableStream` 手动解析 SSE。原因见下文。

## 原理讲解

SSE 的协议很朴素：响应头是 `Content-Type: text/event-stream`，服务端把每条消息写成若干 `data:` 行，**用空行（`\n\n`）分隔事件**，文本流随便怎么切：

```text
data: {"id":1,"delta":"你"}
data: {"id":1,"delta":"好"}

data: [DONE]

```

为什么选 SSE 而不是 WebSocket：

1. **需求就是单向的**：用户发完消息后，接下来只有服务端持续产 token，客户端没有实时上行数据；
2. **复用 HTTP 基建**：鉴权、网关、HTTP/2 多路复用、CDN、日志都能直接复用，WebSocket 常被企业代理拦截；
3. **自动重连成本低**：SSE 断线后浏览器按 `retry:` 间隔自动重连，还能用 `Last-Event-ID` 让服务端从断点续推。

那为什么实际产品多用 `fetch` 解析而不是 `EventSource`？因为 `EventSource` 只能发 **GET**，无法携带请求体：

- LLM 请求需要 **POST**（消息列表放在 body 里）；
- 需要自定义头（`Authorization` 等）；
- 需要传 `AbortController.signal` 支持「停止生成」。

所以主流写法是 `fetch` 拿到 `response.body`，用 `getReader()` 边读边解析：

```ts
const res = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ messages }),
  signal: controller.signal,   // 支持中断
})

const reader = res.body!.getReader()
const decoder = new TextDecoder()
let buffer = ''

while (true) {
  const { value, done } = await reader.read()
  if (done) break
  buffer += decoder.decode(value, { stream: true })  // stream:true 处理多字节字符被截断
  const events = buffer.split('\n\n')
  buffer = events.pop() ?? ''                       // 末尾可能是不完整片段，留给下一轮
  for (const evt of events) {
    const line = evt.trim()
    if (!line.startsWith('data:')) continue
    const payload = line.slice(5).trim()
    if (payload === '[DONE]') return
    const { delta } = JSON.parse(payload)
    appendToMessage(delta)                          // 增量更新 UI
  }
}
```

**分片处理的三个关键点**：

1. **缓冲区累积**：网络推来的字节可能在任何位置切断（甚至切断一个多字节汉字、切断半个 JSON），必须用 `buffer` 拼接后再按 `\n\n` 切；
2. **留尾**：`split` 后最后一段大概率不完整，要 `pop` 出来留给下一轮；
3. **TextDecoder 用 `{ stream: true }`**：否则 UTF-8 多字节字符被切开时会解码出乱码（`�`）。

下面用一段纯函数演示这套「缓冲 + 切分 + 解析」的分片器：

```js run
// 模拟服务端按 SSE 推送的字节流，分片边界故意切在 JSON 与汉字中间
const chunks = [
  'data: {"id":1,"delta":"你',
  '好，世',
  '界"}\n\n',
  'data: {"id":1,"delta":"!"}\n\n',
  'data: [DONE]\n\n'
]

let buffer = ''
function feed(chunk) {
  buffer += chunk
  const events = buffer.split('\n\n')
  buffer = events.pop()   // 最后一段可能不完整，留到下次
  for (const raw of events) {
    const line = raw.trim()
    if (!line.startsWith('data:')) continue
    const payload = line.slice(5).trim()
    if (payload === '[DONE]') { console.log('--- 流结束 ---'); return }
    console.log('增量片段: ' + JSON.parse(payload).delta)
  }
}

chunks.forEach(feed)
```

```text output
增量片段: 你好，世界
增量片段: !
--- 流结束 ---
```

渲染侧只要把每次拿到的 `delta` 追加到最后一条消息的 `content` 上，就得到了「打字机」效果。

## 追问与易错点

- **SSE 能双向通信吗？** 不能，纯单向。若要「边生成边插话打断」，才需要 WebSocket，或前端用 `AbortController` 断掉再重发。
- **为什么不直接轮询？** 轮询延迟高且大量空请求浪费带宽；流式输出要求首 token 尽快到达，轮询做不到。
- **`[DONE]` 是协议标准吗？** 不是，是 OpenAI 自定的哨兵值；也可靠 `finish_reason` 判断结束，别硬编码一种。
- **断线了怎么续？** SSE 的 `Last-Event-ID` 机制：每条消息带 `id:`，浏览器重连时带上最后收到的 id，服务端从该位置续推。
- **多字节字符会乱码吗？** 会，如果直接 `decoder.decode(value)` 而不带 `{ stream: true }`，一个汉字被切到两个 chunk 时就会出 `�`。

## 相关题目

- [ai-010-ai-chat-ui](/q/ai/ai-010-ai-chat-ui)
- [network-006-http2-http3](/q/network/network-006-http2-http3)
