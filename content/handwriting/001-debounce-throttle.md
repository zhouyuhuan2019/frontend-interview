---
title: 手写防抖与节流，并说明适用场景
subtopic: 函数工具
difficulty: middle
frequency: high
tags: [手写, 防抖, 节流, debounce, throttle, 闭包]
order: 10
---

## 参考答案

**防抖（debounce）**：事件停止触发 `wait` 毫秒后才执行一次，适合「等用户停下来」的场景（搜索联想、输入校验、窗口 resize 结束）。

**节流（throttle）**：每 `wait` 毫秒最多执行一次，适合「持续高频但需要控频」的场景（滚动监听、拖拽、按钮连点）。

```js run
// 基础版防抖
function debounce(fn, wait) {
  let timer = null
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, wait)
  }
}

// 基础版节流（时间戳 + 定时器，保证首次立即执行、末次也能执行）
function throttle(fn, wait) {
  let last = 0
  let timer = null
  return function (...args) {
    const now = Date.now()
    const remaining = wait - (now - last)
    if (remaining <= 0) {
      last = now
      fn.apply(this, args)
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now()
        timer = null
        fn.apply(this, args)
      }, remaining)
    }
  }
}

// 验证：连续调用 10 次，防抖只执行 1 次
let debounceCalls = 0
const debounced = debounce(() => { debounceCalls += 1 }, 50)
for (let i = 0; i < 10; i += 1) debounced()
setTimeout(() => console.log('防抖执行次数：', debounceCalls), 120)
```

## 原理讲解

两者的实现都依赖闭包保存外部状态：

- 防抖把 `timer` 存在闭包里，每次触发先 `clearTimeout` 再重新 `setTimeout`，「重新计时」；
- 节流记录「上次执行时间戳 `last`」，用时间差判断是否允许执行；同时在「还没到时间」时挂一个定时器，保证最后一次触发不会丢失（否则会出现「尾部事件被吞掉」的问题）。

注意都要用 `fn.apply(this, args)` 而不是 `fn(args)`：`apply` 保留调用时的 `this` 与全部参数，否则在类方法或事件回调中会丢上下文。

**进阶：立即执行版防抖**（点击提交按钮防止重复提交）

```js run
function debounceLeading(fn, wait) {
  let timer = null
  return function (...args) {
    const callNow = !timer
    clearTimeout(timer)
    timer = setTimeout(() => { timer = null }, wait)
    if (callNow) fn.apply(this, args)
  }
}
```

## 追问与易错点

- **防抖加 `flush` / `cancel` 方法有什么用？** `flush` 立即执行待执行的调用（如表单提交时不等防抖），`cancel` 取消（组件卸载时清理）。
- **`requestAnimationFrame` 版节流好在哪？** 与渲染帧对齐，滚动/动画场景下比固定时间间隔更平滑，且页面隐藏时自动暂停。
- **Vue 里怎么用？** `<script setup>` 中定义 `const debounced = debounce(fn, 300)`，并在 `onUnmounted` 调用其 `cancel` 避免内存泄漏。
- **和 `IntersectionObserver` 的关系？** 滚动监听现在更推荐用 `IntersectionObserver` / `ResizeObserver`，由浏览器在帧级别优化回调，比手动节流更省资源。

## 相关题目

- [js-003-closure-memory](/q/js/js-003-closure-memory)
