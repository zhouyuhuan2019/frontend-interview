# 前端面试题库教学站点 · 初始化实施计划

## Context（为什么做这件事）

`/Users/zhouyuhuan/workspace/xy/frontend-interview` 目前是**空目录**。目标是初始化一个纯前端的「前端面试题库」教学站点：每道题包含**问题、参考答案、原理讲解**，覆盖 JS 基础 / HTML·CSS / 浏览器与网络(HTTP) / Vue2 / Vue3 / React / 工程化与性能 / 手写代码题 等市面主流考点。

核心诉求有两点：
1. **好用的教学展示**：分类导航 + 关键词搜索、代码高亮、折叠展开式答案（默认只露问题，点击展开答案与讲解）、部分 JS 题可在页面内直接编辑运行看结果、亮/暗主题切换（默认跟随系统）、移动端适配。
2. **可持续手动维护**：题目内容以「一题一个 Markdown 文件 + YAML frontmatter」的形式存在，**新增/修改题目只改内容文件，不改任何代码**。

已与用户确认的技术选型：Vue3 + Vite + TypeScript。

---

## 技术方案总览

| 关注点 | 方案 |
|---|---|
| 框架 | Vue3 组合式 API + `<script setup>` + TypeScript + Vite |
| 路由 | vue-router（4 个视图：首页 / 分类 / 题目详情 / 404） |
| 内容源 | `content/**/*.md`（一题一文件）+ `content/categories.yml`（分类元数据） |
| 内容加载 | `import.meta.glob('/content/**/*.md', { query: '?raw', import: 'default', eager: true })`，自研 frontmatter 解析（`yaml` 包，正则切头部 `---` 块），**启动只解析元信息，正文延迟到展开答案时才渲染** |
| Markdown 渲染 | `markdown-it` → 按顶层 token 切「块」；代码块交给 Vue 组件（不是整段 `v-html`） |
| 代码高亮 | `shiki`（`createHighlighterCore` + JS 正则引擎），双主题 `github-light` / `github-dark`，`defaultColor: false` 输出 `--shiki-light` / `--shiki-dark` 变量，由 `code.scss` 随 `html.dark` 切换；语言包用动态 import 自动分包 |
| 运行 JS 示例 | Web Worker（`worker.terminate()` 硬中断超时/死循环），worker 内代理 `console` + `postMessage` 回传输出；**不在主线程 eval**，运行结果一律文本插值渲染（禁止 `v-html`） |
| 搜索 | `minisearch` 7.x，中文用 CJK bigram 分词（不依赖 `Intl.Segmenter`），索引 title / tags / 分类 / 正文 |
| 状态管理 | 不引 Pinia。`useContent` / `useSearch` 等为**模块级单例 composable**，符合「数据驱动、少冗余」偏好 |
| 主题 | 亮 / 暗双主题，默认跟随系统偏好；右上角按钮手动切换，选择写入 localStorage（键 `fi-theme`）；`useTheme` + `index.html` 内联脚本防闪白 |
| 移动端 | `useMediaQuery` 控制侧栏抽屉；折叠动画用 `grid-template-rows` 过渡 + `<details>` |
| 样式 | SCSS：`tokens.scss`（编译期变量，全局注入）+ `themes.scss`（运行期 `--c-*` CSS 变量）+ `mixins.scss`；组件一律 **BEM** 命名、按模块注释分区 |

**环境前置**：Vite 新版要求 Node ≥ 20.19。当前 shell 默认 `node v18.20.4`，`~/.nvm` 已存在。实施第一步先 `nvm use 20` 并落 `.nvmrc` + `package.json#engines`。

---

## 目录结构

```
frontend-interview/
├─ .nvmrc                     # 20
├─ index.html                 # 应用入口
├─ package.json  tsconfig.json  tsconfig.app.json  tsconfig.node.json  vite.config.ts  env.d.ts
├─ README.md                  # 如何新增题目（面向维护者）
├─ content/                   # 纯内容，置于 src 外，不进 TS 编译
│  ├─ categories.yml          # 分类元数据
│  ├─ js/  html-css/  network/  vue2/  vue3/  react/  engineering/  handwriting/
│  └─ （每目录下 001-xxx.md、002-xxx.md …）
├─ .trae/documents/frontend-interview-site-init.md
└─ src/
   ├─ main.ts  App.vue  router/index.ts  config/app.ts
   ├─ styles/ tokens.scss  mixins.scss  themes.scss  markdown.scss  _code.scss
   ├─ content/     # 纯逻辑层（可单测，不 import Vue）
   │   ├─ types.ts    # QuestionMeta / QuestionRecord / MdBlock
   │   ├─ loader.ts   # glob + frontmatter 解析
   │   ├─ fence.ts    # ```js run title="x" 语法解析
   │   └─ schema.ts   # 字段默认值 + 运行时校验（缺失 title 等仅 warn，不阻塞）
   ├─ composables/
   │   ├─ useContent.ts  useSearch.ts  useShiki.ts  useMarkdown.ts
   │   ├─ useCodeRunner.ts  useTheme.ts  useSidebar.ts
   ├─ components/
   │   ├─ layout/   AppHeader.vue  AppSidebar.vue  AppSidebarGroup.vue
   │   ├─ common/   BaseTag.vue  BaseButton.vue  BaseSearch.vue  DifficultyBadge.vue  AppDrawer.vue
   │   ├─ question/ QuestionCard.vue  QuestionList.vue  AnswerPanel.vue  MarkdownRenderer.vue
   │   └─ code/     CodeBlock.vue  CodeRunner.vue  CodeOutput.vue
   ├─ views/  HomeView.vue  CategoryView.vue  QuestionView.vue  NotFoundView.vue
   └─ workers/ runner.worker.ts
