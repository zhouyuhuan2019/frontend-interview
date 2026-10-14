---
title: 表单校验怎么做才优雅？自定义校验与异步校验怎么写？
subtopic: 表单与交互
difficulty: middle
frequency: medium
tags: [Vue2, 表单校验, 自定义校验, 异步校验, rules]
order: 120
related: [vue2-004-component-communication, vue2-005-computed-watch]
---

一个注册表单要校验：用户名必填、格式合法，还要异步请求接口确认「用户名是否已被占用」。全写在提交事件里会又长又乱，界面上还希望「失焦就提示、提交前再统一校验一次」。这种表单校验该怎么组织才优雅？

## 参考答案

组织校验的三个要点（以 Element UI 的 `el-form` 为例，思路对原生表单同样适用）：

1. **规则与结构分离**：把规则集中写成 `rules` 对象，模板只声明 `prop` 和 `rules`，不写 if-else；
2. **同步规则**用「`required` / `pattern` 等内置项」，**复杂逻辑**用 `validator` 自定义函数；
3. **异步校验**在 `validator` 里调用 `callback`（或返回 Promise），并做好**竞态处理**，避免每次输入都打接口。

```vue
<template>
  <el-form ref="formRef" :model="form" :rules="rules">
    <el-form-item label="用户名" prop="username">
      <el-input v-model="form.username" />
    </el-form-item>
    <el-button @click="submit">提交</el-button>
  </el-form>
</template>
```

```js
export default {
  data() {
    return {
      form: { username: '' },
      rules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' },
          { pattern: /^[a-zA-Z0-9_]{3,16}$/, message: '3-16 位字母、数字或下划线', trigger: 'blur' },
          { validator: this.checkUsernameAvailable, trigger: 'blur' }, // 异步校验
        ],
      },
    }
  },
  methods: {
    // 自定义异步校验：通过 callback 返回结果
    checkUsernameAvailable(rule, value, callback) {
      if (!value) return callback() // 空值交给 required 规则处理
      setTimeout(() => {
        value === 'admin' ? callback(new Error('该用户名已被占用')) : callback()
      }, 300)
    },
    submit() {
      this.$refs.formRef.validate((valid) => {
        if (!valid) return // 校验失败，界面已高亮提示
        // 校验通过再提交
      })
    },
  },
}
```

## 原理讲解

**现象**：提交事件里堆满 if-else、错误提示风格不统一、异步校验还容易卡。**原因**：校验逻辑与视图生命周期脱节——「校验什么」和「什么时候触发（blur / change / submit）」混在了一起。

**解决方案的核心是把「规则」抽成数据。** 每条规则包含三要素：

| 要素 | 含义 | 示例 |
|---|---|---|
| 判定条件 | 什么算不合法 | `required` / `pattern` / 自定义函数 |
| 触发时机 | 什么时候校验 | `trigger: 'blur'`、`'change'`，或提交时统一校验 |
| 错误信息 | 不合法时的提示 | `message` |

**自定义校验函数**：签名是 `(rule, value, callback)`。同步校验直接 `callback(new Error('...'))`，通过则 `callback()`；异步校验就是在拿到接口结果后再调用 `callback`。

**异步校验的两个坑**：

1. **竞态**：用户连续输入，先发的请求后返回，可能用过期结果覆盖最新校验。解决：记录请求序号只认最后一次，或用 `AbortController` / CancelToken 取消上一次。
2. **性能**：不要绑 `trigger: 'change'` 直接打接口，改用 `blur`，或在 `validator` 里加防抖。

用纯 JS 还原一个「按顺序执行同步 + 异步规则」的校验器，理解 `validator` 链的实质：

```js run
async function validate(value, rules) {
  for (const rule of rules) {
    const error = await rule(value)
    if (error) return error // 命中即返回，短路后续规则
  }
  return null
}

const usernameRules = [
  (v) => (v ? null : '用户名不能为空'),
  (v) => (/^[a-zA-Z0-9_]{3,16}$/.test(v) ? null : '只能包含字母、数字、下划线，长度 3-16'),
  (v) => (v === 'admin' ? Promise.resolve('该用户名已被占用') : Promise.resolve(null)), // 异步
]

async function run() {
  console.log(await validate('', usernameRules))
  console.log(await validate('a!', usernameRules))
  console.log(await validate('admin', usernameRules))
  console.log(await validate('tom_2024', usernameRules))
}

run()
```

```text output
用户名不能为空
只能包含字母、数字、下划线，长度 3-16
该用户名已被占用
null
```

可以看到规则是**短路执行**的：`''` 命中第一条就不再往下走；`admin` 通过前两条后被异步规则拦下；只有全部通过才返回 `null`。

**更省事的两个组织技巧**：

```js
// 只校验某个字段（如「发送验证码」前只校验手机号）
this.$refs.formRef.validateField('phone')

// 动态规则：不同模式用不同规则（登录 / 注册切换）
computed: {
  rules() {
    return this.isRegister ? registerRules : loginRules
  },
}
```

## 追问与易错点

- **`trigger: 'blur'` 和 `'change'` 怎么选？** 请求类、重规则用 `blur`（少打扰、少请求）；纯格式提示可用 `change`；提交前一定再跑一次全量 `validate`。
- **异步校验必须用 callback 吗？** 也可以让 `validator` 返回 Promise，此时不要再同时用 callback，两种方式只选其一。
- **动态规则为什么用 computed 而不是 data？** 规则依赖当前模式（登录 / 注册），computed 能自动响应变化；写死在 `data` 里切换后不会更新。
- **嵌套字段的 prop 怎么写？** 用 `'user.name'` 这种点路径，`rules` 也要写成对应的嵌套结构。
- **校验没生效，常见原因？** ① `el-form` 没绑 `:model`；② `el-form-item` 的 `prop` 与 rules 的 key 对不上；③ 用了自定义输入组件却没有触发 `change` 事件。

## 相关题目

- [vue2-004-component-communication](/q/vue2/vue2-004-component-communication)
- [vue2-005-computed-watch](/q/vue2/vue2-005-computed-watch)
