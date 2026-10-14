---
title: 提示词工程有哪些核心原则？Few-shot 与 CoT 怎么用？
subtopic: 提示词工程
difficulty: junior
frequency: high
tags: [提示工程, Few-shot, CoT, 系统提示, 结构化输出]
order: 20
related: [ai-001-llm-basics, ai-003-rag]
---

面试官想确认你调过真实模型，而不只是会套模板。回答时先说原则，再落到 Few-shot 与 CoT。

## 参考答案

提示词工程的核心，是把「你想要什么」表达得**无歧义、可执行、可校验**。五条原则：

1. **给角色与目标**：用 system 消息设定身份和职责，缩小模型的「默认语气」范围；
2. **指令要具体**：说清输入、输出与边界，别写「帮我写好一点」这种主观描述；
3. **提供上下文与示例**：把相关资料塞进去（这就是 RAG 的雏形），并用示例示范格式；
4. **约束输出格式**：明确要 JSON / Markdown / 表格，最好给出 schema 或字段说明；
5. **复杂任务先拆解**：让模型分步推理，而不是一步到位。

| 技术 | 做法 | 适用场景 |
| --- | --- | --- |
| Zero-shot | 只给指令，不给示例 | 通用、格式简单的任务 |
| Few-shot | 给 2~5 个「输入 → 输出」示例 | 格式特殊、需统一风格或分类标签 |
| CoT（思维链） | 让模型先推理再给结论 | 数学、逻辑、多步决策 |
| 结构化输出 | 约定 JSON schema | 结果要交给程序消费时 |

一句话：**Few-shot 教「怎么答」，CoT 教「怎么想」，结构化输出保证「能被程序用」。**

## 原理讲解

调用 LLM 的本质是往一个「消息数组」里塞内容，消息分三种角色：

- `system`：系统级设定（角色、规则、约束），指令优先级最高；
- `user`：用户输入；
- `assistant`：模型的历史回复，Few-shot 的示例就放在这里。

所谓「写提示词」就是**拼接这个消息数组**。下面用 JS 模拟模板拼装过程：

```js run
function buildMessages({ role, context, examples = [], question }) {
  const system = [role, `上下文：${context}`, '约束：只输出 JSON，不要多余解释。'].join('\n')
  const fewShot = examples.flatMap((ex) => [
    { role: 'user', content: ex.input },
    { role: 'assistant', content: ex.output },
  ])
  return [
    { role: 'system', content: system },
    ...fewShot,
    { role: 'user', content: question },
  ]
}

const messages = buildMessages({
  role: '你是一个把自然语言解析成结构化数据的助手。',
  context: '用户可能用口语描述一个会议。',
  examples: [
    { input: '明天下午三点和张总开会', output: '{"time":"15:00","topic":"开会"}' },
  ],
  question: '周五上午十点做项目复盘',
})

console.log(messages.map((m) => `${m.role.padEnd(9)}| ${m.content}`).join('\n'))
```

```text output
system   | 你是一个把自然语言解析成结构化数据的助手。
上下文：用户可能用口语描述一个会议。
约束：只输出 JSON，不要多余解释。
user     | 明天下午三点和张总开会
assistant| {"time":"15:00","topic":"开会"}
user     | 周五上午十点做项目复盘
```

**CoT 为什么有效？** 模型逐 Token 生成，中间推理步骤会变成新的上下文，相当于给它「草稿纸」和更多计算步数，从而减少一步到位的跳步错误。但要注意：自带「思考」能力的新一代推理模型，再手动加「一步步思考」往往多余甚至有害，应按模型特性取舍。

## 追问与易错点

- **Few-shot 示例越多越好吗？** 不是。示例占用上下文和成本，3~5 个覆盖边界的高质量示例通常足够；示例写错还会带偏模型。
- **CoT 什么时候用？** 数学、逻辑、复杂判断时用；简单抽取任务加 CoT 只会徒增延迟和 Token 消耗。
- **system 和 user 区别大吗？** 部分模型对 system 有更高指令优先级，也更难被 user 内容覆盖；关键约束放 system 更稳。
- **提示词写死在前端安全吗？** 不安全。它会泄漏业务逻辑和防护规则，敏感规则应放服务端。
- **「你是一个资深专家」真的有用吗？** 影响有限。别指望角色扮演提升事实准确率，事实性主要靠 RAG 和工具调用。

## 相关题目

- [ai-001-llm-basics](/q/ai/ai-001-llm-basics)
- [ai-003-rag](/q/ai/ai-003-rag)
