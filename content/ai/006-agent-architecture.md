---
title: AI Agent 怎么设计？Planning / Memory / Tools 循环是什么？
subtopic: AI Agent 与工具调用
difficulty: senior
frequency: high
tags: [AI Agent, 规划循环, 记忆, ReAct, 工具调用]
order: 60
related: [ai-005-function-calling, ai-007-multi-agent]
---

面试官：让你设计一个能查天气、读数据库、还能多步推理的 AI 助手，你会怎么搭？它和「直接调一次大模型」差别在哪？

## 参考答案

一个 Agent 的最小闭环是 **感知 → 规划 → 行动 → 观察 → 再规划**，落到工程上是三件套：

| 能力 | 作用 | 常见实现 |
| --- | --- | --- |
| Planning（规划） | 把目标拆成可执行步骤 | ReAct、Plan-and-Execute、任务分解 |
| Memory（记忆） | 记住上下文与历史结论 | 短期=对话上下文，长期=向量库/摘要 |
| Tools（工具） | 与外部世界交互 | Function Calling / MCP 工具 |

- **与单次调用的区别**：单次调用是「一问一答」；Agent 是「让模型拿到工具结果后再决策」的**多轮循环**，直到完成任务或触发终止条件。
- **核心循环**：`while not done: 模型推理 → 若想调工具就执行 → 结果回填上下文 → 继续推理`。
- **必须有的护栏**：最大步数 / 超时（防死循环）、工具权限与参数校验、人工确认高风险动作。

## 原理讲解

主流的 **ReAct** 范式把每轮推理拆成 `Thought → Action → Observation`：模型先思考，再决定动作，执行结果作为观察回填。它与 Function Calling 是同一套东西的两种表述——Function Calling 是「机器可读的动作」，ReAct 是「带自然语言思考的动作」。

一个 Agent 循环的骨架（生产环境里 `fakeLLM` 换成一次真实的 LLM API 调用）：

```js run
// 可用工具集：名字 -> 执行函数
const tools = {
  get_weather: ({ city }) => `${city}: 晴, 26°C`,
}

// 假模型：根据已有观察决定下一步（真实场景这里发 HTTP 请求给大模型）
function fakeLLM(messages) {
  const observed = messages.some((m) => m.role === 'tool')
  if (!observed) {
    // 还缺信息 -> 决定调用工具
    return { thought: '要知道北京天气，先查一下', tool: 'get_weather', args: { city: '北京' } }
  }
  const last = messages.filter((m) => m.role === 'tool').pop()
  return { thought: '信息够了', final: `北京当前是「${last.content}」，适合出门。` }
}

// Agent 调度循环：推理 -> 行动 -> 观察 -> 再推理
function runAgent(question, maxSteps = 5) {
  const messages = [{ role: 'user', content: question }]
  for (let step = 1; step <= maxSteps; step++) {
    const decision = fakeLLM(messages)
    if (decision.tool) {
      console.log(`[step ${step}] Thought: ${decision.thought}`)
      console.log(`[step ${step}] Action: ${decision.tool}(${JSON.stringify(decision.args)})`)
      const result = tools[decision.tool](decision.args)
      console.log(`[step ${step}] Observation: ${result}`)
      messages.push({ role: 'tool', content: result }) // 结果回填
    } else {
      console.log(`[step ${step}] Final Answer: ${decision.final}`)
      return decision.final
    }
  }
  return '达到最大步数，终止'
}

runAgent('北京今天适合出门吗？')
```

预期输出：

```text output
[step 1] Thought: 要知道北京天气，先查一下
[step 1] Action: get_weather({"city":"北京"})
[step 1] Observation: 北京: 晴, 26°C
[step 2] Final Answer: 北京当前是「北京: 晴, 26°C」，适合出门。
```

关键设计点：

- **规划策略**：`ReAct` 边想边做、灵活但步数多；`Plan-and-Execute` 先出完整计划再逐步执行、可控但计划可能过时；`Reflection` 让模型自评结果并重试。
- **记忆分层**：短期记忆就是 messages 数组（成本随轮数增长，要截断/摘要）；长期记忆用向量库检索相关经验，或用结构化存储存事实。
- **上下文管理**：Agent 很容易把上下文撑爆，需要滑窗、摘要、把长工具输出裁剪后再回填。
- **可观测性**：每一步的 Thought/Action/Observation 都要能日志追踪，否则线上出问题无法定位（这就是 LangSmith 之类的价值）。

## 追问与易错点

- **Agent 最大的坑是什么？** 死循环与任务发散。必须有最大步数、超时、以及「同一动作重复 N 次就终止」的检测。
- **ReAct 和 Plan-and-Execute 怎么选？** 环境不确定、需要随时应变选 ReAct；步骤固定、成本敏感选 Plan-and-Execute。
- **记忆为什么不能无限塞上下文？** token 成本线性上升、超出窗口会截断、无关信息还会干扰决策（lost in the middle）。
- **工具调用失败怎么办？** 把错误信息也作为 observation 回填，让模型决定重试或换参数，而不是直接把异常抛给用户。
- **前端侧要做什么？** 渲染过程中的思考/工具调用状态、流式输出、把「需要人工确认」的动作做成 UI 交互（Human-in-the-loop）。

## 相关题目

- [ai-005-function-calling](/q/ai/ai-005-function-calling)
- [ai-007-multi-agent](/q/ai/ai-007-multi-agent)
