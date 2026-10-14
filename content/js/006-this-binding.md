---
title: this 指向有哪些规则？箭头函数的 this 指向什么？
subtopic: this 与调用绑定
difficulty: middle
frequency: high
tags: [this, 绑定规则, 箭头函数, call-apply-bind]
order: 60
related: [js-007-prototype-chain, js-008-new-operator]
---

## 参考答案

普通函数的 `this` 在**调用时**才确定，共有 4 条绑定规则，优先级从高到低：

| 优先级 | 规则 | 调用形式 | this 指向 |
|---|---|---|---|
| 1 | new 绑定 | `new Foo()` | 新创建的对象 |
| 2 | 显式绑定 | `fn.call / apply / bind(obj)` | `obj` |
| 3 | 隐式绑定 | `obj.fn()` | `obj` |
| 4 | 默认绑定 | `fn()` | 严格模式下 `undefined`，非严格模式下全局对象 |

箭头函数的 `this`：**没有自己的 this，定义时捕获外层词法作用域的 this**，之后无法被 `call / apply / bind / new` 改变。

## 原理讲解

1. 隐式绑定与"隐式丢失"：

```js run
const obj = {
  name: 'obj',
  say() {
    console.log(this === obj ? 'this 是 obj' : 'this 不是 obj（绑定丢失）')
  }
}

obj.say() // 隐式绑定：this 是 obj

const fn = obj.say // 只取了函数引用，丢失调用对象
fn() // 默认绑定：this 不再是 obj
```

2. 显式绑定三兄弟：

```js run
function greet(greeting) {
  console.log(greeting + ', ' + this.name)
}
const user = { name: 'Alice' }

greet.call(user, 'hi') // 立即调用，参数逐个传
greet.apply(user, ['hello']) // 立即调用，参数用数组
const bound = greet.bind(user) // 返回绑定后的新函数，不立即调用
bound('hey')
```

3. new 绑定：

```js run
function Person(name) {
  this.name = name
}
const p = new Person('Bob')
console.log(p.name) // 'Bob'：this 指向新建的对象
```

4. 箭头函数的词法 this：

```js run
const obj = {
  name: 'obj',
  regular() {
    return function () {
      console.log('普通函数内部: this 是 obj?', this === obj)
    }
  },
  arrow() {
    return () => {
      console.log('箭头函数内部: this.name =', this.name)
    }
  }
}

obj.regular()() // false：普通函数默认绑定，this 丢失
obj.arrow()() // 'obj'：箭头函数捕获定义时外层（obj 方法里）的 this
```

## 追问与易错点

- **四条规则的优先级怎么排？** new > 显式（bind/call/apply）> 隐式 > 默认。`bind` 生成的新函数再用 `call` 传别的对象，this 不会变。
- **箭头函数能当构造函数吗？** 不能。它没有 `[[Construct]]` 内部方法，也没有 `prototype` 属性，`new` 会直接抛 TypeError。
- **call/apply/bind 能改箭头函数的 this 吗？** 不能，this 在定义时就已锁定，但这些方法仍可正常传参。
- **setTimeout 回调里的 this 为什么丢失？** 回调是被定时器以默认绑定方式调用的，不是 `obj.fn()` 形式。解决方案：用箭头函数、提前 `bind`、或外层缓存 `const self = this`。
- **严格模式对 this 有什么影响？** 默认绑定时，严格模式下 `this` 是 `undefined`（访问属性会直接报错），非严格模式是全局对象——这也是面试里"看似是 obj 实际打印 undefined"的常见坑。

## 相关题目

- [js-007-prototype-chain](/q/js/js-007-prototype-chain)
- [js-008-new-operator](/q/js/js-008-new-operator)
