---
title: ref 与 reactive 的区别是什么？怎么选择？
subtopic: ref 与 reactive
difficulty: middle
frequency: high
tags: [Vue3, ref, reactive, 响应式, toRefs]
order: 30
related: [vue3-001-proxy-reactivity]
---

## 参考答案

核心区别一句话：**`reactive` 只能代理对象；`ref` 用 `{ value }` 包装任意类型，因此可以整体替换、可以传递和解构。**

| 维度 | `ref` | `reactive` |
| --- | --- | --- |
| 适用类型 | 任意类型（基本类型 + 对象） | 仅对象 / 数组 / Map / Set |
| 访问方式 | JS 中必须写 `.value`，模板自动解包 | 直接访问属性 |
| 解构 / 展开 | 不丢失响应性（ref 本身是引用） | 丢失响应性，需要 `toRefs` |
| 整体替换 | `ref.value = newObj` 仍保持响应 | 变量重新赋值会断开代理 |
| 内部实现 | 基本类型靠 class 的 get/set，对象转调 `reactive` | `Proxy` 深层代理 |

社区主流建议：**默认用 `ref`**（统一 `.value` 心智模型），只有确定是局部使用、不解构的状态对象才用 `reactive`。

## 原理讲解

基本类型（number、string、boolean）无法被 `Proxy` 代理（Proxy 只接受对象），所以 Vue 用 class 的 getter/setter 拦截 `.value` 的读写——这是 `ref` 存在的根本原因：

```js
// ref 的简化实现
class RefImpl {
  constructor(value) {
    this.rawValue = value
    this._value = reactive(value) // 对象会再包一层深层代理
  }
  get value() {
    track(this, 'value')   // 收集依赖
    return this._value
  }
  set value(newVal) {
    if (hasChanged(newVal, this.rawValue)) {
      this.rawValue = newVal
      this._value = reactive(newVal)
      trigger(this, 'value') // 派发更新
    }
  }
}
```

`reactive` 丢失响应性的两种典型场景：

```js
const state = reactive({ count: 0, name: 'a' })

// 场景一：解构 —— 拿到的是一次性快照
const { count } = state
count // 不再响应

// 场景二：整体替换 —— 新对象不是代理
let state2 = reactive({ a: 1 })
state2 = { a: 2 } // 赋值普通对象，响应性彻底断开
```

解法：`toRefs` 把每个属性转成 ref，或者一开始就按 `ref` 组织状态：

```vue
<script setup>
import { reactive, toRefs } from 'vue'

const state = reactive({ count: 0, name: 'a' })
const { count, name } = toRefs(state) // 解构后依然响应
</script>
```

模板自动解包规则容易踩坑：只有**顶层** ref 会被模板自动解包；作为 `reactive` 对象属性的 ref 也会解包，但嵌套在数组或普通对象里的 ref 不会。

## 追问与易错点

- **`ref` 的性能比 `reactive` 差吗？** 没有可感知的差异，选择依据是语义和可维护性，不是性能。
- **`reactive` 传基本类型会怎样？** 不会得到响应式数据，只会收到开发警告，返回值就是一个普通值。
- **`shallowRef` / `shallowReactive` 用在哪？** 存大对象或第三方实例（如 echarts 实例）时，只需跟踪整体替换用 `shallowRef`，避免深层代理的开销与副作用。
- **watch 监听 `ref` 和 `reactive` 有区别吗？** 有：watch ref 直接传 ref；watch reactive 对象的某个属性必须包成 getter（`() => state.foo`），否则监听不到。

## 相关题目

- [vue3-001-proxy-reactivity](/q/vue3/vue3-001-proxy-reactivity)
- [vue3-004-watch-watcheffect](/q/vue3/vue3-004-watch-watcheffect)
