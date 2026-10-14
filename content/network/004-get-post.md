---
title: GET 与 POST 的区别是什么？
subtopic: HTTP 方法与状态码
difficulty: junior
frequency: high
tags: [HTTP, GET, POST, 幂等性, RESTful]
order: 40
related: [network-003-status-codes]
---

## 参考答案

| 维度 | GET | POST |
| --- | --- | --- |
| 语义 | 获取资源（只读） | 提交数据、创建或触发处理 |
| 参数位置 | 拼在 URL query 上 | 放在请求体 body 中 |
| 缓存 | 默认可被缓存 | 默认不缓存 |
| 幂等性 | 幂等（多次执行效果相同） | 非幂等（重复提交可能产生副作用） |
| 浏览器行为 | 可收藏、回退/刷新无副作用 | 刷新会提示「确认重新提交」 |
| 数据长度 | 受 URL 长度限制（浏览器/服务器实现约束） | 理论上无限制（受服务器配置约束） |
| Content-Type | 无（参数只能 URL 编码） | 支持表单、JSON、二进制等多种类型 |

一句话总结：**两者最大的区别是语义**——GET 是「取」，POST 是「交」，其余差异大多是语义的推论或浏览器/服务器的实现约定。

## 原理讲解

**幂等性**是理解这组区别的主线：GET、PUT、DELETE 都设计成幂等的，所以浏览器才敢对 GET 做缓存、预取、刷新重发；POST 不幂等，重复提交可能创建两条订单，所以浏览器刷新时会弹确认框，支付类接口也要靠「幂等键」防止重复扣款。

关于**参数位置**：GET 的参数在 URL 上，会带来三个现实问题——

1. 会留在浏览器历史、服务器访问日志、Referer 里，**不适合放敏感信息**；
2. 长度受 URL 限制（各浏览器大约 2K~64K 不等，且服务器也有自己的限制）；
3. 只能传输 ASCII，中文等需 URL 编码。

POST 的 body 可以承载任意格式，由 `Content-Type` 声明：

```http
POST /api/user HTTP/1.1
Content-Type: application/json

{"name": "张三", "age": 18}
```

常见的还有 `application/x-www-form-urlencoded`（传统表单）、`multipart/form-data`（文件上传）。

**关于「POST 比 GET 安全」**：这是错觉。两者在 HTTP 下都是明文传输，谁都能抓包看到，真正的安全靠 HTTPS。POST 只是参数不出现在 URL 里，避免了「留在历史记录/日志」这一类泄露，仅此而已。

## 追问与易错点

- **GET 可以带 body 吗？** 规范上没有禁止，但语义未定义，很多服务器、网关、缓存层会直接忽略，实际项目中不要这么用。
- **「POST 会产生两个 TCP 包」对吗？** 这是实现细节而非协议规定：部分浏览器对表单 POST 会先发 header 再发 body（配合 `Expect: 100-continue`）。GET 也可能分包。拿它当「本质区别」是错的。
- **PUT 和 POST 的区别？** PUT 幂等，语义是「完整替换指定资源」；POST 非幂等，语义是「提交处理」。创建资源两者都能用，看接口设计。
- **为什么静态资源用 GET 请求可以被强缓存？** 正因为 GET 语义是只读且幂等，浏览器/CDN 才敢放心缓存副本，这是性能优化的基础。
- **GET 请求被缓存导致数据不更新怎么办？** 给接口加时间戳/随机参数，或响应头设置 `Cache-Control: no-store`。

## 相关题目

- [network-001-http-cache](/q/network/network-001-http-cache)
- [network-003-status-codes](/q/network/network-003-status-codes)
