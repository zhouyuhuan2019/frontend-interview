---
title: 下面这段代码的输出顺序是什么？
subtopic: 事件循环与 Promise
difficulty: middle
frequency: high
tags: [事件循环, 宏任务, 微任务, Promise, async-await]
order: 20
---

请写出下面这段代码在浏览器中的输出顺序，并说明原因：

```js
console.log('script start')

setTimeout(() => console.log('setTimeout'), 0)

Promise.resolve().then(() => console.log('promise then'))

console.log('script end')
```

## 参考答案

输出顺序是：

```text output
script start
script end
promise then
setTimeout
```

记住一条核心规则：**同步代码 → 清空微任务队列 → 取一个宏任务 → 再清空微任务队列**，如此循环。

## 原理讲解

```js run
console.log('script start')

setTimeout(() => console.log('setTimeout'), 0)

Promise.resolve().then(() => console.log('promise then'))

console.log('script end')
```

逐步拆解：

1. `console.log('script start')` 是同步代码，直接执行。
2. `setTimeout` 的回调被交给定时器线程，回调进入**宏任务**队列。
3. `Promise.resolve().then(...)` 的回调进入**微任务**队列。
4. `console.log('script end')` 同步执行。
5. 当前宏任务（整段 script）执行完毕，引擎清空微任务队列 → 打印 `promise then`。
6. 微任务清空后取出下一个宏任务 → 打印 `setTimeout`。

浏览器中的微任务队列主要包括：`Promise.then`、`queueMicrotask`、`MutationObserver`；宏任务包括：`setTimeout` / `setInterval`、事件回调、`MessageChannel`、网络请求回调。

`async/await` 的本质是 Promise 的语法糖。`await` 之后的部分会被包进一个微任务：

```js run
async function foo() {
  console.log('foo start')
  await null
  console.log('foo end')
}

console.log('before')
foo()
console.log('after')
```

输出为 `before` → `foo start` → `after` → `foo end`：`await` 把后续代码挂到了微任务。

## 追问与易错点

- **`setTimeout(fn, 0)` 是立刻执行吗？** 不是，最小延迟通常为 4ms（嵌套调用时），而且必须等当前宏任务与所有微任务结束。
- **`await` 后面的代码在哪个队列？** 微任务队列。所以它一定早于 `setTimeout`。
- **微任务会不会被饿死？** 如果微任务里不断产生新的微任务，会一直清空到队列为空，宏任务会被无限拖延。
- **`requestAnimationFrame` 属于哪一类？** 既不是宏任务也不是微任务，它在渲染前由渲染流程调度。

## 相关题目

- [js-001-var-let-const](/q/js/js-001-var-let-const)
