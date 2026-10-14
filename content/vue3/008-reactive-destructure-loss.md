---
title: reactive 解构后为什么丢失响应式？toRefs 与 toRef 怎么补救？
subtopic: ref 与 reactive
difficulty: middle
frequency: high
tags: [Vue3, reactive, toRefs, toRef, 响应式丢失]
order: 80
related: [vue3-003-ref-vs-reactive, vue3-001-proxy-reactivity]
---

日常开发里很容易写出这样的代码：

```vue
<script setup>
import { reactive } from 'vue'

const state = reactive({ count: 0, user: { name: 'a' } })

// 想少写几个 state.，于是把属性解构出来用
const { count, user } = state

function add() {
  count++          // 视图不更新！
  user.name = 'b'  // 视图也不更新！
}
</script>
```

变量确实改了，页面上却毫无反应。为什么 `reactive` 一解构响应式就失效了？`toRefs` 和 `toRef` 又分别解决什么问题？

## 参考答案

一句话：**`reactive` 返回的是 Proxy，响应式依赖「通过代理访问属性」这个动作；解构只是把属性值一次性读出来存进普通变量，读完后变量和代理就再无关系，改它自然不会触发更新。**

补救办法：

| API | 作用 | 适用场景 |
| --- | --- | --- |
| `toRefs(state)` | 把对象每个属性转成对应的 ref，解构后仍是响应式 | 需要解构多个属性 |
| `toRef(state, 'key')` | 把单个属性转成 ref | 只需要其中一个属性 |
| 直接用 `state.xxx` | 始终通过代理访问 | 最省心的默认做法 |

要点：`toRefs` / `toRef` 得到的 ref 与源对象是**双向同步**的，`ref.value` 改了源数据也跟着变——它不是拷贝。

## 原理讲解

`reactive` 的响应式来自 `Proxy` 的 `get` / `set` 拦截：读取属性时收集依赖（track），写入时派发更新（trigger）。解构 `const { count } = state` 只发生了一次 **get**，把当时的值（如 `0`）复制给普通变量；之后 `count++` 改的是这个普通变量，Proxy 根本没有参与，也就不可能触发更新。

`toRef` 的解法是不拷贝值，而是返回一个 ref，它的 `.value` 每次都实时读写源对象：

```js run
// 简化版：用 Proxy + effect 模拟 Vue 的依赖追踪机制
let activeEffect = null
function effect(fn) {
  activeEffect = fn
  fn()
  activeEffect = null
}

function reactive(obj) {
  const deps = new Map()
  return new Proxy(obj, {
    get(target, key) {
      if (activeEffect) {
        if (!deps.has(key)) deps.set(key, new Set())
        deps.get(key).add(activeEffect)
      }
      return target[key]
    },
    set(target, key, value) {
      target[key] = value
      deps.get(key)?.forEach((fn) => fn())
      return true
    },
  })
}

function toRef(source, key) {
  return {
    // 读 .value 经过代理 → 收集依赖
    get value() {
      return source[key]
    },
    // 写 .value 经过代理 → 派发更新
    set value(v) {
      source[key] = v
    },
  }
}

const state = reactive({ count: 0 })

// 直接解构：拿到的 0 是一个普通数字快照
const { count } = state
effect(() => console.log('直接解构读取:', count))

// toRefs 解构：拿到的是 ref，读 .value 会经过代理
const countRef = toRef(state, 'count')
effect(() => console.log('toRefs 读取:', countRef.value))

state.count = 1 // 只有真正追踪了代理的 effect 会重跑
```

```text output
直接解构读取: 0
toRefs 读取: 0
toRefs 读取: 1
```

可以看到：当 `state.count` 变成 1 时，只有 `toRefs` 版本重新执行了，直接解构的 `count` 永远停在 0。

正确写法：

```vue
<script setup>
import { reactive, toRefs, toRef } from 'vue'

const state = reactive({ count: 0, user: { name: 'a' } })

// 解构多个属性
const { count, user } = toRefs(state)

// 只要一个属性
const name = toRef(state.user, 'name')

function add() {
  count.value++    // 响应式正常
  name.value = 'b' // 响应式正常，且同步回 state.user
}
</script>
```

## 追问与易错点

- **`toRefs` 是深拷贝吗？** 不是。它返回的 ref 与源对象双向绑定：改 `ref.value` 源数据跟着变，改源数据 `ref.value` 也跟着变。要独立副本应改用 `structuredClone` 或手动拷贝。
- **解构 `toRefs` 后模板里为什么不用写 `.value`？** 因为模板对**顶层 ref** 会自动解包，`<template>` 中直接写 `count` 即可；但在 `<script>` 里仍必须写 `count.value`。
- **解构 `ref` 对象会丢响应式吗？** 不会。`ref` 本身就是一个包装对象，解构出来拿到的还是这个 ref 对象，只要继续用 `.value` 就一直是响应式的。
- **为什么 `state = { ... }` 整体重新赋值后响应式也没了？** 重新赋值只是让变量指向一个**新的普通对象**，原代理被丢弃、新对象不是代理。正确做法是改属性（`Object.assign(state, newObj)`），或干脆用 `ref` 存整个对象。
- **大对象用 `reactive` 再 `toRefs` 性能会差吗？** 没有可感知差异；`toRefs` 只创建轻量 ref 包装，不深拷贝也不遍历深层属性。

## 相关题目

- [vue3-003-ref-vs-reactive](/q/vue3/vue3-003-ref-vs-reactive)
- [vue3-001-proxy-reactivity](/q/vue3/vue3-001-proxy-reactivity)
