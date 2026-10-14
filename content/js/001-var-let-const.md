---
title: var、let、const 有什么区别？
subtopic: 变量与作用域
difficulty: junior
frequency: high
tags: [var, let, const, 作用域, 变量提升, TDZ]
order: 10
---

## 参考答案

| 维度 | var | let | const |
| --- | --- | --- | --- |
| 作用域 | 函数作用域 | 块级作用域 | 块级作用域 |
| 变量提升 | 提升并初始化为 `undefined` | 提升但存在 TDZ | 提升但存在 TDZ |
| 重复声明 | 允许 | 不允许 | 不允许 |
| 是否可重新赋值 | 可以 | 可以 | 不可以（对象可改内部属性） |

三个关键点：

1. **作用域**：`var` 只认函数边界，`if` / `for` 的 `{}` 拦不住它；`let` / `const` 认块。
2. **暂时性死区（TDZ）**：`let` / `const` 声明前的区间内访问会直接抛 `ReferenceError`，而不是拿到 `undefined`。
3. **const 的「不可变」**：约束的是绑定（不能重新赋值），不是值本身。`const obj = {}` 之后仍然可以 `obj.a = 1`。

## 原理讲解

`var` 的声明在编译阶段被提升到函数顶部并初始化为 `undefined`，所以下面的代码不会报错，只会打印 `undefined`：

```js
console.log(a) // undefined
var a = 1
```

`let` / `const` 同样会提升，但不会初始化，从进入作用域到执行到声明语句之间处于 TDZ，访问即报错：

```js
console.log(b) // ReferenceError: Cannot access 'b' before initialization
let b = 1
```

`for` 循环里 `let` 有一个经典差异——每轮迭代都会创建一个新的绑定，因此定时器能正确捕获当轮的值：

```js
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i)) // 3 3 3
for (let j = 0; j < 3; j++) setTimeout(() => console.log(j)) // 0 1 2
```

## 追问与易错点

- **为什么 `let` 会有 TDZ？** 这是 ES6 的有意设计：让「用之前必须先声明」成为硬性约束，避免 `var` 那种「先用了再声明也能跑」的隐式行为。
- **`const` 声明的数组能 push 吗？** 能。`push` 修改的是数组内容，不是绑定本身。
- **想在循环里给元素绑定事件，用 `var` 就一定错？** 不一定，可以用 IIFE 或 `bind` 固定值，但 `let` 是更自然的写法。

## 相关题目

- [js-002-event-loop-order](/q/js/js-002-event-loop-order)
