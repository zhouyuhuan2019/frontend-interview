---
title: XSS 与 CSRF 分别是什么？怎么防御？
subtopic: 前端安全
difficulty: middle
frequency: high
tags: [XSS, CSRF, 前端安全, CSP, SameSite]
order: 90
related: [network-010-storage]
---

## 参考答案

| 维度 | XSS（跨站脚本攻击） | CSRF（跨站请求伪造） |
| --- | --- | --- |
| 本质 | 把恶意脚本**注入**到你的页面里执行 | 借用户的登录态**伪造**请求发往目标站 |
| 攻击位置 | 目标站内（脚本在目标域运行） | 第三方站点（诱导用户浏览器发请求） |
| 危害 | 偷 Cookie/Token、劫持页面、冒充用户操作 | 以用户身份完成转账、改密等操作 |
| 核心防御 | 输出转义、CSP、HttpOnly | SameSite Cookie、CSRF Token、Origin 校验 |

一句话区分：**XSS 是「用户信任的网站里混进了坏脚本」，CSRF 是「网站信任了来自坏地方的请求」**。

## 原理讲解

**XSS 的三种类型**：

1. **存储型**：恶意脚本存入数据库（如评论区），每个访问者都中招，危害最大；
2. **反射型**：脚本藏在 URL 参数里，服务端未过滤直接回显到页面，需要诱骗点击；
3. **DOM 型**：纯前端漏洞，`innerHTML = location.hash` 这类写法直接把不可信数据写进 DOM，不经过服务器。

**XSS 防御组合拳**：

- **输出转义**：所有不可信数据插入页面前按上下文转义（HTML 实体、JS 转义、URL 编码）。Vue/React 默认转义插值内容，危险的正是 `v-html` / `dangerouslySetInnerHTML`；
- **CSP（内容安全策略）**：响应头声明 `Content-Security-Policy: script-src 'self'`，即使注入成功，外链/内联脚本也不允许执行；
- **HttpOnly Cookie**：让 Cookie 无法被 `document.cookie` 读取，堵住「偷凭证」这条最常见的变现路径；
- 输入侧做长度/格式校验作为补充（不能替代转义）。

**CSRF 的攻击前提**：目标站用 Cookie 做认证 + 浏览器跨站发请求会**自动带上 Cookie**。攻击者在自己页面放一个自动提交的表单或图片请求即可。

**CSRF 防御组合拳**：

- **SameSite Cookie**：`SameSite=Lax/Strict` 让跨站请求不携带 Cookie，从根上断掉攻击条件，现代浏览器默认 Lax；
- **CSRF Token**：服务端下发一次性随机 Token，请求时必须带回（表单隐藏域或自定义头），攻击者拿不到也伪造不了；
- **校验 Origin / Referer**：确认请求来自本站；
- 关键操作加二次验证（短信码、密码确认）。

注意：只用 `Content-Type: application/json` 不算可靠防御——简单请求之外还有表单伪造等手段，Token 才是硬保障。

## 追问与易错点

- **HttpOnly 能防 XSS 吗？** 不能。它只是让脚本偷不到 Cookie，恶意脚本仍然可以直接**以用户身份发请求**（Token 在页面里、请求自动带 Cookie）。防 XSS 还得靠转义和 CSP。
- **前后端分离、Token 放 localStorage 还会被 CSRF 吗？** 不会（请求头需要 JS 主动设置，跨站页面读不到你的 Token），但 XSS 的风险反而变大——localStorage 里的 Token 可以被脚本直接读走。两种方案是安全性的取舍。
- **GET 请求会有 CSRF 风险吗？** 规范上 GET 应该是幂等只读的，若用 GET 做转账这类修改操作，一张 `<img src>` 就能完成攻击。敏感操作必须用 POST 等方法。
- **CSP 怎么配比较实用？** 先 `Content-Security-Policy-Report-Only` 灰度收集违规报告，再逐步收紧到 `default-src 'self'`，避免一刀切打挂正常资源。
- **SameSite=Lax 下哪些跨站请求还带 Cookie？** 顶层导航的 GET（如点链接跳转）仍会带，表单 POST、fetch、图片等跨站请求不带。

## 相关题目

- [network-010-storage](/q/network/network-010-storage)
- [network-002-cors](/q/network/network-002-cors)
