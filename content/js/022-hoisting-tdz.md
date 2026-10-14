---
title: 变量提升和 TDZ 有哪些坑？为什么会意外产生全局变量？
subtopic: 变量与作用域
difficulty: middle
frequency: high
tags: [变量提升, TDZ, 全局变量, 严格模式]
order: 220
related: [js-001-var-let-const]
---

先看这段代码，两个 `console.log` 分别会输出什么？

```js
function foo() {
  acc = 1          // 注意：acc 没有用 var/let/const 声明
  var local = 2
}
foo()

console.log(acc)
console.log(local)
```

## 参考答案

```text output
1
ReferenceError: local is not defined
```

反直觉点：

- `acc = 1` 没有声明就直接赋值，在**非严格模式**下会被隐式创建为**全局变量**（挂在 `globalThis` 上），所以函数外能读到 `1`。
- `local` 用 `var` 声明，它只存在于 `foo` 的函数作用域内，函数外访问直接 `ReferenceError`。

## 原理讲解

**变量提升（hoisting）**：`var` 和函数声明会提升到作用域顶部。`var` 提升时同时初始化为 `undefined`；函数声明整体提升，可以「先调用后定义」。

**TDZ（暂时性死区）**：`let` / `const` 同样会提升，但**不初始化**；从进入作用域到执行到声明语句之间的区间内访问它们，会抛 `ReferenceError`。

```js run
// 1. var 提升为 undefined
console.log('a:', a) // undefined
var a = 1

// 2. 隐式全局变量：用 Function 构造器模拟非严格模式下的未声明赋值
const leak = new Function('leaked = 42')
leak()
console.log('globalThis.leaked:', globalThis.leaked) // 42

// 3. typeof 对「从未声明」的变量是安全的
console.log('typeof 未声明:', typeof notDeclared) // 'undefined'

// 4. 但 typeof 处于 TDZ 的 let 变量会抛错
try {
  console.log(typeof tdzVar)
} catch (e) {
  console.log('typeof TDZ 报错:', e.name) // ReferenceError
}
let tdzVar = 1

// 5. 函数声明整体提升，可提前使用
console.log('hoistedFn:', typeof hoistedFn) // 'function'
function hoistedFn() {}

// 6. 函数表达式（const）存在 TDZ
try {
  console.log(typeof exprFn)
} catch (e) {
  console.log('exprFn 报错:', e.name) // ReferenceError
}
const exprFn = function () {}
```

```text output
a: undefined
globalThis.leaked: 42
typeof 未声明: undefined
typeof TDZ 报错: ReferenceError
hoistedFn: function
exprFn 报错: ReferenceError
```

注意第 3、4 步的对比：`typeof notDeclared` 返回 `'undefined'` 而不报错，是因为 `notDeclared` **从未被声明过**；但 `tdzVar` 已经用 `let` 声明、正处在 TDZ，`typeof` 它也会抛 `ReferenceError`。这是「TDZ」与「未声明」的关键差别。

**实际开发中的正确写法**：

1. 永远用 `let` / `const`，并开启严格模式（`'use strict'`，或使用 ES Module——模块默认即严格模式）。严格模式下未声明赋值会直接抛错，不会静默污染全局。
2. 声明尽量靠近首次使用的位置，别依赖提升。
3. 用 ESLint 的 `no-undef` / `no-use-before-define` 兜底。

## 追问与易错点

- **为什么 `var` 先访问不报错，而 `let` 会报错？** `var` 提升时初始化为 `undefined`；`let` 只提升声明不初始化，留下 TDZ，访问即触发 `ReferenceError`。
- **`typeof` 能安全探测变量吗？** 对**从未声明**的变量安全（返回 `'undefined'`），但对处于 TDZ 的 `let` / `const` 会抛错。
- **函数声明和函数表达式提升一样吗？** 不一样。函数声明整体提升、可提前调用；函数表达式只提升变量本身，表达式求值仍在原处。
- **严格模式如何影响隐式全局？** 严格模式下对未声明变量赋值抛 `ReferenceError`；这也是打包后的模块代码更安全的原因。
- **TDZ 是编译期还是运行期的错误？** 由引擎在解析期做检查，真正抛错发生在访问那一刻，错误类型为 `ReferenceError`。

## 相关题目

- [js-001-var-let-const](/q/js/js-001-var-let-const)
