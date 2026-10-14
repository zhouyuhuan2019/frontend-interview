---
title: 为什么需要 Composition API？与 Options API 对比？
subtopic: Composition API
difficulty: middle
frequency: high
tags: [Vue3, Composition API, Options API, 逻辑复用, setup]
order: 20
related: [vue3-003-ref-vs-reactive]
---

## 参考答案

Composition API 解决的是 Options API 在**大型组件**和**逻辑复用**两个场景下的痛点：

| 维度 | Options API | Composition API |
| --- | --- | --- |
| 代码组织 | 按选项类型拆分（data / methods / computed），同一业务逻辑被切散 | 按逻辑关注点聚合，相关代码写在一起 |
| 逻辑复用 | mixin：来源不明、命名冲突、隐式依赖 | 组合式函数（hooks）：显式传参和返回值，可自由叠加 |
| 类型推导 | `this` 指向复杂，TS 支持差 | 普通函数与变量，TS 推导天然友好 |
| 打包体积 | 选项全量注册 | 按需 import，tree-shaking 友好 |

一句话总结：**Options API 适合小组件快速上手，Composition API 是为可维护性和复用而生。**

## 原理讲解

Options API 下，一个「搜索」功能的响应式数据写在 `data`、请求方法写在 `methods`、派生状态写在 `computed`、监听写在 `watch`——同一个逻辑关注点被拆到 4 个选项里。组件越大，改一个功能就要在文件里上下跳。

Composition API 用 `setup`（或 `<script setup>`）把同一逻辑的所有代码聚合在一起：

```vue
<script setup>
import { ref, computed } from 'vue'

// 搜索逻辑：数据、方法、派生状态都在一起
const keyword = ref('')
const list = ref([])
const filtered = computed(() =>
  list.value.filter((item) => item.name.includes(keyword.value))
)
function search() { /* 发请求、写 list */ }
</script>
```

逻辑复用方面，Vue2 的 mixin 有三大问题：

1. **数据来源不清晰**：模板里用的属性不知道来自哪个 mixin；
2. **命名冲突**：多个 mixin 定义同名属性会互相覆盖；
3. **隐式耦合**：mixin 之间可能互相依赖，难以独立维护。

组合式函数（以 `use` 开头的普通函数）通过显式的输入输出解决这些问题：

```js
// useMouse.js —— 标准的组合式函数
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  const x = ref(0)
  const y = ref(0)
  const update = (e) => { x.value = e.pageX; y.value = e.pageY }
  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))
  return { x, y } // 返回什么一目了然，调用处可重命名解构
}
```

## 追问与易错点

- **Composition API 能完全替代 Options API 吗？** 能，且两者可以混用（Vue3 完整保留 Options API）；官方建议新代码用 `<script setup>`，老项目不必强行重写。
- **`<script setup>` 和 `setup()` 函数是什么关系？** `<script setup>` 是编译期语法糖，编译结果就是 `setup()`，省掉了显式 return 和手动注册组件。
- **组合式函数和普通工具函数的区别？** 组合式函数内部可以使用响应式 API 和生命周期钩子，只能在 `setup` 或其他组合式函数中同步调用（钩子依赖当前组件实例上下文）。
- **能写 `async setup` 吗？** 可以，但 `await` 之后再调用生命周期钩子会丢失实例上下文，且组件必须由外层 `Suspense` 接管加载态。

## 相关题目

- [vue3-001-proxy-reactivity](/q/vue3/vue3-001-proxy-reactivity)
- [vue3-003-ref-vs-reactive](/q/vue3/vue3-003-ref-vs-reactive)
