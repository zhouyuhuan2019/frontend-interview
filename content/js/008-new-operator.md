---
title: new 一个对象时发生了什么？手写 myNew
subtopic: 原型链与继承
difficulty: middle
frequency: medium
tags: [new, 手写题, 原型, 构造函数]
order: 80
related: [js-006-this-binding, js-007-prototype-chain]
---

## 参考答案

`new` 一个构造函数时做了 4 件事：

1. 创建一个空对象；
2. 把空对象的 `[[Prototype]]` 指向构造函数的 `prototype`；
3. 以该对象为 `this` 执行构造函数；
4. 若构造函数**返回对象或函数**则以它为结果，否则返回第 1 步创建的对象。

手写 `myNew`：

```js run
function myNew(Constructor, ...args) {
  // 第 1+2 步：创建对象并链接原型
  const obj = Object.create(Constructor.prototype)
  // 第 3 步：绑定 this 执行构造函数
  const result = Constructor.apply(obj, args)
  // 第 4 步：返回值是对象/函数则以它为准，否则用新建对象
  const isObject =
    (typeof result === 'object' && result !== null) || typeof result === 'function'
  return isObject ? result : obj
}

function Person(name) {
  this.name = name
}
Person.prototype.sayHi = function () {
  console.log('hi, ' + this.name)
}

const p1 = new Person('new 创建')
const p2 = myNew(Person, 'myNew 创建')
p1.sayHi()
p2.sayHi()
console.log(p2 instanceof Person) // true：原型链链接成功
```

## 原理讲解

第 4 步的"返回值优先级"是最容易被忽略的细节：

```js run
function ReturnsObject() {
  this.x = 1
  return { y: 2 } // 返回对象：new 的结果被它覆盖
}
function ReturnsPrimitive() {
  this.x = 1
  return 42 // 返回原始值：被忽略
}

const a = new ReturnsObject()
console.log('a =', JSON.stringify(a)) // {"y":2}：x 被丢弃了
const b = new ReturnsPrimitive()
console.log('b.x =', b.x) // 1：原始返回值不影响结果
```

对照 4 个步骤逐条验证：

```js run
function Foo() {}
const f = new Foo()

// 步骤 2 的证据：实例原型指向构造函数 prototype
console.log(Object.getPrototypeOf(f) === Foo.prototype) // true
// 步骤 3 的证据：构造函数里的 this 就是新对象
function Bar() {
  console.log('构造中 this 的原型正确?', Object.getPrototypeOf(this) === Bar.prototype)
}
new Bar() // true
```

## 追问与易错点

- **构造函数里 return 会怎样？** 返回对象/函数则成为 `new` 的结果；返回原始值（含 null 以外的基本类型）被忽略，仍返回新建对象。
- **箭头函数能被 new 吗？** 不能。它没有 `[[Construct]]` 内部方法和 `prototype`，`new` 会抛 TypeError。
- **Object.create(null) 的对象能用 instanceof 吗？** 它的原型是 `null`，对任何构造函数 `instanceof` 都是 false，也没有 `hasOwnProperty` 等方法，常作"纯字典"使用。
- **new.target 是什么？** 函数被 `new` 调用时 `new.target` 指向该函数本身，普通调用时为 `undefined`，可用来强制构造函数必须通过 `new` 调用。
- **不用 new 直接调用构造函数会怎样？** 非严格模式下属性会挂到全局对象上造成污染；严格模式下 `this` 是 `undefined`，赋值直接报错。

## 相关题目

- [js-006-this-binding](/q/js/js-006-this-binding)
- [js-007-prototype-chain](/q/js/js-007-prototype-chain)
