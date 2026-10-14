---
title: Function Calling / Tool Use 是什么？它是怎么工作的？
subtopic: AI Agent 与工具调用
difficulty: middle
frequency: high
tags: [Function Calling, 工具调用, JSON Schema, 大模型, Tool Use]
order: 50
related: [ai-006-agent-architecture]
---

面试官：你们的 AI 助手能查天气、查订单、读数据库，这些能力是怎么接到大模型上的？模型会自己调用你的接口吗？

## 参考答案

- Function Calling（也叫 Tool Use）的本质是：**你把可用工具的「JSON Schema 说明书」随对话一起发给模型；模型不执行任何代码，只返回「我想调用哪个工具、参数是什么」的结构化 JSON**，真正的执行由你的代码完成。
- 一句话链路：**声明工具 → 模型决策输出 `tool_call` → 你解析参数并执行 → 把结果作为一条 `tool` 消息回填 → 模型基于结果生成最终回答**。
- 核心分工：**模型负责「决策」，你的代码负责「执行」**，两者通过 JSON 契约解耦。模型不会真的联网、不会真的读数据库。

| 角色 | 职责 |
| --- | --- |
| 模型 | 判断是否需要工具、选哪个工具、填充参数 |
| 你的代码 | 定义 Schema、校验参数、真正执行、把结果回填给模型 |

## 原理讲解

一次完整的工具调用分四步：

1. **声明**：请求里带上 `tools` 数组，每项含 `name`、`description`、`parameters`（JSON Schema）。`description` 写得好不好，直接决定模型选不选得对。
2. **决策**：模型输出的 `message` 里若含 `tool_calls`，说明它想调用工具；否则就是普通文本回答。
3. **执行**：你的代码按 `function.name` 找到处理器，解析 `function.arguments`（**注意是 JSON 字符串**），校验后执行。
4. **回填**：把执行结果作为 `role: "tool"` 的消息、带上对应 `tool_call_id` 追加进上下文，再发一次请求，让模型总结成自然语言。

```js run
// 1. 用 JSON Schema 声明工具——这就是给模型看的"说明书"
const tools = [
  {
    name: 'get_weather',
    description: '查询指定城市的实时天气',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: '城市名，如 北京' },
        unit: { type: 'string', enum: ['celsius', 'fahrenheit'] },
      },
      required: ['city'],
    },
  },
]

// 2. 模型返回的 tool_call（此处用假数据模拟模型输出）
const modelReply = {
  role: 'assistant',
  content: null,
  tool_calls: [
    {
      id: 'call_1',
      type: 'function',
      function: { name: 'get_weather', arguments: '{"city":"北京","unit":"celsius"}' },
    },
  ],
}

// 3. 本地注册表：name -> 真正的执行函数
const registry = {
  get_weather: ({ city, unit = 'celsius' }) => `${city} 晴 26°${unit === 'celsius' ? 'C' : 'F'}`,
}

// 4. 校验 + 派发：参数是模型生成的字符串，必须当作不可信输入
function validate(schema, args) {
  for (const key of schema.required ?? []) {
    if (!(key in args)) throw new Error(`缺少必填参数: ${key}`)
  }
  return args
}

function dispatch(toolCall) {
  const tool = tools.find((t) => t.name === toolCall.function.name)
  const args = validate(tool.parameters, JSON.parse(toolCall.function.arguments))
  return registry[tool.name](args)
}

for (const call of modelReply.tool_calls) {
  console.log('模型要调用:', call.function.name)
  console.log('模型给的参数:', call.function.arguments)
  console.log('工具真实返回:', dispatch(call))
}
```

预期输出：

```text output
模型要调用: get_weather
模型给的参数: {"city":"北京","unit":"celsius"}
工具真实返回: 北京 晴 26°C
```

几个工程上必须知道的点：

- **并行工具调用**：模型可在一次回复里返回多个 `tool_calls`（比如同时查两个城市），可以并发执行，再用各自的 `tool_call_id` 一一回填。
- **循环**：回填结果后若模型又要调用工具，就回到第 2 步继续，直到模型给出最终答案——这就是 Agent 的调度循环。
- **开放标准**：OpenAI、Anthropic、Gemini 都提供等价能力，字段命名略有差异（`tool_calls` vs `tool_use`），但语义一致；MCP 则把工具发现与调用标准化了。

## 追问与易错点

- **模型会自己执行函数吗？** 不会。它只输出「调用意图 + 参数」，执行永远在你的后端，这是安全边界。
- **为什么参数一定要校验？** 参数是模型生成的 JSON 字符串，可能缺字段、类型错、甚至带注入内容；直接 `eval` 或直连数据库等于把攻击面交给模型。
- **工具太多选不准怎么办？** 别一次全塞进去——按场景做子集、做工具检索（tool retrieval）、把 `description` 写清楚入参出参。
- **Function Calling 和 RAG 的区别？** RAG 是「检索知识塞进上下文」，Function Calling 是「让模型主动触发一个动作/查询」，前者喂数据、后者给手。
- **一次能返回多个工具调用吗？** 能，支持并行；但要注意有些模型并行能力弱，需按需退化为串行。

## 相关题目

- [ai-006-agent-architecture](/q/ai/ai-006-agent-architecture)
