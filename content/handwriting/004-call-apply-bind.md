---
title: 手写 call/apply/bind
subtopic: 函数工具
difficulty: middle
frequency: high
tags: [手写, this, call, apply, bind]
order: 40
---

请实现 `Function.prototype` 上的 `myCall` / `myApply` / `myBind`，要求：

- `myCall(context, ...args)`：指定 this 并立即调用，参数逐个传递；
- `myApply(context, argsArray)`：指定 this 并立即调用，参数用数组传递；
- `myBind(context, ...args)`：返回绑定了 this 的新函数，支持参数预置，且返回的函数被 `new` 调用时 this 指向新实例。

## 参考答案

```js run
// myCall：把函数临时挂到 context 上调用，利用「谁调用 this 就指向谁」
Function.prototype.myCall = function (context, ...args) {
  context = context == null ? globalThis : Object(context) // 包装 null/undefined 与原始值
  const key = Symbol('fn') // 避免覆盖 context 已有属性
  context[key] = this
  const result = context[key](...args)
  delete context[key]
  return result
}

// myApply：与 myCall 仅参数形式不同
Function.prototype.myApply = function (context, argsArray) {
  context = context == null ? globalThis : Object(context)
  const key = Symbol('fn')
  context[key] = this
  const result = argsArray ? context[key](...argsArray) : context[key]()
  delete context[key]
  return result
}

// myBind：返回新函数，new 调用时 this 要指向新实例
Function.prototype.myBind = function (context, ...bindArgs) {
  const fn = this
  function bound(...callArgs) {
    const self = this instanceof bound ? this : context
    return fn.apply(self, [...bindArgs, ...callArgs])
  }
  bound.prototype = Object.create(fn.prototype) // 保持 instanceof 关系
  return bound
}

// 测试 1：call / apply 指定 this
const person = { name: '张三' }
function introduce(greeting, job) {
  return `${greeting}，我是${this.name}，一名${job}`
}
console.log(introduce.myCall(person, '你好', '前端工程师'))
console.log(introduce.myApply(person, ['早上好', '面试官']))

// 测试 2：bind 参数预置 + 延迟调用
const bound = introduce.myBind(person, '晚上好')
console.log(bound('候选人'))

// 测试 3：bind 后的函数被 new 调用，this 指向新实例
function Animal(name) { this.name = name }
Animal.prototype.speak = function () { return this.name }
const BoundAnimal = Animal.myBind({ name: '绑定的名字会被忽略' })
const cat = new BoundAnimal('咪咪')
console.log('new 调用:', cat.name, cat instanceof Animal, cat.speak())
```

```text output
你好，我是张三，一名前端工程师
早上好，我是张三，一名面试官
晚上好，我是张三，一名候选人
new 调用: 咪咪 true 咪咪
```

## 原理讲解

三个方法的实现都基于一条核心规则：**函数作为对象的方法被调用时，this 指向该对象**。

1. **myCall / myApply**：把 `this`（即原函数）临时挂到 `context` 的一个临时属性上，用 `context[key](...)` 的方式调用，this 自然就指向了 `context`；调用完 `delete` 清理痕迹并返回结果。临时属性用 `Symbol` 防止覆盖 context 上的同名属性。
2. **context 兜底**：`context == null`（同时覆盖 null 和 undefined）时指向 `globalThis`；传原始值时用 `Object(context)` 包装成对象，否则无法挂属性。
3. **myBind 的两个难点**：
   - **参数柯里化**：用闭包保存 `bindArgs`，调用时与 `callArgs` 拼接；
   - **new 调用优先**：`new bound()` 时 `this instanceof bound` 为真，此时应忽略绑定的 context，把 this 指向新实例；同时设置 `bound.prototype = Object.create(fn.prototype)`，保证 `cat instanceof Animal` 成立。

## 追问与易错点

- **call/apply/bind 的区别？** call 和 apply 都是立即调用，区别只在传参形式（逐个 vs 数组）；bind 不调用，返回绑定了 this 的新函数。口诀：call 记成 comma（逗号分隔），apply 记成 array。
- **为什么临时属性要用 Symbol？** 防止 context 上恰好有同名属性被覆盖或删除，造成数据污染。
- **bind 可以链式绑定吗？** `fn.bind(a).bind(b)` 的 this 仍是 a——bind 一旦绑定就不可改，因为第二次 bind 包装的是已经绑定好的函数。
- **箭头函数能被 call/bind 改 this 吗？** 不能，箭头函数没有自己的 this，它捕获定义时外层作用域的 this。
- **softBind 是什么？** 让绑定只在「默认绑定（globalThis/undefined）」时生效、显式绑定时让位的写法，是 bind 的进阶追问。

## 相关题目

- [handwriting-007-curry](/q/handwriting/handwriting-007-curry)
- [handwriting-001-debounce-throttle](/q/handwriting/handwriting-001-debounce-throttle)
