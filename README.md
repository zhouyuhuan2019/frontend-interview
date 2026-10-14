# 前端面试题库

一个纯前端的「前端面试题目」教学站点：每道题包含 **问题 → 参考答案 → 原理讲解**，覆盖 JS 基础、HTML/CSS、浏览器与网络、Vue 2/3、React、工程化、手写题与场景设计题。

技术栈：Vue 3 + Vite + TypeScript + markdown-it + Shiki + MiniSearch。

## 快速开始

> 项目要求 Node >= 20（见 `.nvmrc`）。

```bash
nvm use 20      # 使用 Node 20
npm install
npm run dev     # 本地开发，默认 http://localhost:5173
```

其它命令：

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 类型检查 + 生产构建（输出 `dist/`） |
| `npm run preview` | 预览生产构建产物 |
| `npm run type-check` | 仅做 TypeScript 类型检查 |

## 目录结构

```
content/                 题目与分类的内容源（唯一需要你维护的地方）
  categories.yml         分类元数据（id / 标题 / 顺序 / 简介 / 分组小标题）
  js/001-xxx.md          一道题 = 一个 Markdown 文件，一级目录名即分类 id
src/
  content/               内容解析层（读文件、解析 frontmatter、归一化）
  composables/           业务逻辑（内容、搜索、高亮、运行、主题等）
  components/            展示组件（布局 / 通用 / 代码 / 题目）
  views/                 页面（首页 / 分类页 / 题目页 / 404）
  styles/                SCSS（编译期 tokens + 运行期主题变量）
```

## 新增一道题（核心工作流）

**只需要新建一个 Markdown 文件，不用改任何代码。**

1. 在 `content/` 下找到对应分类目录（没有就新建目录，目录名即分类 id，如 `js`、`vue3`）。
2. 新建文件，文件名建议 `序号-关键词.md`（如 `005-this-binding.md`），序号用于稳定排序。
3. 写入 frontmatter + 正文，保存即可。开发服务器会热更新，题目立即出现在侧栏与搜索里。

最简写法（只有 `title` 也能跑，其余字段自动兜底）：

```markdown
---
title: 这里写面试官会问的问题？
---

## 参考答案

这里是简明结论。

## 原理讲解

这里是展开讲解，可以写多段、列表、代码块。
```

### frontmatter 字段

| 字段 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- |
| `title` | 推荐 | 题目标题（就是「问题」本身） | `（未命名题目：文件名）` |
| `id` | 否 | 全局唯一 id；也是题目页地址的一部分 | `${分类目录}-${文件名}` |
| `subtopic` | 否 | 二级分组小标题，建议与 `categories.yml` 的 `subtopics` 对齐 | 空 |
| `difficulty` | 否 | 难度：`junior` / `middle` / `senior` | `middle` |
| `frequency` | 否 | 面试频率：`high` / `medium` / `low` | `medium` |
| `tags` | 否 | 标签数组，参与搜索加权，如 `[闭包, 内存, 垃圾回收]` | `[]` |
| `stack` | 否 | 关联技术栈数组，如 `[vue3]` | `[]` |
| `category` | 否 | 覆盖所属分类（默认取所在目录名） | 目录名 |
| `order` | 否 | 分类内排序（升序） | `999` |
| `related` | 否 | 相关题目 id 数组 | `[]` |
| `updated` | 否 | 最近更新日期（字符串） | 空 |
| `draft` | 否 | 置 `true` 可标记草稿 | `false` |

> 缺字段不会报错，只会在控制台 `console.warn` 提示，保证「加题不阻塞开发」。

### 正文的推荐结构

**第一个 `## 参考答案`（或 `## 答案`）标题之前的内容视为「题干」**，始终展示在页面上；自该标题起的内容视为「答案」，默认折叠。没有该标题时，全文都作为答案。

- 概念题（标题即完整问题，如「var、let、const 有什么区别？」）可以不写题干；
- 代码分析题（如「下面这段代码的输出是什么？」）必须把被分析的代码写进题干，否则读者看不到题目。

答案区用 `##` 分节即可，常见三节：`## 参考答案`、`## 原理讲解`、`## 追问与易错点`。

带题干的完整示例：

````markdown
---
title: 下面这段代码的输出顺序是什么？
---

请写出下面这段代码在浏览器中的输出顺序，并说明原因：

```js
console.log('script start')
setTimeout(() => console.log('setTimeout'), 0)
Promise.resolve().then(() => console.log('promise then'))
console.log('script end')
```

## 参考答案

输出顺序是：script start → script end → promise then → setTimeout。
````

### 代码块

普通代码块会自动语法高亮并可复制：

````markdown
```js
const a = 1
```
````

在语言后追加标记，可开启额外能力：

| 标记 | 作用 | 示例 |
| --- | --- | --- |
| `run` | 在浏览器内可编辑并运行（仅 `js` / `ts` 有效） | ` ```js run ` |
| `readonly` | 可运行但不可编辑 | ` ```js run readonly ` |
| `output` | 渲染为「期望输出」面板（纯文本，不高亮、不运行） | ` ```text output ` |
| `title="..."` | 给代码块加标题 | ` ```js run title="防抖实现" ` |

运行能力由 Web Worker 提供：代码在独立线程执行，`console.log` / 返回值 / 异常都会回传到输出面板；超过 `runTimeoutMs`（默认 3 秒，见 `src/config/app.ts`）会强制终止，**不会卡住页面**。

语言别名会自动归一化（`js`→`javascript`、`ts`→`typescript`、`sh`→`bash`、`yml`→`yaml`）；未注册的语言自动降级为纯文本，不会报错。

### 题目之间互相引用

正文里直接写站内链接即可（`id` 就是地址）：

```markdown
- [相关题目：var / let / const](/q/js/js-001-var-let-const)
```

## 新增 / 调整分类

编辑 `content/categories.yml`，每一项：

```yaml
- id: js                 # 必须与 content/ 下的目录名一致
  title: JS 基础           # 侧栏显示名
  order: 10               # 侧栏排序（升序）
  desc: 变量、类型、原型、闭包、事件循环
  subtopics:              # 分类页的分组小标题
    - 变量与作用域
    - 闭包
```

若某分类目录在 `categories.yml` 中没有登记，站点会自动按目录名生成一个分类兜底（排到末尾）。

## 常用配置

`src/config/app.ts`：

- `runTimeoutMs`：代码运行超时时间。
- `searchDebounceMs`：搜索输入去抖时间。
- `DIFFICULTY_LABEL` / `FREQUENCY_LABEL`：难度与频率的展示文案。

界面为单一浅色主题，不再提供深浅色切换。
