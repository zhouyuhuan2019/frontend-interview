---
title: Cookie/LocalStorage/SessionStorage 有什么区别？
subtopic: Cookie 与本地存储
difficulty: junior
frequency: high
tags: [Cookie, localStorage, sessionStorage, 本地存储]
order: 100
related: [network-009-xss-csrf]
---

## 参考答案

| 维度 | Cookie | LocalStorage | SessionStorage |
| --- | --- | --- | --- |
| 容量 | ~4KB | ~5MB（因浏览器而异） | ~5MB |
| 生命周期 | 由 `Expires`/`Max-Age` 控制，可长可短 | 永久，除非主动清除 | 标签页会话级，关标签页即失 |
| 是否随请求发送 | **每次同源请求自动携带** | 否 | 否 |
| 服务端可写 | 是（`Set-Cookie` 响应头） | 否（纯 JS API） | 否 |
| 作用域 | 按 `Domain`/`Path`，子域可共享 | 同源（协议+域名+端口） | 同源 **且同一标签页** |
| 典型用途 | 会话凭证、跟踪标识 | 用户设置、缓存非敏感数据 | 表单暂存、一次性页面状态 |

一句话总结：**Cookie 是为「和服务器通信」设计的，两个 Web Storage 是为「纯前端存储」设计的**。

## 原理讲解

**Cookie 的关键属性**（都是安全与作用域开关）：

```http
Set-Cookie: sid=abc123; Max-Age=86400; Path=/; Domain=.example.com; HttpOnly; Secure; SameSite=Lax
```

- `HttpOnly`：禁止 JS 读取，防 XSS 偷 Cookie；
- `Secure`：仅 HTTPS 下发送；
- `SameSite`：控制跨站请求是否携带，是 CSRF 的克星；
- `Domain=.example.com`：让子域共享；`Path` 限定生效路径。

因为 Cookie **每次请求都带**，4KB 的上限如果塞满，每个请求（包括图片、CSS）都会白白多传几 KB——所以 Cookie 只放小而关键的凭证，别当仓库用。

**LocalStorage 与 SessionStorage 的细微差别**：

- 同一标签页内刷新，SessionStorage **保留**；关掉再开（即使是同一 URL）就清空；
- 通过链接打开新标签页不会复制 SessionStorage（`window.open` 或 Ctrl+点击新开的标签页是独立会话）；
- 两者都是同步 API，存取大对象会阻塞主线程，且只能存字符串，对象要 `JSON.stringify`。

**选型经验**：登录凭证用 HttpOnly Cookie（或认真评估后的 Token 方案）；「记住主题/语言」等偏好用 LocalStorage；多步骤表单的临时数据用 SessionStorage；真正的大量结构化数据（离线缓存、编辑器草稿）用 IndexedDB。

## 追问与易错点

- **Token 存 Cookie 还是 LocalStorage？** Cookie + HttpOnly 怕 CSRF（用 SameSite/Token 防御）；LocalStorage 怕 XSS（脚本可读走）。主流做法是 HttpOnly + SameSite Cookie，把 XSS 的变现路径堵死。
- **LocalStorage 在无痕模式下可用吗？** 大多数浏览器可用但关闭即清，且 Safari 旧版本会直接抛异常，读写都要 try/catch。
- **两个标签页同时写 LocalStorage 会怎样？** 同源共享，后写覆盖先写；可以监听 `storage` 事件做跨标签页同步（注意当前页收不到自己触发的事件）。
- **Cookie 的 SameSite=None 有什么条件？** 必须同时带 `Secure`，否则现代浏览器直接拒绝写入。
- **SessionStorage 真的能防信息泄露吗？** 只是缩短了存活时间，同一标签页内的 XSS 脚本照样能读到，它不是安全机制。

## 相关题目

- [network-009-xss-csrf](/q/network/network-009-xss-csrf)
- [network-001-http-cache](/q/network/network-001-http-cache)
