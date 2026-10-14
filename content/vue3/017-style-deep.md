---
title: Vue3 里 scoped 样式怎么穿透到子组件？:deep() 和 Vue2 有什么不同？
subtopic: 样式与 scoped
difficulty: junior
frequency: high
tags: [scoped, 样式穿透, :deep, ::v-deep, CSS]
order: 170
related: [vue3-007-new-features]
---

父组件用了 `<style scoped>`，想修改子组件内部某个深层元素的样式，写 `.child .title { color: red }` 却完全不生效。换成 Vue3 后，网上有的写 `::v-deep`、有的写 `:deep()`，到底该用哪个？

```vue
<!-- Parent.vue -->
<template>
  <Child class="my-child" />
</template>

<style scoped>
/* 想改 Child 组件内部的 .title，但这样写选不中 */
.my-child .title {
  color: red;
}
</style>
```

## 参考答案

**scoped 样式会给父组件里的每个选择器末尾追加一个 `[data-v-xxx]` 属性选择器**，而子组件内部的元素只带子组件自己的 `data-v` 属性，没有父组件的，所以父组件的 `.my-child .title` 永远匹配不到子组件里的 `.title`。

想穿透到子组件，Vue3 用伪类 **`:deep()`**：

```vue
<style scoped>
/* 让样式穿透到子组件内部的 .title 元素 */
:deep(.title) {
  color: red;
}
</style>
```

Vue2 与 Vue3 的穿透语法对照：

| 用途 | Vue2 写法 | Vue3 写法（推荐） |
| --- | --- | --- |
| 穿透到子组件内部 | `>>>`（仅纯 CSS）、`/deep/`、`::v-deep` | `:deep(.child-class)` |
| 穿透到插槽内容 | `::v-slotted(.x)` | `:slotted(.x)` |
| 全局样式（跳过 scoped） | — | `:global(.x)` |

Vue3 推荐统一使用伪类写法 `:deep()`，旧的 `::v-deep`、`/deep/` 已不推荐（`::v-deep` 在 Vue3 中需带参数 `::v-deep(.x)` 才符合新语义），`>>>` 只对纯 CSS 生效、在 SCSS 等预处理器里会报错。

## 原理讲解

**现象**：父组件想改子组件内部样式，写了普通后代选择器却毫无效果；去掉 `scoped` 就好了。

**原因**：`scoped` 的实现方式是 **给选择器加属性**，而不是限制作用域。编译时，Vue 会给组件模板中的元素打上一个唯一的 `data-v-xxxx` 属性，再给 `<style scoped>` 里的选择器追加相同的属性选择器，从而做到「只命中本组件的元素」。

看编译结果就很清楚：

```css
/* 源码：:deep(.title) 编译后 —— 属性加在外层，子组件内部元素可被命中 */
[data-v-f3f3eg9] .title {
  color: red;
}

/* 源码：.my-child（普通 scoped 选择器）编译后 —— 属性加在自身元素上 */
.my-child[data-v-f3f3eg9] {
  font-weight: bold;
}
```

对比可见：普通 scoped 选择器把 `[data-v-xxx]` 追加在**最后一个选择器**上，刚好是子组件元素的位置，所以匹配失败；而 `:deep()` 会把属性选择器**上移到外层**，让后续的后代选择器可以继续命中子组件内部元素。

**解决方案**：

```vue
<!-- Parent.vue -->
<template>
  <Child class="my-child" />
</template>

<style scoped>
/* ① 穿透到子组件内部：属性选择器上移，能命中 .title */
:deep(.title) {
  color: red;
}

/* ② 只想改子组件内部某个具体类，也可以带上下文缩小范围 */
.my-child :deep(.title) {
  font-size: 18px;
}

/* ③ 改第三方组件库（如 Element Plus、Vant）内部类名同理 */
:deep(.el-input__inner) {
  border-radius: 8px;
}
</style>
```

需要「穿透到插槽内容」时用 `:slotted()`：

```vue
<!-- Child 模板里有 <slot />，父组件传进去的内容默认属于父组件，
     但样式上需要 :slotted 才能从父组件的 scoped 样式里命中 -->
<style scoped>
:slotted(.slot-item) {
  color: green;
}
</style>
```

只是想让某条规则**跳出 scoped、全局生效**时用 `:global()`：

```vue
<style scoped>
/* 不受 scoped 影响，全局生效 */
:global(.global-class) {
  color: gray;
}
</style>
```

最后提醒一句：**能不用穿透就不用**。优先让子组件通过 `props` 控制外观（如传 `class`、`variant`），穿透会破坏子组件的样式封装，子组件结构调整时父组件样式很容易失效。

## 追问与易错点

- **scoped 到底是怎么实现的？** 编译期给元素加唯一 `data-v-xxx` 属性、给选择器追加对应属性选择器；它是「加属性」而非运行时隔离，所以仍可能通过 `:deep()` 等方式溢出作用域。
- **为什么 Vue2 的 `>>>` 在我的 SCSS 里报错？** `>>>` 是 CSS 层面的组合器，预处理器（SCSS/Less）无法解析它。需要预处理器的场景请用 `::v-deep`（Vue2）或 `:deep()`（Vue3）。
- **`:deep()` 不加参数行不行？** 不行。Vue3 的伪类需要带选择器参数，形如 `:deep(.x)`；漏写参数（如 `::v-deep { }`）会告警且不生效。
- **`:deep()` 必须写在 `<style scoped>` 里吗？** 是。它服务于 scoped 的编译规则；在非 scoped 样式里没有任何意义。
- **为什么改 Element Plus / Vant 组件的样式要用 `:deep`？** 因为那些组件的内部元素带的是它们自己的 `data-v`，父组件的普通 scoped 选择器命不中，只能穿透。
- **`:deep()` 会影响性能吗？** 会略微增加选择器复杂度（多一层属性选择器），但主要问题是**破坏封装**、后续维护成本高，不应作为常规手段滥用。

## 相关题目

- [vue3-007-new-features](/q/vue3/vue3-007-new-features)
