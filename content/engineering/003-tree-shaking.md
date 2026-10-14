---
title: Tree-shaking 的原理是什么？为什么只有 ESM 支持？
subtopic: 分包与 Tree-shaking
difficulty: middle
frequency: high
tags: [Tree-shaking, ESM, 静态分析, 副作用, 打包优化]
order: 30
---

## 参考答案

Tree-shaking 是打包器在构建时做的**死代码消除（Dead Code Elimination）**：先构建模块依赖图，标记（mark）所有被引用的导出，再在压缩阶段把从未被引用的代码**删除（shake）**。它由 Rollup 率先提出，Webpack 2 起支持。

**只有 ESM 能可靠支持**，原因一句话：ESM 的 `import` / `export` 是**静态语法结构**，依赖关系在编译期（不执行任何代码）就能确定；而 CommonJS 的 `require` 是普通函数调用，参数可以是变量、可以写在 `if` 里，静态分析无从下手。

Tree-shaking 生效的三个前提：

1. 模块必须是 ESM（`package.json` 里 `module` 字段或 `type: "module"`）；
2. 模块无副作用，或在 `package.json` 里声明 `sideEffects: false`；
3. 开启生产模式压缩（真正删除代码的是 Terser 这类压缩器，打包器只负责标记）。

## 原理讲解

以 Webpack 为例，流程分三步：

1. **构建模块图**：从入口出发，基于 ESM 的静态导入关系建图，记录每个模块的 `import` / `export`；
2. **标记使用**：分析每个导出是否被其他模块引用，未使用的导出在产物中改为「未使用」标记；
3. **压缩删除**：Terser 发现被标记为未使用的函数/变量没有任何引用，直接删掉。

一个典型例子：

```js
// math.js
export function add(a, b) { return a + b }
export function sub(a, b) { return a - b }

// main.js
import { add } from './math.js'
console.log(add(1, 2))
```

打包后 `sub` 会被完全移除。但如果是 CommonJS：

```js
const { add } = require('./math') // require 是运行时调用
```

打包器无法确定 `math` 里到底哪些会被用到（可能有人写 `require(condition ? './a' : './b')`），只能整个保留。

**副作用是最大的陷阱**。有些模块「没有导出但也有意义」，比如 polyfill、注册样式、全局补丁。如果贸然标记未使用就删除，功能会直接丢失。所以用 `sideEffects` 字段显式声明：

```json
{
  "sideEffects": ["*.css", "./src/polyfill.js"]
}
```

数组中列出的文件会被保留，其余文件可被安全删除；`false` 表示整个包都无副作用。

## 追问与易错点

- **为什么用了 ESM 打包体积还是很大？** 常见原因：依赖只提供了 CJS 入口（如老版本 lodash）、没声明 `sideEffects: false`、或用了 `import _ from 'lodash'` 这种全量引入写法。
- **Babel 转译会影响 Tree-shaking 吗？** 会。`@babel/preset-env` 默认把 ESM 转成 CJS，需要设置 `modules: false` 保留 ESM，交给打包器处理。
- **Tree-shaking 能去掉「定义了但没执行的代码」吗？** 不能。它只删「未被引用的导出」；已引用导出里的无用分支不归它管，那是压缩器和业务逻辑优化的范畴。
- **`sideEffects: false` 是银弹吗？** 不是。声明错了会导致 polyfill、样式、全局注册代码被误删，且这类问题很难排查。

## 相关题目

- [engineering-002-module-system](/q/engineering/engineering-002-module-system)
- [engineering-004-code-splitting](/q/engineering/engineering-004-code-splitting)
