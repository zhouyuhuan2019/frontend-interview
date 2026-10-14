---
title: Vue2 里怎么统一捕获组件错误？errorCaptured 与 window.onerror 怎么配合？
subtopic: 错误处理
difficulty: senior
frequency: medium
tags: [Vue2, 错误处理, errorCaptured, errorHandler, 前端监控]
order: 170
related: [vue2-002-lifecycle, vue2-004-component-communication, design-003-monitoring]
---

线上偶尔有用户反馈「页面白屏」「某个模块点了没反应」，但控制台里看不到报错。你希望做一套统一兜底：把组件渲染、生命周期、事件处理里抛出的异常都捕获上报，同时尽量不影响页面。

请说明：Vue2 里 `errorCaptured`、`Vue.config.errorHandler`、`window.onerror` 各自覆盖什么范围？应该怎么分层配合？

## 参考答案

分三层兜底，各管一段：

1. **局部兜底 —— `errorCaptured(err, vm, info)`**：捕获**后代组件**在渲染、生命周期、watcher、事件处理中抛出的错误。返回 `false` 表示「我已处理，阻止继续向上冒泡」。
2. **全局兜底 —— `Vue.config.errorHandler = (err, vm, info) => {}`**：Vue 内部**所有未被子级 `errorCaptured` 拦截**的错误最终汇总到这里，信息最全（带 `vm` 实例和 `info` 来源），是**上报的主入口**。
3. **浏览器兜底 —— `window.addEventListener('error')` + `window.addEventListener('unhandledrejection')`**：捕获**不在 Vue 作用域内**的错误，如 `setTimeout` 回调、第三方库、资源加载失败、未处理的 Promise 拒绝。

一句话：**Vue 管得住的走 `errorCaptured` / `errorHandler`，Vue 管不住的走 `window.onerror`；两者互补，缺一不可。**

## 原理讲解

**现象**：某些报错既不打印、也进不了监控。

**原因**：Vue 的错误处理有明确的**边界**——它只会拦截那些「被 Vue 包装过的调用」（渲染函数、watcher 回调、事件 handler、生命周期钩子）。Vue 内部用 `invokeWithErrorHandling` 包住这些调用，出错时交给 `handleError`：

它在出错组件的**父链上自下而上**依次调用每层的 `errorCaptured`；只要有一层返回 `false` 就立刻停止冒泡、**不再调用全局 `errorHandler`**；若一路上都没人拦截，才转交 `Vue.config.errorHandler`（默认实现是 `console.error`）。

下面的纯 JS 例子还原了这条「父链冒泡 + 返回 false 拦截」的规则：

```js run
// 模拟组件父链：child 出错 → 依次询问 parent、root 的 errorCaptured
const hooks = []
const register = (name, handler) => hooks.push({ name, handler })

register('parent', (err) => {
  console.log('parent errorCaptured ->', err.message)
  return false   // false = 已处理，阻止继续向上传播
})
register('root', (err) => {
  console.log('root errorCaptured ->', err.message)
  return false
})

function handleError(err) {
  for (const hook of hooks) {
    if (hook.handler(err) === false) {
      console.log('被', hook.name, '拦截，停止向上传播')
      return                       // 不再调用 Vue.config.errorHandler
    }
  }
  console.log('无人拦截，交给 Vue.config.errorHandler')
}

handleError(new Error('渲染失败'))
```

```text output
parent errorCaptured -> 渲染失败
被 parent 拦截，停止向上传播
```

**解决方案一：全局上报入口**

```js
// main.js
Vue.config.errorHandler = (err, vm, info) => {
  // err：错误对象；vm：出错组件实例；info：来源，如 "render" / "mounted hook"
  report({
    message: err.message,
    stack: err.stack,
    info,
    component: vm && vm.$options.name,
    route: vm && vm.$route && vm.$route.fullPath,
  })
  // 开发环境仍然打印，方便调试
  if (process.env.NODE_ENV !== 'production') console.error(err)
}

// 兜住不在 Vue 作用域内的错误
window.addEventListener('error', (e) => {
  report({ message: e.message, stack: e.error && e.error.stack, type: 'window' })
})
window.addEventListener('unhandledrejection', (e) => {
  report({ message: 'unhandledrejection', reason: String(e.reason), type: 'promise' })
})
```

**解决方案二：局部降级，避免「一处报错毁全页」**

```js
export default {
  name: 'ModuleWrapper',
  errorCaptured(err, vm, info) {
    this.hasError = true          // 切到兜底 UI
    report(err, info)             // 一样要上报
    return false                  // 拦截，阻止继续向上（父级不会跟着崩）
  },
}
```

```vue
<template>
  <div class="module">
    <div v-if="hasError" class="fallback">模块加载失败，请重试</div>
    <slot v-else />
  </div>
</template>
```

**分层对照表**

| 手段 | 覆盖范围 | 能否阻止冒泡 | 是否带 vm/info |
|---|---|---|---|
| `errorCaptured` | 后代组件的渲染/生命周期/watcher/事件 | 可以（返回 `false`） | 有（`vm`、`info`） |
| `Vue.config.errorHandler` | 未被子级捕获的全部 Vue 错误 | — | 有 |
| `window` `error` | Vue 之外：异步回调、第三方、资源 | — | 无 |
| `unhandledrejection` | 未处理的 Promise 拒绝 | — | 无 |

## 追问与易错点

- **组件自身的 `errorCaptured` 能捕获自己的错误吗？** 不能，它只捕获**后代**组件；自己渲染里抛的错会直接上行到父级或全局。
- **`errorCaptured` 返回 `false` 后还会进 `errorHandler` 吗？** 不会，返回 `false` 即视为已处理，冒泡中止，全局钩子不再收到。
- **`setTimeout` / 原生事件里的报错 Vue 能捕获吗？** 不能，它们不在 Vue 的调用包装内，必须靠 `window.error`。
- **Promise 里的报错呢？** 未处理的 Promise 拒绝走 `unhandledrejection`；若在 `async` 且被 `await` 并用 try/catch 包住，则本地即可处理。
- **上报会不会把错误「吃掉」，导致上线排查困难？** 谨慎：全局 `errorHandler` 里别用空实现吞掉错误，开发环境要继续 `console.error`，否则等于把线索抹掉。
- **`errorCaptured` 里又抛错了怎么办？** 该错误会再走一遍全局处理，可能形成循环；钩子内务必包 `try/catch`，只做上报和置位。

## 相关题目

- [vue2-002-lifecycle](/q/vue2/vue2-002-lifecycle)
- [vue2-004-component-communication](/q/vue2/vue2-004-component-communication)
- [design-003-monitoring](/q/design/design-003-monitoring)
