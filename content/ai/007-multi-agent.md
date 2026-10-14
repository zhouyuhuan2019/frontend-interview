---
title: 多智能体（Multi-Agent）协作怎么设计？有哪些常见模式？
subtopic: AI Agent 与工具调用
difficulty: senior
frequency: medium
tags: [Multi-Agent, 编排模式, Supervisor, 角色分工, 协作]
order: 70
related: [ai-006-agent-architecture]
---

面试官：一个 Agent 搞不定的复杂任务，如果让你用多个 Agent 协作完成，你会怎么设计？它们之间怎么通信、怎么分工？

## 参考答案

多智能体不是「越多越好」，而是当任务**可被清晰切分**、或**需要多种专业视角互相校验**时才有价值。核心决策是选编排模式：

| 模式 | 结构 | 适用场景 |
| --- | --- | --- |
| Supervisor / Orchestrator | 一个主管 Agent 分派任务给下属 | 任务可拆、需要统一收口（最常用） |
| Hierarchical | 主管再套主管，多层分派 | 大型复杂流程、组织化分工 |
| Sequential / Pipeline | A → B → C 顺序传递 | 流水线任务，如「写稿 → 翻译 → 校对」 |
| Peer / Debate | 多个对等 Agent 讨论、投票 | 需要多视角校验、降低幻觉 |
| Blackboard | 共享状态区，各 Agent 读写 | 松耦合协作、事件驱动 |

- **首选 Supervisor 模式**：结构清晰、易调试、职责单一，多数业务场景够用。
- **别迷信复杂度**：能用单 Agent + 好工具解决的，就不要上多 Agent——多一层就多一份 token 成本、延迟和不确定性。

## 原理讲解

**Supervisor（主管调度）**是最通用的拓扑：主管不亲自干活，只负责「理解任务 → 拆解 → 路由给合适的 Worker → 汇总结果」，Worker 各自持有专属工具与提示词。

```text
                     ┌─────────────┐
       用户目标  ──▶  │ Supervisor  │  (规划 + 路由 + 汇总)
                     └──────┬──────┘
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ 检索Agent │ │ 计算Agent │ │ 写作Agent │
        │ (RAG工具) │ │ (代码工具) │ │ (风格库) │
        └──────────┘ └──────────┘ └──────────┘
              └────────────┴────────────┘
                           ▼
                    共享的会话状态 / Blackboard
```

**Agent 之间怎么通信？** 主流是**共享消息总线**：所有 Agent 共享一个对话状态（messages），每条消息带 `sender` 字段，Agent 只响应发给自己的消息。这样天然支持顺序、并行、广播三种协作。

**并行分派示例**（主管同时让两个 Worker 干活，再汇总）：

```js run
// Worker：各自独立的「专家」，只认自己的消息
const workers = {
  search: (q) => `[检索] 找到 3 篇关于「${q}」的资料`,
  calc: (q) => `[计算] 已算出与「${q}」相关的关键指标`,
}

// Supervisor：并行分派 -> 汇总（真实场景每步都是一次 LLM 调用）
async function supervisor(task) {
  console.log('Supervisor 决定拆解为: [检索, 计算]')
  const results = await Promise.all([
    Promise.resolve(workers.search(task)),
    Promise.resolve(workers.calc(task)),
  ])
  results.forEach((r) => console.log('收到 Worker 结果:', r))
  return `汇总报告已生成（基于 ${results.length} 个 Worker 输出）`
}

supervisor('2026 年 AI 芯片市场').then((r) => console.log('Supervisor 输出:', r))
```

预期输出：

```text output
Supervisor 决定拆解为: [检索, 计算]
收到 Worker 结果: [检索] 找到 3 篇关于「2026 年 AI 芯片市场」的资料
收到 Worker 结果: [计算] 已算出与「2026 年 AI 芯片市场」相关的关键指标
Supervisor 输出: 汇总报告已生成（基于 2 个 Worker 输出）
```

**通信与状态管理**：所有 Agent 共享一个状态对象（如 LangGraph 的 `StateGraph`），节点是 Agent，边是路由逻辑。这种「有向图」比自由对话更可控——能显式控制谁在什么条件下被激活，也方便中断、回溯、做人工确认。

**Debate（辩论）模式**：让两个 Agent 分别持正反观点、再由 Judge Agent 裁决，可以降低单模型的幻觉与偏见，但成本高、延迟大，适合高风险决策（如内容审核、投资建议）。

## 追问与易错点

- **多 Agent 一定比单 Agent 强吗？** 不一定。协作会放大 token 与延迟成本、引入通信噪声，很多场景单 Agent + 多工具反而更好。
- **Agent 之间怎么避免互相打断/死循环？** 用显式的图/状态机约束路由（只能由 Supervisor 决定下一步），并设最大轮次；自由群聊式协作很容易失控。
- **上下文怎么共享？** 全共享简单但会撑爆上下文；常见做法是共享「摘要 + 关键结论」，每个 Worker 只看与自己相关的部分。
- **怎么降低幻觉？** 用 Debate/评审 Agent 交叉验证、要求 Worker 给出证据来源、关键结论加确定性校验（如代码执行验证）。
- **落地时最先遇到的工程问题？** 可观测性（每步谁说了什么）和幂等（Worker 重试不能产生副作用），需要像分布式系统一样对待。

## 相关题目

- [ai-006-agent-architecture](/q/ai/ai-006-agent-architecture)
