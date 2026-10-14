---
title: 自定义组件怎么实现 v-model？.sync 修饰符解决什么问题？
subtopic: 组件通信
difficulty: middle
frequency: high
tags: [Vue2, v-model, .sync, 组件通信, 自定义组件]
order: 160
related: [vue2-004-component-communication, vue2-005-computed-watch]
---

封装了一个自定义输入框 / 开关组件后，父组件想双向绑定：

```vue
<!-- 父组件 -->
<Child v-model="keyword" />
<Child :visible.sync="show" />
```

但子组件里只写了 `props: ['value']`，父组件输入时值并没有回写。请说明：子组件要怎么写才能让 `v-model` 生效？`.sync` 又是什么、和 `v-model` 有什么区别？

## 参考答案

`v-model` 在**组件上只是语法糖**，等价于「一个 prop + 一个事件」：

```html
<!-- 这两行完全等价 -->
<Child v-model="keyword" />
<Child :value="keyword" @input="keyword = $event" />
```

所以自定义组件要用 `v-model` 生效，必须做两件事：

1. 声明接收 `value` 这个 prop：`props: { value: ... }`；
2. 在内部值变化时 `this.$emit('input', newValue)` 把新值抛给父组件。

`.sync` 是另一块语法糖，用于「父子同步**多个** prop」：

```html
<!-- 这两行完全等价 -->
<Child :visible.sync="show" />
<Child :visible="show" @update:visible="show = $event" />
```

**区别**：`v-model` 默认固定 prop=`value`、event=`input`，一个组件只能有一个；`.sync` 的 prop 名任意、可以同时同步多个，更通用。

## 原理讲解

**现象**：子组件里改了值，父组件的变量没变。

**原因**：Vue 是单向数据流——子组件**不能直接修改 props**（会报「Avoid mutating a prop」警告）。想「双向」，必须走「prop 下传 + 事件上抛」的显式通道。`v-model` / `.sync` 只是把这条通道的样板代码包装成了语法糖。

`v-model` 的编译展开：

```html
<Child v-model="keyword" />          <!-- v-model 是 prop+event 的简写 -->
<!-- ↓ 展开 -->
<Child :value="keyword" @input="keyword = $event" />
```

`v-model` 的这套「prop 名 / 事件名」可以自定义（Vue2.2+ 的 `model` 选项）：

```js
export default {
  name: 'Child',
  model: { prop: 'checked', event: 'change' },   // 改用 checked / change
  props: { checked: Boolean },
  methods: {
    toggle() { this.$emit('change', !this.checked) },
  },
}
```

`.sync` 是「同步多个 prop」的更通用写法（Vue2.3+）：

```html
<Child :title.sync="title" :visible.sync="show" />
<!-- ↓ 展开 -->
<Child :title="title" @update:title="title = $event"
       :visible="show" @update:visible="visible = $event" />
```

用一个纯 JS 的小例子体会这套「下传 + 回抛」的循环：

```js run
// 模拟父组件：维护状态，并接收子组件抛上来的新值
const parent = {
  state: { count: 1 },
  onUpdate(v) { this.state.count = v },   // 相当于模板里的 @input="count = $event"
}

// 模拟子组件：拿到 props.value 后渲染，值变化时 emit 新值
function render(value) {
  console.log('子组件渲染，value =', value)
}

render(parent.state.count)                 // 首次下传
parent.onUpdate(parent.state.count + 1)    // 子组件 emit('input', 2)
render(parent.state.count)                 // 父状态更新，子组件重新渲染
```

```text output
子组件渲染，value = 1
子组件渲染，value = 2
```

**常见配套写法**：用计算属性 get/set 做 v-model 中转，避免手动写 handler：

```js
export default {
  props: { value: String },
  computed: {
    inner: {
      get() { return this.value },
      set(v) { this.$emit('input', v) },   // 本地改动 → 抛给父组件
    },
  },
}
```

**对照表**

| | v-model | .sync |
|---|---|---|
| 本质 | `:value` + `@input` | `:prop` + `@update:prop` |
| prop 名 | 默认 `value`（可用 `model` 改） | 任意 |
| 数量 | 每个组件一个 | 可有多个 |
| 典型场景 | 表单类组件（输入框、开关） | 对话框 `:visible.sync`、多字段联动 |

## 追问与易错点

- **为什么子组件里直接改 props 会报错？** 单向数据流：props 属于父组件，子组件只能读；要改就 emit 事件让父组件改（或复制一份到本地 data）。
- **`this.$emit('input', ...)` 传的是对象，父组件变量会变吗？** 父组件 `v-model` 会把 `$event` 整体赋给变量，所以传值类型要和绑定变量一致，否则可能类型错乱。
- **`v-bind.sync` 能一次同步整个对象吗？** Vue2 **不支持** `v-bind.sync="obj"` 这种展开同步（这是 1.x / Vue3 才有的行为），只能逐字段写 `:key.sync`。
- **`v-model` 和 `.sync` 能用同一个 prop 吗？** 可以，但语义重复、容易绕晕，一般没必要；需要多个双向绑定优先 `.sync`。
- **`v-model` 值变化后子组件内部还要不要存 state？** 若子组件需要「未提交前的临时值」（如输入中），可在本地 data 存一份，提交时再 emit，注意和 props 同步。
- **自定义组件用 `v-model` 却完全不生效，排查顺序？** 先确认 prop 叫 `value`、事件叫 `input`，再确认 `$emit` 真的执行了（常见是被 `.sync`/`change` 事件名写混）。

## 相关题目

- [vue2-004-component-communication](/q/vue2/vue2-004-component-communication)
- [vue2-005-computed-watch](/q/vue2/vue2-005-computed-watch)
