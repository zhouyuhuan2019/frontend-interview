---
title: scoped 样式为什么穿透不了子组件？::v-deep 该怎么用？
subtopic: 样式与 scoped
difficulty: junior
frequency: high
tags: [Vue2, scoped, 样式穿透, ::v-deep, CSS]
order: 150
related: [vue2-008-slot, html-css-007-selector-specificity]
---

父组件想改一下自定义子组件（或 Element UI 这类第三方组件）内部的样式，写了 `scoped` 却改不动：

```vue
<!-- Parent.vue -->
<template>
  <div class="wrapper">
    <Child />
  </div>
</template>

<style scoped>
/* 期望把子组件内部的 .inner 改成红色，但没有生效 */
.wrapper .inner { color: red; }
</style>
```

同上，选中子组件**根元素** `.wrapper .child-root` 却又能生效。请解释：`scoped` 到底做了什么？为什么改不到子组件内部？`::v-deep` / `/deep/` / `>>>` 该用哪个、怎么写？

## 参考答案

`scoped` 不是真的「作用域隔离」，而是**编译期给选择器和模板元素都追加一个唯一属性**（如 `data-v-f3f3eg9`）：`.wrapper .inner` 编译成 `.wrapper .inner[data-v-f3f3eg9]`。子组件**内部**元素带的是**子组件自己的** `data-v-xxxx`，父组件这套属性选择器根本匹配不到，所以改不动。

结论速记：

- 只作用于**本组件模板内**的元素——这是 `scoped` 的本意。
- **子组件的根元素**会同时带上父、子两个作用域属性，所以「改子组件根元素」常常能生效，改**内部**元素才失效——这正是「有时生效有时不生效」的原因。
- 要穿透到子组件内部，用 `::v-deep`（Vue2 + 预处理器都可用，推荐）；`>>>` 有时被预处理器/浏览器拒识，`/deep/` 已废弃。

## 原理讲解

**现象**：父组件的 scoped 规则改不到子组件内部元素。

**原因**：看编译结果就清楚了。

```html
<!-- Parent.vue 模板 -->
<div class="wrapper">
  <div class="inner" data-v-a1b2c3>父组件自己的元素</div>
  <Child>   <!-- 子组件根元素会带 data-v-a1b2c3 和它自己的 data-v-d4e5f6 -->
</div>
```

```css
/* 编译前 */  .wrapper .inner { color: red; }
/* 编译后 */  .wrapper .inner[data-v-a1b2c3] { color: red; }

/* 子组件内部某元素只在子组件模板里，只有 data-v-d4e5f6，没有 a1b2c3 */
```

父亲写的 `.inner[data-v-a1b2c3]` 与子组件内部的 `.inner[data-v-d4e5f6]` 对不上，于是不生效；而子组件**根元素**被父作用域「标记」了，`a1b2c3` 存在，所以改根元素能生效。

**解决方案：样式穿透**

```vue
<!-- Parent.vue：改子组件内部元素 -->
<style scoped>
/* 正确：把 ::v-deep 放在中间当作「组合器」，后半段不再加属性后缀 */
.wrapper ::v-deep .inner { color: red; }
/* 上例编译后 → .wrapper[data-v-a1b2c3] .inner { color: red } */
</style>
```

| 写法 | 是否推荐 | 说明 |
|---|---|---|
| `.a ::v-deep .b` | ✅ 推荐 | Vue2 通用；`::v-deep` 之后的选择器不再加 scoped 属性 |
| `.a >>> .b` | ⚠️ 视情况 | 仅纯 CSS 可用，Sass/Less 等预处理器常无法解析 `>>>` |
| `.a /deep/ .b` | ❌ 废弃 | 老写法，专有，不建议再用 |
| `.a :deep(.b)` | 仅 Vue3 | 括号函数式写法，Vue2 需 2.7 + 新版 loader 才支持 |
| `.a ::v-deep .b` vs `::v-deep .a .b` | 注意位置 | 放在前面的部分仍受 scoped 限制；放在最前则整条都不加属性后缀 |

**另外两种常见做法**（有时比 deep 更稳）：

```vue
<!-- 1. 给子组件根元素加个类，直接改根元素：-- 子组件根元素带父作用域属性，无需 deep -->
<template>
  <Child class="my-child" />
</template>
<style scoped>
.my-child { margin-top: 8px; }
</style>
```

```css
/* 2. 用深度选择器配合 :where / 更高优先级，避免被组件库样式覆盖 */
.wrapper ::v-deep .el-input__inner { height: 40px !important; }
```

**关键结论**：deep 只解决「选择器匹配不到」，不解决「优先级争不过」。穿透后仍可能被组件库自身样式覆盖，这时才需要提高优先级（更具体的选择器或 `!important`）。

## 追问与易错点

- **为什么子组件根元素不用 deep 就能改？** 子组件根元素同时带父、子两个作用域属性，父组件 scoped 选择器能匹配到它。
- **`::v-deep` 写的位置有讲究吗？** 有。`.a ::v-deep .b` 编译成 `.a[data-v-x] .b`；写成 `::v-deep .a .b` 则整条 `.a .b` 都不加属性后缀，作用范围会变大，容易误伤。
- **`scoped` 会影响插槽（slot）内容吗？** 插槽内容在**父组件**作用域编译，带父作用域属性，所以父组件 scoped 样式通常能作用到插槽内容；子组件想定制插槽内容则要 deep。
- **`v-html` 动态插入的元素能吃到 scoped 样式吗？** 不能，这些元素在运行时插入、不会被编译期打上作用域属性，需要 deep 或用非 scoped 样式。
- **`>>>` 为什么有时没反应？** `>>>` 在部分预处理器（Sass/Less）里会被当成非法符号，编译阶段就报错或丢弃；跨环境不稳定，所以统一用 `::v-deep`。
- **Vue2 和 Vue3 的写法差异？** Vue2 常用 `.a ::v-deep .b`；Vue3 推荐 `:deep(.b)`。迁移时注意语法别混用。

## 相关题目

- [vue2-008-slot](/q/vue2/vue2-008-slot)
- [html-css-007-selector-specificity](/q/html-css/html-css-007-selector-specificity)
