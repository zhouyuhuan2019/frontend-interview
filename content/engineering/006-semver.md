---
title: 版本号 ^ 与 ~ 的区别是什么？lock 文件有什么作用？
subtopic: 包管理与版本
difficulty: junior
frequency: medium
tags: [semver, 版本号, lock文件, 依赖锁定]
order: 60
---

## 参考答案

语义化版本（semver）格式为 `MAJOR.MINOR.PATCH`：

- **MAJOR（主版本）**：有不兼容的破坏性变更；
- **MINOR（次版本）**：向后兼容的新功能；
- **PATCH（修订号）**：向后兼容的问题修复。

`^` 与 `~` 是 package.json 里的版本范围写法：

| 写法 | 等价范围 | 含义 |
| --- | --- | --- |
| `^1.2.3` | `>=1.2.3 <2.0.0` | 允许升级次版本和修订号（锁定主版本） |
| `~1.2.3` | `>=1.2.3 <1.3.0` | 只允许升级修订号（锁定次版本） |

注意 **`0.x` 的特例**：主版本为 0 视为「开发中，任何变更都可能破坏兼容」，所以 `^0.2.3` 等价于 `>=0.2.3 <0.3.0`，行为退化成 `~`。

**lock 文件的作用**：把整棵依赖树中每个包的**精确版本、下载地址、完整性 hash** 全部记录下来，保证任何人在任何机器、任何时间安装，得到的 node_modules 完全一致，即「可复现构建」。

## 原理讲解

**为什么只有 package.json 不够**：`^1.2.3` 是范围不是版本。今天安装解析到 1.2.3，半年后库发布了 1.3.0，新同事安装就会拿到 1.3.0——「我电脑上能跑」的经典问题就来源于此。间接依赖（依赖的依赖）同样按范围解析，差异会被放大到整棵树。

**lock 文件记了什么**（以 package-lock.json 为例）：

```json
{
  "packages": {
    "node_modules/lodash": {
      "version": "4.17.21",
      "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
      "integrity": "sha512-v2kDEe57lecTula..."
    }
  }
}
```

- `version`：锁定精确版本；
- `resolved`：锁定下载地址（配合私有 registry）；
- `integrity`：内容 hash，防止包被篡改。

**工程约定**：

1. **应用项目必须提交 lock 文件**到仓库，CI 上用 `npm ci`（严格按 lock 安装，不写回）；
2. **库（library）通常不发布 lock**，因为库最终会被装进使用方的依赖树，范围声明反而更友好；
3. 升级依赖用 `npm update xxx` 或手动改版本后重装，让 lock 的变化进入 code review。

**其他范围写法**：`1.2.3`（精确锁定）、`*`（任意版本）、`>=1.2.3 <2.0.0`（区间）、`latest` 等 tag，理解 `^` / `~` 后都可举一反三。

## 追问与易错点

- **`^` 和 `~` 哪个更安全？** `~` 更保守（只吃 bugfix）；`^` 是 npm 默认，信任「次版本不破坏兼容」的 semver 约定——但约定靠人遵守，lock 才是兜底。
- **lock 文件冲突怎么解决？** 不要手工逐行改，保留一方版本后重新 `npm install` 让工具重新校准生成。
- **为什么删掉 lock 重装后 bug 出现/消失了？** 说明问题来自某个间接依赖的新版本，用 `npm ls 包名` 定位是哪条依赖链引入的。
- **dependencies 和 devDependencies 有什么区别？** 运行时需要的放前者（会进入使用方的依赖树），构建/测试工具放后者；写库时还要留意 `peerDependencies`。

## 相关题目

- [engineering-005-npm-pnpm](/q/engineering/engineering-005-npm-pnpm)
