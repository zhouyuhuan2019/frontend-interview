---
title: axios 你会怎么封装？拦截器、统一错误处理与取消请求怎么做？
subtopic: 请求与拦截
difficulty: middle
frequency: high
tags: [Vue2, axios, 拦截器, 统一错误处理, 取消请求]
order: 130
related: [vue2-012-form-validation, network-002-cors]
---

项目里几十个接口散落各处：有的地方写 `res.data.data`，有的地方漏判业务 `code`，token 要手动拼，错误提示每个页面各写一套；切换路由后旧请求还在跑，导致「数据串台」。这种状况下请求层该怎么封装？

## 参考答案

一句话：**不要在每个页面里裸调 `axios.get`，而是「创建一个实例 + 挂载请求 / 响应拦截器 + 对外只暴露语义化方法」，把「鉴权、统一解包、统一报错、取消」收敛到一处。**

```js
// utils/request.js
import axios from 'axios'

const service = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截器：统一带 token
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器：统一解包 + 统一报错
service.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 0) {
      // 业务错误：提示并中断
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res.data // 直接返回业务数据，页面不用再 .data
  },
  (error) => {
    // HTTP 错误（401 / 500 / 超时 / 网络）
    if (error.response?.status === 401) {
      // 登录失效：跳登录
    }
    return Promise.reject(error)
  },
)

export default service
```

封装之后，业务里写 `const user = await request.get('/user/1')` 即可，鉴权与解包都在拦截器里完成。

## 原理讲解

**现象**：重复代码多、错误处理分散、提示风格不统一。**原因**：请求逻辑（怎么发）与业务逻辑（发什么、拿到后干什么）耦合在每个页面里。

**解决方案分四层：**

**1）实例 + 基础配置**：用 `axios.create` 隔离项目配置（`baseURL`、超时、公共头），避免污染全局默认值。

**2）请求拦截器**：统一注入 token、语言、`X-Request-Id` 等；也可在这里做「同一请求重复提交」的去重。

**3）响应拦截器**：统一「解包 + 分流」——HTTP 状态码错误交给 axios 的 error 分支，业务 `code` 错误在成功分支里主动 `reject`，最终都由调用方用 `try/catch` 兜底。

```js
// 语义化封装：把「怎么调接口」藏起来
export const getUser = (id) => request.get(`/user/${id}`)
export const login = (data) => request.post('/login', data)
```

**4）取消请求**：Vue2 项目里常见的是 axios 的 `CancelToken`（旧版）或 `AbortController`（axios ≥ 0.22 支持 `signal`）。典型场景是「切换路由 / 重新搜索时取消上一次请求」。用 `AbortController` 模拟「请求发出后被取消」的过程：

```js run
// 用一个延时 Promise 模拟一次网络请求
function request(name, { signal }) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(name + ' 返回数据'), 30)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new Error(name + ' 请求已取消'))
    })
  })
}

const controller = new AbortController()

request('搜索 A', { signal: controller.signal })
  .then((data) => console.log('成功:', data))
  .catch((err) => console.log('失败:', err.message))

// 30ms 内取消（例如用户又输入了新关键词）
controller.abort()
```

```text output
失败: 搜索 A 请求已取消
```

在浏览器里对应的 axios 写法是 `axios.get(url, { signal: controller.signal })`，取消时调用 `controller.abort()`，请求会以取消错误（`CanceledError` / `AbortError`）被 reject。

**关于重复请求去重**：用 `method + url + params` 生成 key 存入 Map；新请求到来时若 key 已存在，先取消旧请求再发新的（`CancelToken` 或 `signal` + `AbortController` 均可）。

## 追问与易错点

- **拦截器里 `return res.data` 和 `return response` 有什么区别？** 前者把解包下沉到拦截器，业务层拿到的是业务数据；后者保留完整响应，业务层自己 `.data`。团队必须统一，否则一半人拿到 `data`、一半人拿到 `response`，极易出错。
- **业务错误和 HTTP 错误怎么分？** 两套都要管：HTTP 层错误（404 / 500 / 超时）看 `error.response`；业务层错误（`code !== 0`）在响应成功分支里主动 `reject`。
- **`CancelToken` 与 `AbortController` 怎么选？** `AbortController` 是新标准、还能同时传给 `fetch`，推荐；`CancelToken` 已废弃，只在老项目里见得到。
- **401 一定跳登录页吗？** 要防重定向死循环，以及并发 401 弹出多次提示；可用标志位只提示一次，或让登录接口跳过拦截。
- **拦截器里忘了 `Promise.reject(error)` 会怎样？** 错误会被「吞掉」，调用方拿不到 reject，`try/catch` 失效，还可能继续 `return undefined` 造成空指针。
- **`baseURL` 怎么按环境配？** 用 Vite 的 `import.meta.env.VITE_API_BASE`（webpack 项目是 `process.env`）注入，避免把测试域名打进生产包。

## 相关题目

- [vue2-012-form-validation](/q/vue2/vue2-012-form-validation)
- [network-002-cors](/q/network/network-002-cors)
