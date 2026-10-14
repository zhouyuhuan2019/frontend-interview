---
title: watch 监听对象为什么没触发？immediate 与 deep 该怎么配？
subtopic: 响应式原理
difficulty: middle
frequency: high
tags: [Vue2, watch, deep, immediate, 深度监听]
order: 100
related: [vue2-005-computed-watch, vue2-009-set-reactivity]
---

有人在 `watch` 里监听了一个对象，然后在别处修改了这个对象的内部字段，结果回调没有触发：

```js
export default {
  data() {
    return { form: { name: '', age: 0 } }
  },
  watch: {
    form(newVal, oldVal) {
      console.log('form 变化了')
    },
  },
  methods: {
    updateName() {
      this.form.name = 'Tom' // form 内部的 name 变了
    },
  },
}
```

为什么改了 `form.name`，`form` 的 watch 却没有反应？`immediate` 和 `deep` 各自解决什么问题，又该怎么配？

## 参考答案

一句话结论：**watch 默认是「浅监听」——只有被监听的值本身（引用）变了才触发；对象的内部字段变化属于「同一个引用没变」，所以默认不触发，需要 `deep: true`。**

两个选项的分工：

| 选项 | 作用 | 使用场景 |
|---|---|---|
| `immediate: true` | 初始化时立即用当前值执行一次回调 | 进入页面就按初始值发一次请求 / 做一次初始化 |
| `deep: true` | 递归监听对象内部所有嵌套属性 | 监听整个表单对象、任意字段变化都要反应 |

配置与不配置的对照：

```js
watch: {
  // 默认：只有 this.form 被整体替换才触发
  form(newVal, oldVal) { /* ... */ },

  // deep：内部任意字段变化都触发（但 oldVal 与 newVal 是同一个引用）
  form: {
    handler(newVal, oldVal) { /* ... */ },
    deep: true,
  },

  // deep + immediate：初始化先跑一次，之后内部变化再触发
  'form.name': {
    handler(newVal, oldVal) { /* ... */ },
    immediate: true,
  },
}
```

补充一点：**`deep: true` 也监听不到对象「新增 / 删除属性」**（如 `this.form.email = ''`），因为 Vue2 对新增属性没有响应式拦截，这种情况要配合 `this.$set`。

## 原理讲解

**现象**：`this.form.name = 'Tom'`，watch 不触发。**原因**：watch 同样基于响应式依赖收集，默认只对「被监听的表达式的值」做一次浅比较——它把 `form` 这个对象引用存下来，值变化时比较 `newVal === oldVal`。修改 `form.name` 时引用完全没变，比较结果相等，回调不执行。

用简化逻辑说明「引用未变 → 认定没有变化」：

```js run
const form = { name: 'Tom' }
const snapshot = JSON.parse(JSON.stringify(form)) // 变化前存快照（深拷贝）

// 模拟 deep watch 回调：新旧值其实是同一个引用
const oldVal = form
form.name = 'Jerry' // 修改内部字段，引用没变

console.log('newVal === oldVal ?', form === oldVal)
console.log('快照对比:', snapshot.name, '->', form.name)
```

```text output
newVal === oldVal ? true
快照对比: Tom -> Jerry
```

- `deep: true` 时，Watcher 会递归遍历对象，把每个嵌套属性都收集为依赖，因此任一字段变化都能触发回调；
- `immediate: true` 时，初始化阶段就先用当前值调用一次回调（此时 oldVal 为 `undefined`）。

不同监听写法的触发范围与开销：

| 写法 | 触发时机 | 开销 |
|---|---|---|
| `form(newVal)` | 仅 `form` 引用被替换 | 低 |
| `'form.name'(newVal)` | `form.name` 变化 | 低，推荐 |
| `form: { deep: true }` | 任意嵌套字段变化 | 高（递归建立依赖） |

所以「只关心某个字段」时用具体路径 `'form.name'` 比 `deep` 更精准、更省性能。

## 追问与易错点

- **为什么 deep 监听时 `oldVal === newVal`？** 深监听的是同一个对象引用，回调里新旧值是同一对象；要拿到「旧值」需自己先快照一份（深拷贝）。
- **`immediate` 回调里 `oldVal` 是什么？** `undefined`，因为初始化时还没有「上一个值」，写逻辑时不要假设 oldVal 有值。
- **`deep: true` 能监听数组吗？** 能，数组的变异方法与元素内部变化都能监听到；但同样受「下标赋值不触发」的限制，需 `$set`。
- **加了 `deep` 还是不触发，常见原因？** ① 监听的是「初始不存在的路径」，如 `'form.email'` 而 email 未声明；② 用 `this.form.newKey = x` 新增属性而非 `$set`；③ 改的是非响应式数据（没放进 `data`）。
- **大对象用 `deep` 有什么风险？** 递归遍历建立依赖，初始化慢、内存占用高；能用具体路径监听就优先用 `'obj.key'`。
- **`deep: true` 和默认监听怎么选？** 整体替换对象用默认监听；只关心内部字段变化用具体路径或 deep。

## 相关题目

- [vue2-005-computed-watch](/q/vue2/vue2-005-computed-watch)
- [vue2-009-set-reactivity](/q/vue2/vue2-009-set-reactivity)
