---
title: try / catch / finally 里都写了 return，最终返回哪个？
subtopic: 变量与作用域
difficulty: middle
frequency: medium
tags: [try-catch, finally, return, 异常处理]
order: 210
related: [js-022-hoisting-tdz]
---

下面两个函数各返回什么？先别急着推理，跑一下：

```js
function f() {
  try {
    return 1
  } catch (e) {
    return 2
  } finally {
    return 3
  }
}

function g() {
  let x = 1
  try {
    return x
  } finally {
    x = 2
  }
}

console.log(f())
console.log(g())
```

## 参考答案

```text output
3
1
```

- `f()` 返回 `3`：**`finally` 里的 `return` 会覆盖 `try` / `catch` 的 `return`**，直接终结函数。
- `g()` 返回 `1`：`finally` 只改了局部变量 `x`，但 `return x` 的**返回值在进入 `finally` 前就已确定**，`finally` 里的改动不影响它。

各种组合的结果一览：

| 场景 | 返回值 |
| --- | --- |
| `try` 有 `return`，`finally` 无 `return` | `try` 的值 |
| `try` 有 `return`，`finally` 也有 `return` | `finally` 的值（覆盖前者） |
| `try` 无 `return`，`finally` 有 `return` | `finally` 的值 |
| `finally` 中 `throw` | 抛异常，覆盖前面的 `return` |
| `finally` 改了返回对象的属性 | 生效（返回的是引用） |

## 原理讲解

`try` 块的 `return` 不会立刻返回，而是先把返回值暂存起来，等 `finally` 执行完毕才真正返回。所以 `finally` 里的 `return` / `throw` 会「接管」函数的出口。

```js run
function withFinallyReturn() {
  try {
    return 'try'
  } finally {
    return 'finally'
  }
}
console.log('A:', withFinallyReturn()) // finally 覆盖 try

function finallyMutatesPrimitive() {
  let v = 'try'
  try {
    return v
  } finally {
    v = 'finally' // 改的是局部变量，返回值已锁定
  }
}
console.log('B:', finallyMutatesPrimitive()) // try

function finallyMutatesObject() {
  const obj = { v: 'try' }
  try {
    return obj
  } finally {
    obj.v = 'finally' // 返回的是同一引用，属性改动生效
  }
}
console.log('C:', finallyMutatesObject().v) // finally

function finallyThrows() {
  try {
    return 'try'
  } finally {
    throw new Error('finally 抛错')
  }
}
try {
  console.log('D:', finallyThrows())
} catch (e) {
  console.log('D 被捕获:', e.message)
}
```

```text output
A: finally
B: try
C: finally
D 被捕获: finally 抛错
```

**实际开发中的正确写法**：

1. `finally` 只做资源清理（关连接、清定时器、解锁），**不要写 `return`**，否则会静默吞掉前面逻辑的返回值。
2. 想「用完必须释放」又要返回值，先把结果存进变量，在 `finally` 之后再 `return`。
3. `finally` 里也别 `throw`，它会覆盖原始异常，让真正的错误更难定位。

## 追问与易错点

- **`finally` 里写 `return` 有什么危害？** 会覆盖 `try` 的返回值和 `catch` 捕获的异常，这正是 ESLint 规则 `no-unsafe-finally` 所禁止的写法。
- **`try` 里 `return 1`，`finally` 里 `console.log` 会影响返回值吗？** 不会，只有 `return` / `throw` / 改变返回对象的属性才会影响结果。
- **为什么 `g()` 返回 `1` 而不是 `2`？** 原始类型的返回值在 `try` 的 `return` 处就求值并暂存了，`finally` 改的是局部变量副本。
- **`finally` 一定会执行吗？** 几乎一定，除非进程直接被终止。循环里的 `break` / `continue` 也会先走 `finally`。
- **`catch` 里 `return` 了，`finally` 也有 `return`，谁赢？** 还是 `finally`，规则优先级相同，`finally` 永远最后说话。

## 相关题目

- [js-022-hoisting-tdz](/q/js/js-022-hoisting-tdz)
