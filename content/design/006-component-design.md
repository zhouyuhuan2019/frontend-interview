---
title: 设计一个通用组件（如表格/弹窗）要考虑什么？
subtopic: 组件库设计
difficulty: middle
frequency: medium
tags: [组件设计, API 设计, 插槽, 受控非受控, 组件库]
order: 60
---

面试官：如果让你为组件库设计一个通用表格/弹窗组件，你会怎么设计 API、怎么权衡灵活性？

## 参考答案

通用组件设计的本质是**在「易用」和「灵活」之间找平衡**。回答框架：明确职责边界 → 设计 API 分层 → 预留扩展点 → 考虑工程细节。

四个核心维度：

1. **职责单一**：组件只负责「展示 + 交互」，数据请求、业务校验留给外部。表格不该内置写死某个接口的请求逻辑。
2. **API 分层**：
   - 常用配置做成 props（如 `columns`、`dataSource`、`loading`）——声明式、门槛低；
   - 定制渲染走插槽/渲染函数（如单元格、表头、空状态、展开行）——应对长尾需求；
   - 行为定制留事件与受控属性（`@sort-change`、`v-model:page`）。
3. **受控与非受控并存**：弹窗的 `v-model:visible`、表格的页码/排序状态，既支持外部完全接管（受控），也支持给默认值后自管理（非受控），两种用户都照顾到。
4. **工程细节**：性能（大数据虚拟滚动、避免深层 watch）、可访问性（ARIA、键盘导航、焦点管理）、主题定制（CSS 变量/Design Token）、类型完备（TS 泛型让 `columns` 的 `dataIndex` 有提示）。

## 原理讲解

以**表格**为例，API 骨架：

```vue
<script setup lang="ts">
interface Column<T = any> {
  title: string
  dataIndex: keyof T
  width?: number
  sortable?: boolean
  fixed?: 'left' | 'right'
}

const props = withDefaults(defineProps<{
  columns: Column[]
  dataSource: any[]
  rowKey?: string
  loading?: boolean
  pagination?: false | { current: number; pageSize: number; total: number }
}>(), { rowKey: 'id' })

const emit = defineEmits<{
  'update:pagination': [page: { current: number; pageSize: number }]
  'sort-change': [sorter: { field: string; order: 'asc' | 'desc' | null }]
}>()
</script>
```

关键设计决策：

- **插槽分级**：默认按 `dataIndex` 渲染文本；提供具名插槽（`#cell-status`）或作用域插槽（`#cell="{ record, column }"`）覆盖任意单元格。作用域插槽要把 `record / index / column` 都暴露出去，用户才可能做复杂渲染。
- **空态/加载/错误三态**：都有默认 UI，也都能被插槽替换——最容易被漏掉的恰是「非 happy path」。
- **弹窗类组件**的要点：Teleport 挂到 body 避免被父级 `overflow: hidden` 裁剪；层级管理（z-index 栈）支持弹窗套弹窗；打开时锁定 body 滚动、焦点收进弹窗（focus trap）、Esc 可关（可配置）。

**设计时主动拒绝的能力**也要想清楚：表格不内置增删改查按钮、弹窗不内置表单——组合优于大而全，否则 props 会爆炸成「配置地狱」。

**一致性约定**：整个组件库统一命名（`visible` vs `open` 别混用）、统一尺寸档位（`small/middle/large`）、统一回调签名（`(value, extra)`），这些比单个组件的实现更能体现设计功力。

## 追问与易错点

- **props 和插槽怎么分工？** 数据与开关用 props，结构定制用插槽。判断标准：传进来的是「值」还是「UI」。全部用 props 配 UI（如 `renderXxx` 函数 prop 泛滥）会让模板僵化，全部用插槽又抬高简单场景的成本。
- **表格大数据量怎么办？** 分页是第一道；必须单页展示时上虚拟滚动，注意固定列+虚拟滚动的组合复杂度，可参考设计-001 的思路。
- **受控与非受控混用的坑？** 同一状态不能既受控又自管理。惯例是：传了受控值就以 props 为准（emit 更新事件由外部决定），没传则内部 state 生效，`watch` props 变化时同步。
- **弹窗 `v-model` 双向绑定还有什么细节？** 关闭时要 emit 更新，否则父组件的 `visible` 与内部状态脱节；异步关闭（如确认按钮 loading）要区分「请求关闭」与「真正关闭」两个事件。
- **怎么保证组件可测试、可维护？** 逻辑与视图分离（组合式函数抽离排序/分页逻辑）、props 收敛（对象化分组而非平铺几十个）、变化点（如排序交互）预留策略插槽。

## 相关题目

- [design-001-virtual-scroll](/q/design/design-001-virtual-scroll)
