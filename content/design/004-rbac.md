---
title: 前端权限怎么做？RBAC 与动态路由怎么实现？
subtopic: 权限与守卫
difficulty: middle
frequency: high
tags: [RBAC, 动态路由, 权限设计, 路由守卫, 按钮权限]
order: 40
---

面试官：中后台系统的权限你会怎么做？菜单、页面、按钮三种粒度分别怎么控制？

## 参考答案

先明确原则：**前端权限只做展示层控制，真正的安全边界在后端接口**。前端要做的是「用户能看/能点什么」，核心是 RBAC（基于角色的访问控制）模型。

RBAC 模型：`用户 — 角色 — 权限` 三层。用户绑定角色，角色绑定权限点（如 `user:create`、`order:export`），避免权限直接挂用户造成的组合爆炸。

三种粒度的控制方式：

| 粒度 | 手段 | 实现 |
| --- | --- | --- |
| 菜单 | 动态菜单 | 后端按角色下发菜单树，前端渲染侧边栏 |
| 页面/路由 | 动态路由 | 基础路由静态注册，受限路由按权限 `addRoute` 动态挂载 |
| 按钮/操作 | 权限指令 | 自定义指令（如 `v-permission`）校验权限点，无权限移除元素 |

流程骨架：登录拿 token → 拉取用户信息与权限列表 → 过滤/生成路由表并 `addRoute` → 进入应用 → 按钮级用指令兜底。登出或刷新时 `removeRoute` 清理动态路由。

## 原理讲解

**动态路由**的关键在于「路由表与权限的映射」。常见做法是把全量路由表写在前端，每条受限路由的 `meta` 声明所需权限，登录后按权限过滤再注册：

```ts
// 全量受限路由，meta.roles 声明准入角色
export const asyncRoutes = [
  {
    path: '/user',
    component: () => import('@/views/User.vue'),
    meta: { roles: ['admin', 'operator'] },
  },
  {
    path: '/audit',
    component: () => import('@/views/Audit.vue'),
    meta: { roles: ['admin'] },
  },
]

function filterRoutes(routes, roles) {
  return routes.filter((r) => {
    if (!r.meta?.roles) return true
    return r.meta.roles.some((role) => roles.includes(role))
  })
}
```

在全局前置守卫里控制加载时机——确保权限路由注册完成再放行，用 `next({ ...to, replace: true })` 重新触发导航避免 404：

```ts
router.beforeEach(async (to) => {
  const store = useUserStore()
  if (!store.token) return to.path === '/login' ? true : '/login'
  if (!store.loaded) {
    store.roles = await fetchUserRoles()
    filterRoutes(asyncRoutes, store.roles).forEach((r) => router.addRoute(r))
    store.loaded = true
    return { ...to, replace: true } // 重新匹配，动态路由已就位
  }
  return true
})
```

**按钮级权限**用自定义指令，在挂载时校验、无权限直接从 DOM 移除（比 `display: none` 更彻底）：

```ts
app.directive('permission', {
  mounted(el, binding) {
    const permissions = useUserStore().permissions
    if (!permissions.includes(binding.value)) el.parentNode?.removeChild(el)
  },
})
// 使用：<el-button v-permission="'user:create'">新建用户</el-button>
```

**后端驱动 vs 前端过滤**：小项目可以前端写死路由表按角色过滤；大项目更常见后端直接下发「可访问路由/菜单结构」，前端只做渲染与注册，新增页面权限不用发版改前端代码。

## 追问与易错点

- **只隐藏按钮够安全吗？** 不够。用户可以直接调接口，后端必须对每个接口做权限校验；前端控制只是为了体验和减少无效请求。
- **刷新页面动态路由丢失怎么办？** 路由守卫里检测 `loaded` 标记，刷新后重新拉权限、重新 `addRoute`，再 `next({ ...to, replace: true })` 放行——这是最常见的坑。
- **角色切换/权限变更如何生效？** 最简单是重新登录；要求高可轮询或 WebSocket 推送权限版本号，不一致时提示刷新并重建路由。
- **指令方案有什么局限？** 只在 `mounted` 时执行一次，权限动态变化不响应；且被移除的节点无法用 v-if 条件恢复。复杂场景用渲染函数或组件级判断。
- **前端路由过滤和后端下发菜单选哪个？** 看维护成本：路由结构稳定选前端过滤（首屏无需等接口）；菜单频繁调整、多角色差异大选后端下发。

## 相关题目

- [design-005-micro-frontend](/q/design/design-005-micro-frontend)
