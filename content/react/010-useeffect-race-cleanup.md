---
title: useEffect 里请求接口为什么会数据错乱？清理函数怎么写才对？
subtopic: 副作用与清理
difficulty: middle
frequency: high
tags: [React, useEffect, 竞态条件, 清理函数, AbortController]
order: 100
related: [react-001-useeffect-deps, react-002-closure-useref]
---

下面是某个搜索页的代码，用户在输入框里**快速打字**时，结果列表总是闪一下，最后却停在某个**旧关键词**的结果上。请解释原因，并给出正确写法：

```jsx
function Search() {
  const [keyword, setKeyword] = useState('')
  const [list, setList] = useState([])

  useEffect(() => {
    fetch(`/api/search?q=${keyword}`)
      .then((res) => res.json())
      .then((data) => setList(data)) // 哪个请求最后返回，谁就覆盖 state
  }, [keyword])

  return (
    <>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      <ul>
        {list.map((it) => (
          <li key={it.id}>{it.name}</li>
        ))}
      </ul>
    </>
  )
}
```

## 参考答案

结论：这是**竞态条件（race condition）**，不是闭包陷阱。`useEffect` 只在 `keyword` 变化时「重新发起请求」，但网络响应回来的顺序与发起顺序**无关**——先发出的慢请求可能后返回，把后发出的快请求结果覆盖掉，界面就停在了旧关键词上。

正确做法：用 `useEffect` 的**清理函数**，在「下一次副作用执行前」或「组件卸载时」把上一次请求作废。常用两种手段：

1. **忽略标记 / 递增 id**：用布尔标志或递增序号判断本次响应是否仍是最新一次；
2. **`AbortController`**：真正中断上一次请求，同时节省网络开销。

```jsx
useEffect(() => {
  const controller = new AbortController()

  fetch(`/api/search?q=${keyword}`, { signal: controller.signal })
    .then((res) => res.json())
    .then((data) => setList(data))
    .catch((err) => {
      if (err.name !== 'AbortError') throw err // 只忽略「被取消」的错误
    })

  return () => controller.abort() // ★ 依赖变化或卸载时取消旧请求
}, [keyword])
```

## 原理讲解

先看现象。用一段纯逻辑模拟「先发出的请求慢、后发出的请求快」：

```js run
// 模拟：先发出的请求慢、后发出的请求快
function request(keyword, delay) {
  return new Promise((resolve) => setTimeout(() => resolve(`结果(${keyword})`), delay))
}

// —— 没有清理：谁最后返回，谁的值就留在界面上 ——
const legacy = { data: null }
request('a', 300).then((r) => (legacy.data = r))
request('ab', 120).then((r) => (legacy.data = r))

// —— 有清理：用递增 id 作废过期的请求 ——
let latest = 0
const fixed = { data: null }
function safeRequest(keyword, delay) {
  const id = ++latest
  return request(keyword, delay).then((r) => {
    if (id !== latest) return // 已被更新的请求取代，丢弃本次结果
    fixed.data = r
  })
}
safeRequest('a', 300)
safeRequest('ab', 120)

setTimeout(() => {
  console.log('无清理最终值 =', legacy.data)
  console.log('有清理最终值 =', fixed.data)
}, 400)
```

```text output
无清理最终值 = 结果(a)
有清理最终值 = 结果(ab)
```

`safeRequest` 里的 `latest` 就等价于组件里那面「作废过期请求」的旗帜。清理函数的执行时机由 React 保证：

| 时机 | 清理函数是否执行 |
| --- | --- |
| 依赖变化，副作用即将重新执行前 | 执行（先清旧，再跑新） |
| 组件卸载时 | 执行 |
| 组件重新渲染但依赖没变 | 不执行 |

只要把「作废上一次请求」写进 `return () => {...}`，React 就会保证「新请求发起之前，旧请求一定先被作废」，从根上消除竞态。

两种作废方式的区别：`AbortController` 在 `fetch` 层真正中断连接；忽略标记只是在回调里丢弃结果。**视图正确性两者都能保证**，但前者还能减少无谓流量。

## 追问与易错点

- **为什么不用闭包陷阱解释？** 两次请求都是独立发起的，数据错乱来自响应**到达顺序**，而不是异步回调读到了旧变量。
- **能在清理函数里 `setList([])` 清空吗？** 不建议。清理发生在依赖变化时，立刻清空会让界面闪一下空列表；加载态交给新请求处理更好。
- **取消后的 `catch` 会收到什么？** 一个 `name === 'AbortError'` 的异常，必须把它和真正的网络错误区分开，否则会把「正常取消」当报错抛出。
- **React 18 StrictMode 下请求会发两次吗？** 会。开发模式下挂载后立即卸载再挂载，effect 与清理各跑一遍——正好用来暴露「清理没写对」的问题，生产环境不会重复。
- **依赖数组里放整个对象会怎样？** 对象每次渲染都是新引用，effect 会反复重跑，应只依赖原始值（如 `keyword` 字符串）。

## 相关题目

- [react-001-useeffect-deps](/q/react/react-001-useeffect-deps)
- [react-002-closure-useref](/q/react/react-002-closure-useref)
