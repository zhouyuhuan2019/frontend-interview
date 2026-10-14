---
title: 强缓存与协商缓存的区别？一次刷新会走哪种缓存？
subtopic: 强缓存与协商缓存
difficulty: middle
frequency: high
tags: [HTTP, 缓存, Cache-Control, ETag, 304]
order: 10
---

## 参考答案

| 类型 | 判定方 | 命中结果 | 相关头 |
| --- | --- | --- | --- |
| 强缓存 | 浏览器（不发请求） | 直接使用本地副本 | `Cache-Control`、`Expires` |
| 协商缓存 | 服务器（发请求验证） | 未变返回 304，变了返回 200 | `Last-Modified` / `If-Modified-Since`、`ETag` / `If-None-Match` |

**优先级**：先判断强缓存，未命中再走协商缓存。

服务器返回时设置：

```text
Cache-Control: max-age=31536000, immutable
ETag: "abc123"
```

浏览器下次请求时带上：

```text
If-None-Match: "abc123"
```

## 原理讲解

`Cache-Control` 常用指令：

- `max-age=N`：相对时间（秒），优先级高于 `Expires` 的绝对时间；
- `no-cache`：**可以存**，但每次使用前必须向服务器验证（走协商缓存）；
- `no-store`：完全不允许存储，任何场景都不缓存；
- `public` / `private`：是否允许代理服务器缓存；
- `immutable`：在有效期内即使用户刷新也不发起验证请求。

`ETag` 与 `Last-Modified` 的取舍：

- `Last-Modified` 精度只到**秒**，且文件内容未变但修改时间变化时会误判；
- `ETag` 用内容指纹（或版本号）标识，更精确，分布式部署下建议用**弱 ETag** 或基于内容哈希。

## 追问与易错点

- **地址栏回车 / 点击链接**：优先命中强缓存（未过期就直接用）。
- **按 F5 刷新**：`Cache-Control` 的强缓存会被跳过，直接走协商缓存。
- **按 Ctrl/Cmd + Shift + R**：强制刷新，连协商缓存都不走，全部重新拉取。
- **为什么线上要「HTML 不缓存 + 静态资源长缓存」？** 入口 HTML 用 `no-cache` 保证发版后立刻生效；`index-<hash>.js` 这类带内容哈希的资源用一年强缓存，发版时文件名变化自然失效，不会出现缓存不一致。
- **命中 304 还会传输响应体吗？** 不会，只返回响应头，所以 304 是省流量的关键。

## 相关题目

- [network-002-cors](/q/network/network-002-cors)
