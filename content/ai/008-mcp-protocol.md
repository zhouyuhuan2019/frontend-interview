---
title: MCP（Model Context Protocol）是什么？解决了什么问题？
subtopic: MCP 协议
difficulty: senior
frequency: medium
tags: [MCP, 协议, 工具集成, 上下文, 标准化]
order: 80
related: [ai-005-function-calling]
---

面试官：MCP 你了解吗？它和普通的 Function Calling 有什么不一样？为什么大家都在做 MCP Server？

## 参考答案

- **MCP（Model Context Protocol）是 Anthropic 提出的开放协议，用来标准化「大模型应用 ↔ 外部数据/工具」的连接方式**，可以理解为 AI 世界的「USB-C 接口」。
- **它解决的痛点是 N×M 问题**：以前每个应用要对接每个工具/数据源，就得写 N 个应用 × M 个工具的适配；有了统一协议，只需「每个应用实现 Client、每个工具实现 Server」，复杂度降为 N+M。
- **一句话定位**：Function Calling 定义「模型怎么表达要调工具」，MCP 定义「工具怎么被发现和调用」——后者是前者的标准化封装与分发协议。

| 维度 | Function Calling | MCP |
| --- | --- | --- |
| 层次 | 模型输出格式 | 客户端与外部能力的通信协议 |
| 复用 | 每个应用各写一套 | 一个 Server 被所有 Client 复用 |
| 能力 | 主要是工具 | 工具 + 资源 + 提示模板 |

## 原理讲解

**架构三角**：MCP 有三个角色——**Host**（宿主应用，如 IDE/Agent 产品）、**Client**（Host 内部的连接器，一对一连接 Server）、**Server**（暴露能力的服务方，如文件系统、GitHub、数据库）。

```text
Host（如 AI IDE / Agent 应用）
  └── MCP Client ──(JSON-RPC 2.0)── MCP Server：本地文件系统
  └── MCP Client ──(JSON-RPC 2.0)── MCP Server：GitHub
  └── MCP Client ──(JSON-RPC 2.0)── MCP Server：团队内部数据库
```

**三种核心原语**（Server 能对外提供什么）：

| 原语 | 含义 | 谁触发 |
| --- | --- | --- |
| Tools | 可执行动作（等价于 Function Calling 的工具） | 模型决定调用 |
| Resources | 只读数据/上下文（文件、记录） | 应用或用户选用 |
| Prompts | 预设的提示模板/工作流 | 用户主动选择 |

**通信流程**（以 stdio 本地 Server 为例）：

1. Client 发起 `initialize` 握手，协商协议版本与能力；
2. Client 调 `tools/list` 拿到全部工具定义（这就是 Function Calling 里那份 JSON Schema）；
3. 模型决定调用后，Client 发 `tools/call`，Server 执行并返回结果；
4. 结果作为 observation 回填给模型，继续循环。

一次 `tools/call` 的请求/响应长这样：

```json
// 请求
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": { "name": "read_file", "arguments": { "path": "/tmp/a.txt" } }
}

// 响应
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { "content": [{ "type": "text", "text": "文件内容..." }] }
}
```

**传输方式**：本地进程用 `stdio`（子进程标准输入输出）；远程用 `Streamable HTTP` / `SSE`。前者是当前最主流的使用方式（在 Claude Desktop、Cursor 里配一段 JSON 即可接一个本地 Server）。

**在客户端（如 mcp.json）里的配置**：

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./data"]
    }
  }
}
```

## 追问与易错点

- **MCP 和 Function Calling 是替代关系吗？** 不是。MCP Server 暴露的 Tools 最终仍是转成 Function Calling 交给模型；MCP 让工具的「发现 + 复用 + 分发」标准化了。
- **为什么要有 Resources 而不只用 Tools？** Tools 是「模型主动调」的动作，Resources 是「只读上下文」的数据，语义更清晰、也更适合由 UI 让用户主动挂载（如选中一个文件）。
- **MCP 的安全风险？** Server 能读文件、发请求，权限极大。要最小权限、限制可访问目录、对工具调用做人工确认、防止提示注入诱导越权操作。
- **前端工程师为什么关心 MCP？** 前端要消费 Client 侧的工具列表、渲染工具调用与确认 UI、处理流式输出；很多 AI 产品的「插件市场」本质就是 MCP Server 生态。
- **常见误区？** 把 MCP 当成某个厂商的私有协议。它是开放标准，OpenAI、Google 等也已宣布支持，Server 可跨 Host 复用。

## 相关题目

- [ai-005-function-calling](/q/ai/ai-005-function-calling)
