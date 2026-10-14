---
title: ESM 与 CommonJS 有什么区别？为什么 ESM 更利于 Tree-shaking？
subtopic: 模块化规范
difficulty: middle
frequency: medium
tags: [ESM, CommonJS, Tree-shaking, 模块化, 循环依赖]
order: 20
---

## 参考答案

| 维度 | ESM | CommonJS |
| --- | --- | --- |
| 语法 | `import` / `export` | `require` / `module.exports` |
| 加载时机 | 静态解析，编译期确定依赖 | 运行时执行到才加载 |
| 加载方式 | 异步 | 同步 |
| 值的绑定 | **实时绑定**（live binding） | 值拷贝 |
| 顶层 await | 支持 | 不支持 |
| Tree-shaking | 支持 | 基本不支持 |

关键差异是 **ESM 的 import / export 是静态结构**：依赖关系在语法层就能确定，打包器可以在不执行代码的前提下分析出「哪些导出从未被使用」，进而删除它们。CommonJS 的 `require` 是函数调用，参数可以是变量、可以写在条件分支里，静态分析几乎无从下手。

## 原理讲解

**实时绑定 vs 值拷贝**，这是最容易被忽视的差异：

```js
// ESM：counter.js
export let count = 0
export function inc() { count += 1 }

// ESM：main.js
import { count, inc } from './counter.js'
inc()
console.log(count) // 1 —— 实时绑定，读到的是最新值
```

```js
// CommonJS：counter.js
let count = 0
module.exports = { count, inc: () => { count += 1 } }

// CommonJS：main.js
const { count, inc } = require('./counter.js')
inc()
console.log(count) // 0 —— 拿到的是导出那一刻的拷贝
```

**循环依赖**表现也不同：ESM 因为实时绑定，在依赖环中访问尚未初始化的绑定时抛 `ReferenceError`（类似 TDZ）；CommonJS 则返回「当时已执行部分」的不完整 `exports`，容易拿到 `undefined`。

**Tree-shaking 生效的前提**：
1. 代码是 ESM（或能静态分析）；
2. 没有副作用，或已在 `package.json` 声明 `sideEffects: false`；
3. 打包器能正确标记未使用的导出（生产模式开启压缩）。

## 追问与易错点

- **`exports` 字段的 `import` / `require` 条件有什么用？** 让同一个包对 ESM 与 CJS 分别暴露入口，是「双格式包」的标准做法，能同时支持两种消费者。
- **为什么有些库 `import` 会报错？** 包只提供了 CJS 入口，或被 Node 判定为 CJS 而用了 ESM 语法；需要检查 `type: "module"` 与 `exports` 配置。
- **`import()` 动态导入和静态 `import` 有什么区别？** 动态导入返回 Promise，可在运行时按条件加载，常用于路由懒加载与分包。
- **`import` 会被提升吗？** 会，静态 import 会被提升到模块顶部，因此不能靠语句顺序控制执行时机。

## 相关题目

- [engineering-001-vite-hmr](/q/engineering/engineering-001-vite-hmr)
