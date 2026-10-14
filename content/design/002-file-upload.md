---
title: 大文件上传怎么设计（分片/断点续传/秒传）？
subtopic: 请求与状态设计
difficulty: senior
frequency: high
tags: [大文件上传, 分片上传, 断点续传, 秒传, Web Worker]
order: 20
---

面试官：如果让你支持 1~5GB 的大文件上传，要求能断点续传、已上传过的文件秒传，你会怎么设计？

## 参考答案

直接整包 `multipart/form-data` 上传在弱网下几乎不可用：超时、失败后从零再来。标准解法是**分片上传 + 断点续传 + 秒传**三件套。

回答框架：先拆需求 → 再定协议 → 最后讲关键实现与兜底。

1. **拆需求**：大文件 → 网络不可靠、不能一次性放进内存、失败要能恢复。
2. **方案选型**：

| 能力 | 方案 | 关键点 |
| --- | --- | --- |
| 分片上传 | 前端切片（一般 2~5MB/片），逐片或并发上传 | 控制并发数，带分片序号 |
| 秒传 | 上传前算文件 hash，后端比对，已存在直接返回成功 | 全量 hash 或抽样 hash |
| 断点续传 | 上传前问后端「这个文件哪些分片已收到」，跳过已传分片 | 后端要持久化分片记录 |
| 合并 | 所有分片到齐后通知后端合并校验 | 校验整体 hash，防止缺片 |

3. **协议骨架**（三步）：
   - `POST /upload/init`：上报文件名、总大小、文件 hash、分片大小 → 后端返回已上传分片列表（命中秒传则直接返回文件地址）；
   - `POST /upload/chunk`：携带 `hash + index` 逐片上传，前端做并发控制与失败重试；
   - `POST /upload/merge`：通知合并，后端校验后返回最终地址。

## 原理讲解

**切片**用 `Blob.prototype.slice`，是引用式的、不读入内存：

```js
const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB
const chunks = []
for (let start = 0, index = 0; start < file.size; start += CHUNK_SIZE, index++) {
  chunks.push({ index, blob: file.slice(start, start + CHUNK_SIZE) })
}
```

**文件 hash**：全量 MD5/SHA-1 在 JS 主线程算 1GB 文件会卡 UI 几十秒，优化手段：
- 放进 **Web Worker** + `spark-md5` 增量计算，边读边算；
- 或采用**抽样 hash**（首中尾各取 2MB 拼接再 hash），牺牲一点准确率换速度——这是面试加分项。

**并发控制**：分片不能全部一起发（会打满浏览器连接数），用一个固定大小的并发池，失败的分片指数退避重试、超过次数整体失败：

```js
async function uploadWithPool(tasks, limit = 3) {
  const executing = new Set()
  for (const task of tasks) {
    const p = task().finally(() => executing.delete(p))
    executing.add(p)
    if (executing.size >= limit) await Promise.race(executing)
  }
  await Promise.all(executing)
}
```

**进度展示**：每个分片维护已上传字节数，汇总除以总大小，注意重试的分片不能重复累计。

**断点续传的状态**：前端不需要本地存太多状态，刷新后重新走 `init` 接口问后端即可；后端通常把「文件 hash → 已收分片集合」存 Redis 或数据库。

## 追问与易错点

- **分片多大合适？** 太小请求数爆炸（HTTP 开销占比升高），太大单片失败重传成本高、容易超时。经验值 2~5MB，可按网络状况动态调整。
- **文件改名后还能秒传吗？** 能，只要 hash 一致——这也说明秒传必须基于内容 hash 而不是文件名。
- **hash 冲突怎么办？** 抽样 hash 有误判可能，后端合并后应再校验整体 hash 或文件大小；对可靠性要求极高的场景用全量 hash。
- **用户切换网络/页面刷新怎么处理？** 请求层失败自动重试；页面刷新后重新 `init`，靠后端分片记录恢复，正在传的内存中分片会丢，属可接受范围。
- **前端存凭证安全吗？** 上传接口要鉴权（token/签名），否则任何人拿到文件 hash 就能伪造分片、污染存储。

## 相关题目

- [design-001-virtual-scroll](/q/design/design-001-virtual-scroll)
