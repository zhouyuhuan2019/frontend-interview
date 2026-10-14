---
title: Vue2 中改了数组或对象，视图为什么不更新？$set 该怎么用？
subtopic: 响应式原理
difficulty: middle
frequency: high
tags: [Vue2, 响应式, Vue.set, 数组更新, 对象新增]
order: 90
related: [vue2-001-reactivity-principle, vue3-001-proxy-reactivity]
---

同事在代码里这样改数据，结果页面纹丝不动，控制台也没有报错：

```js
// 给对象新增一个属性
this.user.age = 18

// 或者给数组按下标赋值
this.list[0] = { text: '新内容' }

// 也可能删掉一个属性
delete this.user.age
```

`this.user` 和 `this.list` 明明都在 `data` 里，为什么视图不更新？应该怎么改才对？

## 参考答案

根因只有一句话：**Vue2 的响应式是「初始化时给已存在的属性装 getter/setter」，它无法感知后续新增 / 删除的对象属性，也无法感知数组的下标赋值与长度修改。**

三类「改了不更新」的场景与解法：

| 场景 | 现象 | 正确做法 |
|---|---|---|
| 对象新增属性 | `this.obj.newKey = v` 无效 | `this.$set(this.obj, 'newKey', v)` |
| 对象删除属性 | `delete this.obj.key` 无效 | `this.$delete(this.obj, 'key')` |
| 数组按下标赋值 | `this.arr[i] = v` 无效 | `this.$set(this.arr, i, v)` 或 `this.arr.splice(i, 1, v)` |
| 数组修改长度 | `this.arr.length = 0` 无效 | `this.arr.splice(0)` |

`$set` / `$delete` 是 `Vue.set` / `Vue.delete` 的实例方法，本质是「给目标补一次响应式拦截，再手动通知依赖更新」。

## 原理讲解

**现象**：改了数据，视图不动。**原因**：Vue2 用 `Object.defineProperty` 在初始化阶段递归遍历 `data`，只给「当时已存在的键」装上 getter/setter；之后新增的键是普通属性，没有 setter，自然无法通知 watcher。

用简化版响应式复现这个现象：

```js run
function defineReactive(obj, key) {
  let value = obj[key]
  Object.defineProperty(obj, key, {
    get() { return value },
    set(next) {
      value = next
      console.log('更新 ' + key + ' = ' + JSON.stringify(next))
    },
  })
}

function observe(obj) {
  Object.keys(obj).forEach((key) => defineReactive(obj, key))
}

// 模拟 Vue.set：先补一次响应式拦截，再赋值并通知
function set(target, key, val) {
  if (!Object.prototype.hasOwnProperty.call(target, key)) {
    defineReactive(target, key)
  }
  target[key] = val
}

const user = { name: 'Tom' }
observe(user)

user.name = 'Jerry' // ① 已有属性：setter 生效，触发更新
user.age = 18       // ② 新增属性：没有任何输出，视图不会更新
console.log('after age:', user.age)

const profile = { name: 'Tom' }
observe(profile)
set(profile, 'age', 18) // ③ Vue.set：补拦截后赋值，触发更新
```

```text output
更新 name = "Jerry"
after age: 18
更新 age = 18
```

可以看到：② 直接新增 `age` 完全静默，值虽然变了（`after age: 18`），却没有 setter 去通知渲染；③ 用 `Vue.set` 补上拦截后才打印出 `更新 age = 18`。

**数组为什么特殊？** Vue2 没有用 `defineProperty` 拦截每个下标（那样开销大、兼容性也差），而是把数组原型上的 7 个方法 `push` / `pop` / `shift` / `unshift` / `splice` / `sort` / `reverse` 改造成「先执行原方法，再手动 `ob.dep.notify()`」。所以：

```js
// ✅ 这 7 个变异方法都会触发更新
this.list.push(item)
this.list.splice(index, 1, newItem) // 等价于「按下标赋值 + 通知」
this.list.sort()

// ❌ 下标赋值 / 改长度不会触发更新
this.list[0] = newItem
this.list.length = 0

// ✅ 想按下标改，用 $set 或 splice
this.$set(this.list, 0, newItem)
this.list.splice(0, 1, newItem)
```

**和 Vue3 的对比**：Vue3 改用 `Proxy` 代理整个对象，「访问到才代理、增删和下标赋值都能拦截」，所以不再需要 `$set`。这也是面试里常拿来对比 Vue2 缺陷的点。

## 追问与易错点

- **直接给 `this.user = newObj`（整体替换引用）会更新吗？** 会。`user` 这个键本身有 setter，赋新对象会触发更新；出问题的是「改它内部新增的属性」，不是替换引用本身。
- **`$set` 能加在 data 根级吗？** 可以但没必要。往 `this` 上新增属性用 `this.$set(this, 'x', 1)`；能预先声明的字段就放进 `data` 里。
- **`$set` 为什么能生效？** 它在目标对象上补一次 `defineReactive` 并手动 `dep.notify()`；对数组则等价于 `splice`。
- **`delete this.obj.key` 与 `this.$delete` 的区别？** `delete` 只删了值，没有通知依赖；`$delete` 删除后手动通知，视图才会刷新。
- **为什么 Vue2 数组不用 `defineProperty` 逐个拦截下标？** 数组下标数量不确定、频繁增删，逐个定义开销大，且 `length` 无法用 `defineProperty` 可靠拦截（旧浏览器兼容问题），所以选择重写方法。
- **`Object.freeze` 之后的数据改不动有影响吗？** 冻结对象 Vue 会跳过响应式处理，视图本来也不该更新，属于预期行为。

## 相关题目

- [vue2-001-reactivity-principle](/q/vue2/vue2-001-reactivity-principle)
- [vue3-001-proxy-reactivity](/q/vue3/vue3-001-proxy-reactivity)
