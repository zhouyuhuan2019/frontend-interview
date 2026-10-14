---
title: defineProps/defineEmits 怎么写才规范？props 校验与默认值怎么处理？
subtopic: 组件通信
difficulty: junior
frequency: high
tags: [Vue3, defineProps, defineEmits, props 校验, 默认值]
order: 100
related: [vue3-002-composition-api, vue3-011-multi-vmodel]
---

面试官看一个 `<script setup>` 组件时，常会盯这几个地方。先看一段「能跑但不规范」的代码：

```vue
<script setup>
const props = defineProps(['count', 'tags', 'label'])
const emit = defineEmits(['change'])

function onClick() {
  props.count++      // 控制台警告：props 是只读的
  props.tags.push('x') // 改了数组，父组件却收不到通知
  emit('change')
}
</script>
```

这段代码有哪些问题？`props` 为什么不能直接改？数组/对象类型的默认值为什么必须写成函数？`defineEmits` 除了传数组还能怎么声明？

## 参考答案

规范写法要点：

1. **props 用对象形式声明**，写清 `type` / `required` / `default` / `validator`；TS 项目可用类型声明 + `withDefaults`。
2. **props 是只读的**，子组件不能直接改；要变更就 `emit` 通知父组件，或基于 props 生成 `computed` / 本地副本。
3. **对象、数组的默认值必须用工厂函数**（`default: () => []`），否则所有实例会共享同一个引用。
4. **`defineEmits` 推荐对象形式**，可对事件参数做校验；显式声明还能避免事件被当作 fallthrough attribute 落到根元素。
5. **命名约定**：`<script>` 中用 camelCase（`someValue`），`<template>` 传参时用 kebab-case（`some-value`）。

## 原理讲解

### 问题一：props 为什么不能直接改

Vue 用 `shallowReadonly` 包裹 props 对象，任何直接赋值都会在开发环境触发警告。数据流向是**父 → 子单向**的，子组件只能请求父组件改：

```vue
<script setup>
// 用对象形式声明：类型、必填、默认值、校验器一次写全
const props = defineProps({
  count: { type: Number, default: 0 },
  label: { type: String, required: true, validator: (v) => v.length <= 20 },
  tags: { type: Array, default: () => [] },
})

const emit = defineEmits({
  // 对象形式：返回 false 会在开发环境警告
  change: (payload) => typeof payload === 'number',
})

function increment() {
  emit('change', props.count + 1) // 请父组件改，而不是自己改
}
</script>
```

TS 项目更推荐类型声明，配合 `withDefaults`：

```ts
const props = withDefaults(
  defineProps<{ count?: number; label: string; tags?: string[] }>(),
  { count: 0, tags: () => [] } // 对象/数组同样要工厂函数
)
```

### 问题二：默认值为什么必须是工厂函数

如果写成 `default: []`，这个数组在整个模块里只创建一次，所有用到该组件的实例都会共享它，一个实例修改就会「污染」其他实例：

```js run
// 模拟 props 默认值的合并逻辑
function applyDefaults(props, defaults) {
  const result = { ...props }
  for (const key in defaults) {
    if (result[key] === undefined) {
      const d = defaults[key]
      result[key] = typeof d === 'function' ? d() : d
    }
  }
  return result
}

// 工厂函数：每个实例拿到独立数组
const a = applyDefaults({}, { tags: () => [] })
const b = applyDefaults({}, { tags: () => [] })
a.tags.push('x')
console.log('工厂函数返回独立数组:', a.tags, b.tags)

// 直接写对象：两个实例共享同一引用
const shared = []
const c = applyDefaults({}, { tags: shared })
const d = applyDefaults({}, { tags: shared })
c.tags.push('y')
console.log('共享默认值被污染:', c.tags, d.tags)
```

```text output
工厂函数返回独立数组: ["x"] []
共享默认值被污染: ["y"] ["y"]
```

### 问题三：想基于 props 派生数据怎么办

不要改 props，用 `computed` 派生，或把 props 作为初始值复制一份：

```vue
<script setup>
import { computed, ref } from 'vue'

const props = defineProps({ count: { type: Number, default: 0 } })

// 派生值：随 props 自动更新
const double = computed(() => props.count * 2)

// 独立于 props 的本地状态：只取初始值，之后自己维护
const localCount = ref(props.count)
</script>
```

### 问题四：defineEmits 用数组还是对象

数组形式只声明事件名，最简洁；对象形式可写校验函数，开发环境参数不符会给警告。对于 `v-model`，事件名是 `update:xxx`：

```vue
<script setup>
const modelValue = defineModel() // Vue 3.4+ 的简写，等价于 props + emit('update:modelValue')
const emit = defineEmits(['update:modelValue', 'change'])
</script>
```

## 追问与易错点

- **`defineProps` 的返回值能直接解构吗？** Vue 3.5+ 支持「响应式 props 解构」，解构后仍是响应式；低版本解构会丢失响应式，需要 `const { count } = toRefs(props)`。
- **`required` 和 `default` 同时写会怎样？** `required: true` 优先，`default` 不会被使用——既然必填，就不需要默认值。
- **`validator` 不通过会怎样？** 只在开发环境打印警告，不会中断渲染，生产环境直接忽略。
- **不声明的事件 `emit('xxx')` 会去哪？** 未在 `emits` 中声明的事件会被当作 fallthrough attribute 绑定到根元素；多根组件下还会警告「Extraneous non-emits event listeners」。
- **类型声明和运行时声明能同时用吗？** 不能，二选一。类型声明只有 TS 编译期类型、没有运行时的类型校验和默认值逻辑（默认值要靠 `withDefaults`）。
- **props 传下来的对象能直接改吗？** 不能视为规范做法。即使它是引用类型（改内部属性）Vue 不会警告，也会造成父子数据流不清晰，应通过 emit 显式回传。

## 相关题目

- [vue3-002-composition-api](/q/vue3/vue3-002-composition-api)
- [vue3-011-multi-vmodel](/q/vue3/vue3-011-multi-vmodel)
