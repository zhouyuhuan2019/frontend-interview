# 移动端适配方案

## Context

用户会把这个前端面试题库打包成一个 HTML，在手机浏览器里打开阅读，因此窄屏（约 375–430px）的排版必须可用、不能出现横向溢出或挤成一团。

当前项目已有**基础**移动端适配：≤900px 隐藏左侧目录栏、改用抽屉（`AppDrawer`）、顶部显示汉堡按钮、隐藏 header 副标题。但仍存在几处窄屏可用性问题，本方案只做移动端布局/样式的加固，**不涉及打包脚本、路由或打包插件**（用户明确表示打包由其自行处理）。

## 现状（已确认）

- 断点与 mixin：`src/styles/tokens.scss` 中 `$bp-sm:640px / $bp-md:900px / $bp-lg:1200px`，`@mixin media($max)` 按「小于等于」书写；侧栏移动判定在 `src/composables/useSidebar.ts` 用 `(max-width: 899px)`（与 `$bp-md` 对应）。
- `src/App.vue`：≤900px 隐藏 `.app__sidebar`，目录改由 `AppDrawer` 承载；`.app__body` ≤900px `padding: 0 $space-lg`。
- `src/components/layout/AppHeader.vue`：≤900px 显示汉堡按钮、隐藏 `.app-header__subtitle`；`.app-header__search { flex: 1; max-width: 420px }`；搜索下拉 `.app-header__panel` 用 `position: absolute` 相对 `.app-header__search` 定位 → **手机上面板宽度只剩搜索框宽度，结果读不下**。图标按钮 32px（触屏偏小）。
- `src/views/QuestionView.vue`：标题 `$font-2xl`(26px)；`.question-view__pager` 为 `grid-template-columns: 1fr 1fr`（窄屏两列偏挤）；`.question-view__answer-head` 为横向 flex（提示语 + 按钮，窄屏会挤）。
- `src/styles/markdown.scss`：`table { width: 100% }` **无横向滚动容器**；单元格未设置 `word-break` → 单元格里出现长 URL / 长标识符时会把表格撑得比容器宽，导致整页横向滚动。行内 code 与 `a` 已做 `word-break`。
- 代码相关组件窄屏已 OK，无需改动：`CodeBlock.vue` / `CodeRunner.vue` 的 `overflow-x: auto`、`CodeOutput.vue` 的 `white-space: pre-wrap`、编辑器 `textarea { width: 100% }`。
- `QuestionCard.vue` 题目卡片头部在 ≤640px 已把「查看答案」按钮移到整行，无需改动。
- **尚未核查**：`src/components/question/QuestionList.vue`、`src/components/layout/AppSidebar.vue` 的窄屏表现（实施时先读一眼，有问题按同样模式补一条媒体查询）。

## 实施步骤

### 1. Markdown 表格：可横向滚动 + 断词（核心修复）
- `src/composables/useMarkdown.ts`：覆写 `md.renderer.rules.table_open` / `md.renderer.rules.table_close`，在原有 `<table>` 外再包一层 `<div class="md-table">…</div>`（仅影响表格块，其它渲染规则不动）。
- `src/styles/markdown.scss`：
  - `.markdown-body .md-table { max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }`
  - `table` 的 `th, td` 补 `word-break: break-word; overflow-wrap: anywhere;`（避免长 token 撑破布局）。
  - 保持 `table { width: 100% }` 不变：正常表格铺满、不贴边滚动；只有内容更宽时才在 `.md-table` 内滚动。

### 2. 顶部搜索面板在手机上放宽到整屏
`src/components/layout/AppHeader.vue`：在 `@include media($bp-md)` 内让 `.app-header__panel` 改为 `position: fixed; top: $header-height; right: $space-md; left: $space-md; max-height: 70vh;`（header 本身是 `position: sticky; top: 0`，面板贴在 header 下方横跨视口宽度）。

### 3. 顶部栏窄屏减负 + 放大触控区
`src/components/layout/AppHeader.vue`：
- `@include media($bp-sm)` 下 `.app-header__titles { display: none }`（只留 `FI` logo），把宽度让给搜索框；`.app-header__inner` 的 `gap` 降到 `$space-sm`。
- `@include media($bp-md)` 下 `.app-header__icon-button { flex: 0 0 40px; width: 40px; height: 40px }`（≥40px 触控目标）。

### 4. 题目详情页窄屏排版
`src/views/QuestionView.vue`，新增 `@include media($bp-sm)` 块：
- `.question-view__title { font-size: $font-xl }`（26px → 20px）。
- `.question-view__stem`、`.question-view__answer-content` 的 `padding` 由 `$space-lg` 降到 `$space-md`。
- `.question-view__answer-head { flex-direction: column; align-items: flex-start }`。
- `.question-view__pager { grid-template-columns: 1fr }`；`.question-view__pager-item--next { text-align: left }`。

### 5. 壳层窄屏内边距
`src/App.vue`：新增 `@include media($bp-sm)` 块，`.app__body { padding: 0 $space-md }`、`.app__main { padding: $space-lg 0 $space-2xl }`，把横向空间还给内容。

### 6. 抽屉关闭按钮触控区
`src/components/common/AppDrawer.vue`：`.app-drawer__close` 尺寸 28px → 36px（仅移动端抽屉内使用，直接改即可）。

### 7. 补查（实施时确认，按需微调）
`src/components/question/QuestionList.vue`、`src/components/layout/AppSidebar.vue` 读一遍，若列表项 padding/字号在小屏仍有挤压或溢出，按第 4 步同样的媒体查询方式补一条。

## 打包注意（供你自己打包时参考，本方案不改动）
- 若用 `vite-plugin-singlefile`：当前 `src/composables/useCodeRunner.ts` 用 `new Worker(new URL('../workers/runner.worker.ts', import.meta.url), { type: 'module' })`，会产出独立 worker chunk，`file://` 下会加载失败；路由 `src/router/index.ts` 是 `createWebHistory`，`file://` 下会 404。这两点需要你在打包时自行处理（例如 worker 改 `?worker&inline`、路由改 `createWebHashHistory`）。

## 验证

1. `npm run build`（含 `vue-tsc -b` 类型检查）通过。
2. 用 browser_use 在 http 下以 iPhone 尺寸（375×812、390×844）验证：
   - 首页 / 分类页 / 题目页（挑一道含表格的题 + 一道含 `js run` 可运行代码的题）——无整页横向滚动，表格可在自身区域内左右滑动；
   - 顶部搜索输入后下拉面板占满整屏宽度、可滚动、点击结果可跳转；
   - 汉堡菜单可打开/关闭抽屉，Esc/点遮罩可关闭；
   - 代码「运行 / 重置」正常，输出区不溢出；
   - 亮/暗主题切换后样式正常。
3. `file://` 实机效果 browser_use 不支持，需你在手机上打开打包产物实测。
