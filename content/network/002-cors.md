---
title: 什么是同源策略？跨域有哪几种解决方案？
subtopic: 同源策略与跨域
difficulty: middle
frequency: high
tags: [同源策略, 跨域, CORS, 预检请求, 代理]
order: 20
---

## 参考答案

**同源**指协议、域名、端口三者完全一致。同源策略限制的是「读取」行为：跨源的 `fetch` / XHR 响应、`iframe` 内容、`localStorage` 都不能被随意读取（但**请求本身可以发出去**，只是响应拿不到）。

常见解决方案：

| 方案 | 适用场景 | 要点 |
| --- | --- | --- |
| CORS | 现代标准做法 | 服务端设置 `Access-Control-Allow-Origin` 等响应头 |
| 反向代理 | 生产环境最常用 | 让请求同源，由服务端转发，如 Nginx `proxy_pass` |
| JSONP | 只支持 GET、老项目 | 利用 `<script>` 不受同源限制，回调函数传数据 |
| postMessage | iframe / 跨窗口通信 | 必须校验 `event.origin` |
| WebSocket | 长连接 | 协议本身不受同源策略限制 |

## 原理讲解

CORS 的判定分两类：

**简单请求**（方法为 `GET` / `HEAD` / `POST`，且只带少量安全的首部）直接发出，浏览器检查响应头：

```text
Access-Control-Allow-Origin: https://a.com
Access-Control-Allow-Credentials: true
```

**非简单请求**（`PUT` / `DELETE`、自定义首部、`Content-Type: application/json` 等）会先发一个 `OPTIONS` **预检请求**：

```text
OPTIONS /api/user HTTP/1.1
Origin: https://a.com
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: content-type
```

服务器需要响应允许的方法与首部，并可用 `Access-Control-Max-Age` 缓存预检结果，避免每次请求都多一次往返。

**携带 Cookie 时的两个硬性要求**：
1. 前端必须设置 `credentials: 'include'`（或 XHR 的 `withCredentials = true`）；
2. 服务端不能用 `Access-Control-Allow-Origin: *`，必须回显具体源，且设置 `Access-Control-Allow-Credentials: true`。

## 追问与易错点

- **跨域请求失败了，是请求没发出去吗？** 不是。请求通常已经发出并且服务端也处理了，只是浏览器拦下了响应。所以「跨域写操作」可能已生效，这类请求需要幂等设计或 CSRF 防护。
- **为什么预检请求会拖慢性能？** 每次非简单请求都多一个 RTT；解法是 `Access-Control-Max-Age` 缓存，或把接口收敛为简单请求。
- **`Access-Control-Allow-Origin` 能不能配多个域名？** 只能配一个具体值或 `*`，多个需要用代码动态回显 `Origin`（并做白名单校验）。
- **开发时的 `proxy` 和生产的反向代理有什么区别？** 开发是 Vite/Webpack 的 devServer 转发，生产是 Nginx 等网关转发，本质都是让浏览器视角下「同源」。

## 相关题目

- [network-001-http-cache](/q/network/network-001-http-cache)
