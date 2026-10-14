---
title: 什么是大语言模型（LLM）？Token、上下文窗口与温度参数分别是什么？
subtopic: LLM 基础概念
difficulty: junior
frequency: high
tags: [LLM, Token, 上下文窗口, 温度参数, 自回归生成]
order: 10
related: [ai-002-prompt-engineering, ai-004-embedding-vector]
---

面试开场常问：你了解大模型吗？从「Token / 上下文窗口 / 温度」这三个概念切入，就能看出你是真用过，而不只是会喊名词。

## 参考答案

**大语言模型（LLM）**：基于 Transformer 架构、在海量文本上预训练出来的**自回归**语言模型。它的核心任务只有一个——**根据已有文本预测下一个 Token**。所以它不是「知识库」，而是一个概率生成器。

| 概念 | 是什么 | 应用层要关注的点 |
| --- | --- | --- |
| Token | 模型处理文本的最小单位，约等于一个词或字片段 | 计费与限流按 Token 计；英文 1 Token≈4 字符，中文约 1 个汉字≈1 Token |
| 上下文窗口 | 单次请求能容纳的最大 Token 数（输入 + 输出） | 超出会被截断或直接报错；越长越慢越贵，多轮对话要自己做滑动窗口或摘要压缩 |
| 温度 temperature | 采样的随机程度，越接近 0 越确定 | 代码、抽取、分类调低（0~0.3）；文案、头脑风暴调高（0.7~1.0） |

一句话：**Token 是计量单位，上下文窗口是「记忆容量」，温度是「发挥的随机程度」。**

## 原理讲解

LLM 生成文本是一个**逐 Token 循环**的过程：

1. 把输入文本切成 Token 序列，每个 Token 查表得到一个向量；
2. 向量经过多层 Transformer 自注意力计算，输出下一个 Token 的概率分布；
3. 按温度等参数从这个分布里**采样**出一个 Token，再拼回输入末尾；
4. 重复 2~3，直到采到结束符或达到最大长度。

温度只作用于第 3 步。它把模型的原始打分（logits）除以温度后再做 softmax：温度越低，分布越尖锐，高分项几乎必被选中；温度越高，分布越平坦，长尾词也有机会被选到。

```js run
// 模型对下一个 Token 的原始打分（logits，越大越倾向）
const logits = [3.0, 2.0, 1.0, 0.5]

function softmax(logits, temperature) {
  const scaled = logits.map((l) => l / temperature)
  const max = Math.max(...scaled)
  const exps = scaled.map((s) => Math.exp(s - max))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

for (const t of [0.5, 1.0, 2.0]) {
  const probs = softmax(logits, t).map((p) => p.toFixed(2))
  console.log(`温度 ${t.toFixed(1)}: ${probs.join('  ')}`)
}
```

```text output
温度 0.5: 0.86  0.12  0.02  0.01
温度 1.0: 0.63  0.23  0.09  0.05
温度 2.0: 0.44  0.27  0.16  0.13
```

可以看到：温度升高后分布被「抹平」，输出更发散、更多样；温度趋近 0 时几乎退化为每次选最高分（贪心解码）。

## 追问与易错点

- **Token 和字符是几比几？** 没有固定值，取决于分词器（如 BPE）。英文大致 1 Token≈4 字符，中文更碎，约 1 汉字≈1 Token；估算成本用经验比例即可，精确值要调分词接口。
- **上下文窗口越大越好吗？** 不是。成本、延迟随长度上升；且存在「中间遗忘」——长上下文中间的信息更容易被忽略，长文档仍应做检索或分段。
- **温度设 0 就一定可复现吗？** 不一定。不同批次、不同硬件下浮点运算仍可能有细微差异，工程上别把它当严格确定性保证。
- **LLM 会「记住」我说的话吗？** 单次对话不会写进参数，只是把历史一起塞进上下文；跨会话持久化要靠外部存储或微调。
- **上下文窗口 = 输出长度吗？** 不是。窗口是输入 + 输出总量，通常还会给输出单独设 `max_tokens` 上限。

## 相关题目

- [ai-002-prompt-engineering](/q/ai/ai-002-prompt-engineering)
- [ai-004-embedding-vector](/q/ai/ai-004-embedding-vector)