```

### 分层职责（UI / 逻辑分离硬线）
- `src/content/*`：纯函数与数据变换，**禁止 import Vue / 碰 DOM**。
- `src/composables/*`：响应式包装、缓存、派生、生命周期；**禁止写模板/样式、禁止 `import.meta.glob`**（glob 是 loader 的职责）。
- `src/components/*`：只渲染 props、发事件、复用 composable；**禁止直接读 md、禁止写业务规则**。
- `src/views/*`：路由参数 → composable → 组件，不写复杂逻辑。

---

## 关键机制细节

### 1. frontmatter 字段规范（`src/content/schema.ts`）
| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `title` | string | ✅ | — | 题目内容 |
| `id` | string | ✖ | `目录名-文件名` | 深链 `/q/:category/:id` |
| `category` | string | ✖ | 目录名 | 与目录冲突时以字段为准 |
| `subtopic` | string | ✖ | `''` | 二级主题，分类页分组用 |
| `difficulty` | `junior\|middle\|senior` | ✖ | `middle` | 难度徽标 |
| `tags` | string[] | ✖ | `[]` | 搜索/筛选主入口 |
| `stack` | string[] | ✖ | `[]` | vue2/vue3/react，跨分类筛选用 |
| `order` | number | ✖ | `999` | 分类内排序，缺省按 title 排 → **加题无需改代码** |
| `frequency` | `high\|medium\|low` | ✖ | `medium` | 面试频率 |
| `related` | string[] | ✖ | `[]` | 相关题 id |
| `updated` | date | ✖ | — | 最近更新 |
| `draft` | boolean | ✖ | `false` | true 不进站点 |

正文约定（不强制、渲染器不依赖）：`## 参考答案` / `## 原理讲解` / `## 追问与易错点` / `## 相关题目`。

代码块语法（不改 md 方言，仅用 fence info）：
- ` ```js run ` → 可编辑可运行
- ` ```js run readonly ` → 只读但可运行
- ` ```text output ` → 期望输出面板（自测对比）
- 其他语言 → 普通高亮 + 复制按钮 + 语言标签

### 2. 新增一道题的完整流程（零代码改动）
1. 在 `content/<分类>/` 下新建 `007-xxx.md`（文件名 slug，序号前缀便于本地排序）。
2. 填 frontmatter（只有 `title` 必填）→ 写正文三个小节。
3. 保存 → Vite 监听 `content/` 变化，eager glob 触发页面刷新，新题自动出现在侧栏与搜索索引。
4. 若是新分类：在 `content/categories.yml` 追加一条即可（数据文件，非代码）。

### 3. 安全性
- Worker 无 `document`，改不了页面 DOM / localStorage；为收紧会把 worker 内 `fetch` 置空。
- 运行输出用文本插值渲染，**禁止 `v-html`**。
- 正文 `v-html` 只渲染本仓库自有的受信 md 内容。
- 未来若加 CSP：需 `script-src 'unsafe-eval'` + `worker-src 'self' blob:`。

---

## 分类体系（`content/categories.yml` 初始内容）

| id | 一级分类 | 子主题示例 |
|---|---|---|
| `js` | JS 基础 | 变量与作用域 / 类型与隐式转换 / this 绑定 / 原型链与继承 / 闭包 / 事件循环与 Promise / 数组与对象方法 / ES6+ / 模块化 |
| `html-css` | HTML 与 CSS | 语义化 / 盒模型与 BFC / 定位与层叠上下文 / Flex / Grid / 响应式适配 / 单位与 clamp / 选择器优先级 / 回流重绘 / 经典布局题 |
| `network` | 浏览器与网络 | HTTP 方法与状态码 / 请求响应头 / 强缓存与协商缓存 / Cookie 与 Storage / 同源跨域 CORS / HTTPS 与 TLS / HTTP1-3 / DNS-TCP / 渲染流程 / 事件机制 / LCP-CLS-INP / XSS-CSRF-CSP |
| `vue2` | Vue 2 | defineProperty 响应式 / 生命周期 / 组件通信 / v-model / 插槽 / mixin / nextTick / 虚拟 DOM 与 diff / keep-alive / Vuex |
| `vue3` | Vue 3 | Composition API / Proxy 响应式 / ref vs reactive / computed vs watch / 生命周期对照 / provide-inject / 编译优化 patchFlag / Pinia / Teleport / 可复用 composable 设计 |
| `react` | React | JSX / props 与 state / useState 批处理 / useEffect 与依赖 / 闭包陷阱与 useRef / useMemo-useCallback / Hooks 规则与原理 / Context / memo 与 key / 合成事件 / Fiber 调和 / 与 Vue 对比 |
| `engineering` | 工程化与性能 | 构建工具与 HMR / 分包与 Tree-shaking / ESM vs CJS / TS 基础 / 包管理与语义化版本 / 规范与提交 / 性能优化清单 / 监控埋点 / 微前端 / SSR 同构 / CI-CD 与 CDN |
| `handwriting` | 手写代码题 | 手写 Promise / debounce-throttle / call-apply-bind / new / 深拷贝 / instanceof / 柯里化-compose / 数组去重扁平化 / EventEmitter / LRU / 并发调度器 / 常见算法题 |
| `design` | 场景与设计题 | 目录与架构设计 / 组件库设计 / 大数据渲染与虚拟滚动 / 无限加载与竞态 / 权限与路由守卫 / 监控体系 / 埋点方案 / 富文本难点 |

---

## 实施步骤

1. **环境与脚手架**：`nvm use 20` → 记录 `.nvmrc`；用 Vite vue-ts 模板生成骨架并清理示例代码；配 `engines`、tsconfig（`@vue/tsconfig` base）、`env.d.ts`、别名 `@`→`src`、`@content`→`content`。
   - 依赖安装时**以 npm registry 实际可用的最新兼容版本为准**（先 `npm view <pkg> version` 校验），不照搬任何预估版本号；Vite 新版若已改名 `rollupOptions`→`rolldownOptions`，按实际报错调整，不写对象式 `manualChunks`。
2. **样式与主题**：`tokens.scss`（仅编译期变量与断点）+ `mixins.scss`（`media()` 等）+ `themes.scss`（亮/暗 `--c-*` CSS 变量）+ `_code.scss`（Shiki 双主题变量映射）；`useTheme` + `index.html` 内联防闪白。跑通「切主题不重渲染」。
3. **内容层**：`content/types.ts`、`loader.ts`、`fence.ts`、`schema.ts`、`useContent.ts`；写 `categories.yml`；写 **8 道样例题**（覆盖 `js` 高亮、`js run` 可运行、`text output` 三种代码块，每个分类至少 1 道，JS 分类多几道）。
4. **展示层**：`useShiki` + `useMarkdown` + `MarkdownRenderer` + `CodeBlock` + `QuestionCard` + 折叠展开答案 → 此时站点已基本可用（导航 + 折叠答案 + 高亮 + 复制）。
5. **代码运行**：`runner.worker.ts` + `useCodeRunner` + `CodeRunner` + `CodeOutput`；专门加一道「死循环/超时」题验证父页不卡、超时被硬中断。
6. **搜索**：`useSearch`（MiniSearch + CJK bigram）+ `BaseSearch` + 搜索结果视图。
7. **布局与响应式**：`AppHeader` / `AppSidebar` / `AppDrawer` + 移动端抽屉 + 折叠动画 + 深链自动展开对应题目。
8. **收尾**：写 `README.md`（维护者如何新增题目、frontmatter 字段表、代码块语法），跑 `type-check` 与 `build` 确认无错。

---

## 需要避开的坑（核实过）

- 不用 `vite-plugin-md`（把 md 编译成 SFC，运行时拿不到原文，搜索/懒渲染会废）。
- 不用 `gray-matter`（顶层 `require('fs')`，浏览器构建行为不可控）；frontmatter 用 `yaml` 包 + 正则切头部。
- 不用 `@shikijs/markdown-it`（会引入第二份 markdown-it 实例）；自写 fence 处理直接调用 highlighter。
- 不在组件里写 `import.meta.glob`（归 loader）。
- 不在主线程 `eval`/`new Function`；运行输出不走 `v-html`。
- `markdown-it` 自带类型，不装 `@types/markdown-it`；token 类型用 `ReturnType<MarkdownIt['parse']>[number]` 而非内部路径。

---

## 验证方式

1. `nvm use 20 && npm run dev` → 打开 `http://localhost:5173`：
   - 首页/侧栏能列出全部样例题，按分类分组、按 `order` 排序。
   - 点击题目 → 默认只显示问题；点「查看答案」展开参考答案 + 原理讲解。
   - 代码块有语言标签、复制按钮、语法高亮。
   - `js run` 的题可在页面内编辑并点运行，输出面板正确显示 `console.log` 结果、返回值与错误；超时题报「执行超时已强制终止」且**父页面不卡**。
   - 搜索「闭包」「事件循环」「Proxy」等关键词能命中对应题目。
   - 右上角切暗色主题：页面与代码块配色同步变化，**无闪烁、无重渲染**。
   - 窗口缩到手机宽度：侧栏变抽屉可展开，内容可正常阅读。
2. **维护性验证**：新建 `content/js/099-test.md` 只填 `title` → 保存后新题立即出现在侧栏与搜索结果，`git status` 中无任何 `.ts/.vue` 改动。
3. `npm run type-check` 与 `npm run build` 均通过；`npm run preview` 可正常浏览生产构建。
