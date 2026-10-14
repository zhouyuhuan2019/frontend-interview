---
title: 如何用组合式函数复用逻辑？它比 mixin 好在哪？
subtopic: 组合式函数复用
difficulty: middle
frequency: high
tags: [组合式函数, composable, mixin, 逻辑复用, Composition API]
order: 140
related: [vue3-002-composition-api, vue3-004-watch-watcheffect]
---

项目里有多个页面都要实现「监听鼠标位置」「获取滚动高度」「表单校验」这类逻辑，团队之前用 mixin 复用，结果经常出现变量名撞车、数据来源说不清的问题。

请说明：Vue3 里怎么用组合式函数（composable）复用逻辑？它相比 mixin 到底好在哪？

```js
// 这段逻辑在多个组件里重复出现，想抽成一个可复用的函数
import { ref, onMounted, onUnmounted } from 'vue'

const x = ref(0)
const y = ref(0)
function update(e) {
  x.value = e.pageX
  y.value = e.pageY
}
onMounted(() => window.addEventListener('mousemove', update))
onUnmounted(() => window.removeEventListener('mousemove', update))
```

## 参考答案

**组合式函数（composable）就是一个以 `use` 开头、内部使用组合式 API、并返回响应式状态的普通函数。** 它把「逻辑」而不是「组件选项」抽出来，调用方通过显式 `import` 和返回值来使用。

把上面的逻辑抽成 `useMouse`：

```js
// composables/useMouse.js
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  const x = ref(0)
  const y = ref(0)
  const update = (e) => {
    x.value = e.pageX
    y.value = e.pageY
  }

  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  return { x, y }   // 返回响应式状态，由调用方按需解构
}
```

组件里直接使用：

```vue
<script setup>
import { useMouse } from '@/composables/useMouse'

const { x, y } = useMouse()
</script>

<template>
  <p>鼠标位置：{{ x }}, {{ y }}</p>
</template>
```

相比 mixin 的优势可以概括为三点：**来源显式、命名可控、可组合**。

| 对比项 | mixin | 组合式函数 |
| --- | --- | --- |
| 逻辑来源 | 隐式混入，读代码时不知道 `x` 从哪来 | 显式 `import` + 解构，来源一目了然 |
| 命名冲突 | 多个 mixin 属性同名会互相覆盖 | 可以重命名解构，`{ x: mouseX }` |
| 依赖关系 | mixin 之间可能有隐式依赖，难追踪 | 函数之间显式调用，依赖清晰 |
| 类型支持 | 对 TS 不友好 | 返回值有完整类型推导 |
| 复用粒度 | 只能整块复用 组件选项 | 任意函数级粒度复用、可嵌套组合 |

因此 Vue3 的官方推荐是：**复用逻辑用组合式函数，不再用 mixin。**

## 原理讲解

**现象**：多个组件都要实现同一段订阅逻辑，复制粘贴容易漏改，用 mixin 又经常「改了 A 影响 B」。

**原因**：mixin 是把对象属性「合并」进组件，合并规则按选项类型各不相同（`data` 浅合并、`methods` 覆盖、生命周期按顺序都执行）。这种隐式合并带来三个问题：

1. 组件里出现一个 `loading`，你无法立刻知道它来自哪个 mixin；
2. 两个 mixin 都定义 `loading` 时，后者静默覆盖前者；
3. mixin 无法接收参数、返回结果，也不能互相组合。

**解决方案**：把逻辑写成接受参数、返回响应式状态的函数。下面用一段纯 JS 模拟 composable 的核心形态——「一个函数持有内部状态并返回操作它的方法」：

```js run
// 模拟组合式函数：把状态封装在闭包里，返回显式 API
function useCounter(initial = 0) {
  let count = initial

  return {
    getCount: () => count,
    increment: () => {
      count += 1
    },
  }
}

const counter = useCounter(10)
counter.increment()
counter.increment()
console.log(counter.getCount())
```

```text output
12
```

真实的 composable 里，`ref` 换成闭包变量即可；关键在于「返回值显式声明了谁能用什么」，这正是 mixin 缺失的。

组合式函数还能**互相组合**，这是 mixin 做不到的：

```js
// composables/useScroll.js —— 内部复用 useThrottle
import { ref, onMounted, onUnmounted } from 'vue'
import { useThrottle } from './useThrottle'

export function useScroll() {
  const scrollY = ref(0)

  const handleScroll = useThrottle(() => {
    scrollY.value = window.scrollY
  }, 100)

  onMounted(() => window.addEventListener('scroll', handleScroll))
  onUnmounted(() => window.removeEventListener('scroll', handleScroll))

  return { scrollY }
}
```

也可以带参数、区分不同用法：

```js
// composables/useFetch.js
import { ref, watchEffect, toValue } from 'vue'

export function useFetch(url) {
  const data = ref(null)
  const error = ref(null)

  watchEffect(async () => {
    // 传入的 url 可以是字符串，也可以是 ref，用 toValue 统一处理
    try {
      data.value = await fetch(toValue(url)).then((r) => r.json())
    } catch (e) {
      error.value = e
    }
  })

  return { data, error }
}
```

## 追问与易错点

- **组合式函数必须在哪儿调用？** 必须在 `setup()` 或 `<script setup>` 中**同步**调用。因为它内部常调用 `onMounted` 等生命周期钩子，这些钩子依赖当前的组件实例；放到 `setTimeout` 或事件回调里异步调用，钩子会失效并报警告。
- **命名和书写约定是什么？** 以 `use` 开头、放在 `composables/` 目录、驼峰命名；返回值统一返回 `ref` / `reactive`，不要返回响应式对象的解构结果。
- **为什么返回 `ref` 而不是 `reactive`？** `ref` 可以整体替换、可被解构，且在函数之间传递、组合、类型推导都更自然；`reactive` 一旦解构就丢响应式。
- **副作用需要自己清理吗？** 需要。`addEventListener`、`setInterval`、`watch` 等都要在 `onUnmounted` 里清理，否则组件销毁后仍在运行。
- **组合式函数和普通工具函数怎么区分？** 用到响应式 API（`ref` / `computed` / 生命周期钩子）的才是 composable；纯计算、无副作用的逻辑就写成普通 utils 函数。
- **mixin 现在还能用吗？** 能用但不推荐，Options API 仍支持 `mixins`，但新代码应优先组合式函数。

## 相关题目

- [vue3-002-composition-api](/q/vue3/vue3-002-composition-api)
- [vue3-004-watch-watcheffect](/q/vue3/vue3-004-watch-watcheffect)
