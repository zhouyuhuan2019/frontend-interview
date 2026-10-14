---
title: 原型与原型链是什么？怎么实现继承？
subtopic: 原型链与继承
difficulty: middle
frequency: high
tags: [原型, 原型链, 继承, class]
order: 70
related: [js-008-new-operator, js-013-typeof-instanceof]
---

## 参考答案

- 每个**函数**都有 `prototype` 属性，指向它的原型对象；每个**对象**都有内部槽 `[[Prototype]]`（通过 `__proto__` 或 `Object.getPrototypeOf` 访问），指向其构造函数的 `prototype`。
- 访问对象属性时，先在自身找，找不到就沿 `[[Prototype]]` 一层层向上找，直到 `Object.prototype`（再往上是 `null`）——这条链就是**原型链**。
- 继承的主流实现：ES6 用 `class extends`（本质是原型链的语法糖）；ES5 经典做法是"寄生组合继承"（借用构造函数 + `Object.create`）。

## 原理讲解

原型链的查找过程：

```js run
function Animal(name) {
  this.name = name
}
Animal.prototype.speak = function () {
  console.log(this.name + ' makes a sound')
}

const dog = new Animal('dog')
dog.speak() // dog 自身没有 speak，沿原型链在 Animal.prototype 上找到

console.log(dog.__proto__ === Animal.prototype) // true
console.log(Animal.prototype.__proto__ === Object.prototype) // true
console.log(Object.prototype.__proto__) // null：原型链终点
console.log(dog.constructor === Animal) // true
```

class 继承的标准写法：

```js run
class Animal {
  constructor(name) {
    this.name = name
  }
  speak() {
    console.log(this.name + ' makes a sound')
  }
}

class Dog extends Animal {
  constructor(name) {
    super(name) // 子类必须先调用 super 才能使用 this
  }
  speak() {
    super.speak() // 复用父类方法
    console.log(this.name + ' barks')
  }
}

const d = new Dog('旺财')
d.speak()
console.log(d instanceof Dog) // true
console.log(d instanceof Animal) // true：沿原型链可查到
```

ES5 时代的寄生组合继承（看得懂即可）：

```js title="寄生组合继承"
function Parent(name) {
  this.name = name
}
function Child(name, age) {
  Parent.call(this, name) // 继承实例属性
  this.age = age
}
Child.prototype = Object.create(Parent.prototype) // 继承原型方法
Child.prototype.constructor = Child // 修复 constructor 指向
```

关键结论：`class` 只是原型继承的语法糖——`typeof Animal === 'function'`，类的方法依然挂在 `prototype` 上，只是不可枚举。

## 追问与易错点

- **prototype 和 \_\_proto\_\_ 的区别？** `prototype` 是函数特有的属性，指向原型对象；`__proto__` 是对象访问自身 `[[Prototype]]` 的访问器。对实例而言：`dog.__proto__ === Dog.prototype`。
- **原型链的终点是什么？** `Object.prototype.__proto__ === null`，查到这里还找不到就返回 undefined。
- **hasOwnProperty 有什么用？** 区分属性是自身所有还是继承来的；`for...in` 会遍历到继承的可枚举属性，通常要配合它过滤。
- **为什么方法要挂在 prototype 上？** 让所有实例共享同一份函数，避免每个实例都创建副本，节省内存。
- **class 继承与 ES5 继承的关键区别？** class 子类必须先 `super()` 才能用 `this`（this 由父类"创建"）；class 方法不可枚举；class 不存在提升且自动运行在严格模式。

## 相关题目

- [js-008-new-operator](/q/js/js-008-new-operator)
- [js-013-typeof-instanceof](/q/js/js-013-typeof-instanceof)
