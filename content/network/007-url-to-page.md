---
title: 输入 URL 到页面展示，中间发生了什么？
subtopic: 浏览器渲染流程
difficulty: middle
frequency: high
tags: [浏览器, DNS, TCP, 渲染流程, 综合题]
order: 70
related: [network-001-http-cache, network-008-render-blocking]
---

## 参考答案

整体可以串成六个阶段：**URL 解析 → 缓存判断 → DNS 解析 → 建立连接（TCP + TLS）→ 请求与响应 → 解析渲染**。

1. **URL 解析与缓存判断**：解析协议、域名、路径；检查 HSTS（强制 HTTPS）；查强缓存，命中则直接用本地资源，流程提前结束。
2. **DNS 解析**：浏览器缓存 → 操作系统缓存 → hosts 文件 → 本地 DNS 服务器 → 根 / 顶级域 / 权威 DNS，逐级查询拿到 IP。
3. **建立 TCP 连接**：三次握手（SYN → SYN+ACK → ACK）；HTTPS 还要进行 TLS 握手，协商出会话密钥。
4. **发送 HTTP 请求**：浏览器拼好请求行、请求头（Cookie、协商缓存头等）发出；服务器处理并返回响应。
5. **浏览器解析渲染**：HTML 解析成 DOM 树，CSS 解析成 CSSOM，二者合成渲染树，经布局（Layout）、绘制（Paint）、合成（Composite）后上屏；期间 JS 通过事件循环参与执行。
6. **连接收尾**：HTTP/1.1 默认 keep-alive 复用连接，空闲超时后四次挥手关闭。

## 原理讲解

**第一步：URL 解析与缓存判断**

浏览器先判断输入是搜索词还是合法 URL，补齐协议。若站点在 HSTS 列表里，直接改写为 HTTPS。随后检查强缓存（`Cache-Control` / `Expires`），未过期则零网络请求直接渲染——这就是为什么「再访问一次」会快很多。

**第二步：DNS 解析**

DNS 查询是一棵树的递归/迭代查找，各级都有缓存，常用域名通常在本地 DNS 服务器就能命中，延迟很低。前端可用 `dns-prefetch` / `preconnect` 提前完成这一步。

**第三步：TCP 三次握手**

```text
客户端 ──SYN(seq=x)──────────► 服务器
客户端 ◄─SYN+ACK(seq=y,ack=x+1)─ 服务器
客户端 ──ACK(ack=y+1)─────────► 服务器   （连接建立）
```

三次的必要性：两次无法让**双方都确认**对方收到了自己的初始序列号。HTTPS 在此之上叠加 TLS 握手（TLS 1.2 需 2-RTT，1.3 只需 1-RTT）。

**第四步：请求与响应**

服务器（可能经过 CDN、Nginx 反向代理、应用服务）处理后返回 HTML 及状态码。若返回 301/302，浏览器带着 `Location` 从头再来一遍；若命中协商缓存则返回 304。

**第五步：解析渲染（关键路径）**

```text
HTML ──► DOM 树 ┐
                ├──► 渲染树 ──► Layout ──► Paint ──► Composite ──► 上屏
CSS  ──► CSSOM ┘        ▲
                        └── JS 可修改 DOM/CSSOM，触发回流与重绘
```

- HTML 逐行解析，遇到 `<script>` 会**阻塞解析**先执行 JS（`async`/`defer` 可改变这个行为）；
- CSS 不阻塞解析但**阻塞渲染**（渲染树需要 CSSOM），还会**阻塞其后 JS 的执行**；
- 首字节到达后浏览器是**边下载边解析边渲染**的，首屏不必等全部资源就绪；
- JS 的执行遵循事件循环：同步代码 → 微任务 → 渲染 → 宏任务，长任务会卡帧。

**第六步：连接管理**

`Connection: keep-alive` 让 TCP 连接在一段时间内复用，避免每个资源都重新握手；HTTP/2 更进一步，单连接多路复用所有资源。

## 追问与易错点

- **为什么三次握手不是两次或四次？** 两次无法让服务器确认客户端收到了自己的 SYN（历史失效的连接请求会造成资源浪费）；四次则没必要，SYN 和 ACK 可以合并。
- **DNS 解析一定发生吗？** 不一定，各级缓存命中任意一级就结束；同页面同源二次访问通常直接命中浏览器缓存。
- **HTML、CSS、JS 谁先加载？** 按文档顺序发现资源，但有预解析扫描器（preload scanner）会提前并发请求 CSS/JS/图片，不是严格串行。
- **页面白屏时间长，从这条链路怎么排查？** 分段定位：DNS/TCP/TLS 耗时（网络层）、TTFB（服务器层）、资源加载与关键渲染路径阻塞（前端层），分别对应 preconnect、服务端优化、defer/分包/骨架屏等手段。
- **四次挥手为什么需要 TIME_WAIT？** 保证最后一个 ACK 能重传，并让旧连接的残留报文在网络中消亡，避免污染新连接。

## 相关题目

- [network-001-http-cache](/q/network/network-001-http-cache)
- [network-008-render-blocking](/q/network/network-008-render-blocking)
- [network-005-https-tls](/q/network/network-005-https-tls)
