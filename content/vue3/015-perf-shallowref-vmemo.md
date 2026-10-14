---
title: 大对象为什么不要用 ref？shallowRef 与 v-memo 怎么用于性能优化？
subtopic: 性能优化
difficulty: senior
frequency: medium
tags: [shallowRef, v-memo, 性能优化, 响应式, ref]
order: 150
related: [vue3-003-ref-vs-reactive, vue3-001-proxy-reactivity]
---

页面要渲染一个上万行的表格，数据结构是层层嵌套的大对象。上线后发现：初次渲染慢、后续任意一次编辑都像卡住一样。

请说明：为什么大对象不建议用 `ref` 包裹？`shallowRef` 和 `v-memo` 分别用在什么场景、怎么写？

```js
import { ref, shallowRef } from 'vue'

// 一个大数组，每个元素内部还有多层嵌套
const list = ref([{ id: 1, detail: { tags: ['a', 'b'] } }])
```

## 参考答案

三句话结论：

- **`ref(大对象)` 会递归地把内部所有嵌套都变成响应式代理**，构建和访问都有开销，且深层任意改动都会触发依赖追踪与更新 → 大对象只改整体、不关心里部细节时，用 `shallowRef`。
- **`shallowRef` 只跟踪 `.value` 的整体替换**，改内部属性不会触发更新；需要时用 `triggerRef` 手动触发，或整体替换引用。
- **`v-memo` 用于大列表**：在 `v-for` 上把它当「缓存键」，依赖数组不变就跳过该行的整个子树 diff，直接复用上次结果。

## 原理讲解

**现象**：一个深层嵌套的大对象用 `ref` 包起来后，初次渲染和每次编辑都异常卡顿。

**原因**：`ref` 默认做**深度响应式转换**——它会递归遍历对象，把每一层嵌套对象都用 `Proxy` 包装（`reactive` 的深度行为）。这带来两重开销：

1. **构建与访问成本**：层级越深、元素越多，代理对象越多，读写都要穿过 `Proxy` 拦截器；
2. **更新成本**：深层任意一个属性变化都会被精确追踪，容易触发超出预期的重渲染。

用一段纯 JS 模拟「深层代理」来看开销来源——每次访问嵌套属性都要穿过一层 `get` 拦截：

```js run
// 模拟 ref 的深度代理：访问嵌套属性会层层穿过 Proxy 的 get
let getCount = 0
const makeReactive = (obj) =>
  new Proxy(obj, {
    get(target, key) {
      getCount += 1                                  // 记录拦截次数
      const value = Reflect.get(target, key)
      return typeof value === 'object' && value !== null
        ? makeReactive(value)                        // 递归代理下一层
        : value
    },
  })

const big = makeReactive({ list: [{ a: 1 }, { b: 2 }] })
void big.list[0].a
void big.list[1].b
console.log(getCount)
```

```text output
6
```

读取两个嵌套字段就触发了 6 次拦截（每次「取父 → 取下标 → 取字段」三层），大对象上这个倍数会被放大。

**解决方案一：`shallowRef`**

当数据是「整体替换、内部不动」的模式（如后端一次返回一大坨 JSON、列表整体刷新），只关心 `.value` 的替换：

```js
import { shallowRef, triggerRef } from 'vue'

const list = shallowRef([{ id: 1 }, { id: 2 }])

// ✗ 不会触发更新：内部属性没有被代理，改了视图也不知道
list.value[0].id = 100

// ✓ 方案 A：需要时就手动触发一次更新
triggerRef(list)

// ✓ 方案 B（推荐）：整体替换引用，天然触发更新
list.value = list.value.map((item) => ({ ...item, id: item.id + 100 }))
```

四种响应式工具的选择：

| API | 响应深度 | 触发时机 | 典型场景 |
| --- | --- | --- | --- |
| `ref` | 深层 | `.value` 替换 或 任意深层属性变化 | 大多数普通状态 |
| `shallowRef` | 仅 `.value` | 只认整体替换（或 `triggerRef`） | 大数据集、只读大对象、第三方实例 |
| `reactive` | 深层 | 任意属性变化 | 表单对象等固定结构 |
| `markRaw` | 不代理 | 永不响应 | 图表实例、地图实例等不需要响应式的对象 |

**解决方案二：`v-memo`**

`v-memo` 接收一个依赖数组，数组里的值全部没变时，**直接跳过该节点及子树的更新**。最典型的用法是配合 `v-for` 渲染长列表：

```vue
<template>
  <!-- 只有 item.id 或 item.selected 变化时，才重新渲染这一行 -->
  <div
    v-for="item in list"
    :key="item.id"
    v-memo="[item.id, item.selected]"
    class="row"
  >
    <span>{{ item.id }}</span>
    <span>{{ item.name }}</span>
    <span>{{ item.selected ? '已选' : '未选' }}</span>
  </div>
</template>
```

几点注意：`v-memo` 传入空数组 `v-memo="[]"` 表示**永不更新**（等价于 `v-once` 的效果，但可用于列表）；它只缓存 VNode，**不能拿来做数据计算**——聚合计算仍应用 `computed`。

## 追问与易错点

- **`shallowRef` 改了内部属性视图不更新怎么办？** 因为内部没被代理。要么整体替换 `.value`，要么改完调用 `triggerRef(list)` 手动触发一次。这正说明它适合「整体替换」的场景。
- **`shallowRef` 和 `markRaw` 有什么区别？** `shallowRef` 仍会跟踪 `.value` 这一个引用，整体替换会触发更新；`markRaw` 标记的对象则完全退出响应式系统，连整体替换也不追踪（常用于第三方类实例）。
- **`v-memo` 为什么必须和 `:key` 一起用在 `v-for` 里？** 它依赖 `:key` 稳定地进行节点复用；依赖数组描述「哪些变化需要重渲染」，两者配合才能正确跳过 diff。
- **`v-memo` 能替代 `computed` 吗？** 不能。`v-memo` 只决定「这次要不要重新 patch 这块 DOM」，不参与派生数据计算；需要缓存的派生值用 `computed`。
- **`reactive` 大对象也有同样问题吗？** 有。`reactive` 同样是深度代理，超大嵌套对象应改用 `shallowRef` 包裹、或对确定不需要响应式的部分 `markRaw`。
- **什么时候才该用 `shallowRef`？** 判断标准是：你是否只在「整体替换」时关心它。若还要监听内部字段变化（如双向绑定的表单），就老实用 `ref`。

## 相关题目

- [vue3-003-ref-vs-reactive](/q/vue3/vue3-003-ref-vs-reactive)
- [vue3-001-proxy-reactivity](/q/vue3/vue3-001-proxy-reactivity)
