---
title: computed 与 watch 的区别是什么？
subtopic: 响应式原理
difficulty: middle
frequency: high
tags: [Vue2, computed, watch, 缓存, 依赖收集]
order: 50
related: [vue2-001-reactivity-principle]
---

## 参考答案

一句话结论：**`computed` 是「由依赖数据派生出一个新值」，有缓存；`watch` 是「数据变化时执行一段副作用」，不要求返回值。**

| 对比项 | computed | watch |
|---|---|---|
| 目的 | 声明式地计算派生值 | 数据变化后执行操作（副作用） |
| 缓存 | 有，依赖不变时不重算 | 无，每次变化都执行 |
| 异步 | 不支持（必须同步返回值） | 支持（可发请求、延时操作） |
| 返回值 | 必须有 | 不需要 |
| 典型场景 | 列表过滤、拼接 fullName | 搜索联想、参数变化发请求 |

判断口诀：**「一个数据由别的数据算出来」用 computed；「数据变了要做点事」用 watch。**

## 原理讲解

**computed 的缓存机制**：每个 computed 对应一个 `Watcher`，初始 `dirty = true`。第一次读取时求值并缓存，同时把 `dirty` 置为 `false`；依赖的响应式数据变化时只是把 `dirty` 重新置 `true`，下次读取才重算。依赖不变时多次访问直接返回缓存值。

```vue
<script>
export default {
  data() {
    return { keyword: '', list: ['apple', 'banana', 'orange'] }
  },
  computed: {
    // 依赖 keyword 和 list，任一变化才会重算
    filtered() {
      return this.list.filter((item) => item.includes(this.keyword))
    },
  },
}
</script>
```

**watch 的执行机制**：watch 也是 Watcher，观察一个表达式（或返回值的函数），值变化时触发回调，回调可拿到 `(newVal, oldVal)`。

```vue
<script>
export default {
  data() {
    return { keyword: '' }
  },
  watch: {
    keyword(newVal, oldVal) {
      // 可以异步：发请求、防抖都行
      console.log(`${oldVal} -> ${newVal}`)
    },
  },
}
</script>
```

watch 的两个常用选项：

- `immediate: true`：初始化时立即以当前值执行一次回调；
- `deep: true`：递归遍历对象内部属性，任意嵌套字段变化都触发（开销大，大对象慎用）。

computed 默认只有 getter，也可以写 `get` / `set` 双向绑定（如全选 checkbox 场景）。

## 追问与易错点

- **computed 里能发请求吗？** 不能。computed 要求同步返回一个值，异步操作应放 watch 或方法里。
- **watch 一个对象，oldVal 为什么和 newVal 相同？** 对象 / 数组是引用类型，监听的是同一个引用，内部属性变化时引用没变，所以新旧值指向同一对象；需要快照可在回调里深拷贝。
- **deep watch 为什么耗性能？** 它会递归遍历对象的所有嵌套属性逐一建立依赖，大对象初始化成本很高；可改成监听具体路径，如 `'form.name'`。
- **computed 和 methods 都能返回值，区别在哪？** computed 有缓存、基于响应式依赖自动失效；methods 每次调用都重新执行。能由数据静态推导的值优先 computed。
- **watch 里修改被监听的值会怎样？** 会再次触发回调，可能造成死循环；Vue 对同值有保护，但对象场景仍要谨慎。

## 相关题目

- [vue2-001-reactivity-principle](/q/vue2/vue2-001-reactivity-principle)
