---
title: npm/yarn/pnpm 有什么区别？幽灵依赖是什么？
subtopic: 包管理与版本
difficulty: middle
frequency: medium
tags: [pnpm, npm, yarn, 幽灵依赖, 依赖管理]
order: 50
---

## 参考答案

| 维度 | npm | yarn (classic) | pnpm |
| --- | --- | --- | --- |
| 安装结构 | 扁平 node_modules（v3+） | 扁平 node_modules | **非扁平**，符号链接 + 硬链接 |
| 磁盘占用 | 每个项目一份拷贝 | 同左 | 全局 store 硬链接，跨项目共享 |
| 安装速度 | 慢 | 较快（并行 + 缓存） | 最快 |
| 幽灵依赖 | 存在 | 存在 | **天然杜绝** |
| monorepo | workspaces | workspaces | workspaces（最成熟） |

**幽灵依赖（Phantom Dependency）**：指代码里 `require` / `import` 了一个**没有声明在自己 `package.json` 里**的包，却能正常工作——因为扁平结构把间接依赖提升到了 node_modules 顶层。隐患：一旦直接依赖升级、不再传递该包或版本变化，代码立刻崩。

**pnpm 为什么能杜绝**：pnpm 的 node_modules 顶层只放 `package.json` 里声明的依赖（符号链接），真实文件存在 `.pnpm` 虚拟目录里，间接依赖不会提升到顶层，没声明就找不到。

简单记法：**npm/yarn 解决的是「装得上」，pnpm 解决的是「装得准」**。

## 原理讲解

**扁平化是怎么来的**：npm v2 时代 node_modules 是嵌套结构，导致 Windows 路径过长、同一包重复安装。npm v3 起改成扁平提升（hoisting），把依赖尽量铺平到顶层——解决了旧问题，却制造了幽灵依赖和**依赖分身**（同一包的不同版本，提升到顶层的只有一个，其余仍嵌套）。

**pnpm 的三层结构**：

1. **全局 store**：所有包文件按内容 hash 只存一份，多项目间用**硬链接**共享，几乎不占额外磁盘；
2. **`.pnpm` 虚拟目录**：按 `包名@版本` 存放每个依赖（硬链接自 store），内部再用符号链接连上它自己的依赖，形成精确的依赖图；
3. **项目 node_modules 顶层**：只放直接依赖的**符号链接**，指向 `.pnpm`。

```bash
node_modules
├── .pnpm
│   ├── lodash@4.17.21
│   └── react@18.2.0
└── react -> .pnpm/react@18.2.0/node_modules/react
```

这样「你能访问什么」完全由你的 `package.json` 决定，恢复了语义正确性，同时用链接避免了重复拷贝。

安装速度上，pnpm 也快在「跳过重复下载」：store 里已有的包直接硬链接，加上全局缓存命中率高，CI 冷启动安装通常比 npm/yarn 快一倍以上。

**取舍**：pnpm 的严格隔离会让一些「依赖幽灵依赖才能跑」的老包/工具报错，可在 `.npmrc` 里配 `shamefully-hoist=true` 或 `public-hoist-pattern` 局部提升来兼容；符号链接在极少数老工具下也可能有兼容问题。

## 追问与易错点

- **怎么检查项目里有没有幽灵依赖？** 最彻底的办法是换 pnpm 装一遍跑起来；也可用 `depcheck` 或 `eslint-plugin-import` 的 `no-extraneous-dependencies` 规则静态扫描。
- **npm ci 和 npm install 有什么区别？** `npm ci` 严格按 lock 文件安装（删掉 node_modules 重装），用于 CI 保证可复现；`install` 可能按 semver 范围解析并更新 lock。
- **yarn berry（PnP）是什么思路？** 干脆不要 node_modules，用 `.pnp.cjs` 映射表在运行时拦截 `require`、直接定位到缓存 zip，同样杜绝幽灵依赖，但生态兼容性挑战更大。
- **monorepo 选哪个？** pnpm workspaces 综合体验最好（隔离严格 + 磁盘省）；Turborepo/Nx 是任务编排工具，与之正交，可叠加使用。
- **「依赖分身」会带来什么实际问题？** 同一包的多个版本并存时，单例会失效——比如 React 被打进两份会导致 hooks 报错、全局状态库各存一份状态。排查用 `npm ls 包名` 看版本分布。
- **yarn 相比 npm 还有优势吗？** yarn classic 的核心创新（lock 文件、并行安装、离线缓存）如今 npm 都已具备，二者差异不大；真正的分化在 pnpm 与 yarn berry（PnP）这两条路线。

## 相关题目

- [engineering-006-semver](/q/engineering/engineering-006-semver)
