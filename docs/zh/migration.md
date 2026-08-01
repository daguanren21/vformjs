# Vue 2.7 到 Vue 3 迁移

vformjs 的表单生命周期不随 UI 宿主变化。迁移工具只处理能一一对应的语法；涉及业务含义和组件行为的差异进入报告，不做猜测。

## 同业务参考

仓库用同一份任务 CRUD 弹窗分别运行两套技术栈：

| 技术栈 | 源码 | 运行 |
|---|---|---|
| Vue 2.7 + element-ui | [`playgrounds/vue2-element-ui/src/demos/DialogCrudDemo.vue`](https://github.com/daguanren21/vformjs/blob/main/playgrounds/vue2-element-ui/src/demos/DialogCrudDemo.vue) | `pnpm dev:vue2` |
| Vue 3 + Element Plus | [`playgrounds/vue3-element-plus/src/demos/DialogCrudDemo.vue`](https://github.com/daguanren21/vformjs/blob/main/playgrounds/vue3-element-plus/src/demos/DialogCrudDemo.vue) | `pnpm dev:vue3` |

两边使用相同 defaults 和 `Row` 类型，调用相同的 `form.load('create' | 'edit' | 'detail')`，提交相同数据结构，reset 回到当前基线，详情模式都用 Descriptions 展示。

## 保持不变的契约

| 契约 | 迁移时 |
|---|---|
| `defaults` 与 `form.model` 类型推导 | 不变 |
| `load`、`mode`、`editable`、`readonly` | 不变 |
| `reset`、`rebaseDefaults`、`dirty`、`changedPaths` | 不变 |
| `submit`、`validateField`、接口 `errors` | 不变 |
| `when`、`whenRules`、`linkage`、`list` | 不变 |
| Zod schema 与解析后的提交值 | 不变，只替换 adapter 导入 |

## 运行迁移

```bash
# 只看改动和人工项，不写文件
pnpm dlx vformjs migrate vue2-to-vue3 --dry-run --json

# 应用安全改动，并保存复核清单
pnpm dlx vformjs migrate vue2-to-vue3 --report migration-report.json
```

自动项全部完成且没有人工项时返回 `0`；安全改动已完成但仍需复核时返回 `2`；解析或配置失败返回 `1`。

## 自动处理范围

- `@vformjs/element-ui` 导入改为 `@vformjs/element-plus`
- `element-ui` 与主题 CSS 导入改为 Element Plus
- `@vitejs/plugin-vue2` 导入和依赖改为 `@vitejs/plugin-vue`
- package 里的 Vue 3、Element Plus、`@vue/compiler-sfc` 依赖
- `<el-submenu>` 改为 `<el-sub-menu>`
- Element Dialog 的 `:visible.sync="state"` 改为 `v-model="state"`
- Element Input 显式 `:value` / `@input` 改为 `:model-value` / `@update:model-value`

工具先解析 JavaScript/TypeScript import 和 Vue template，再按源码位置修改。重复执行不会产生新改动。

## 必须人工判断的差异

报告为每一项记录文件、行号、code、证据和处理方向：

- `new Vue`、`Vue.use` 与插件注册
- 非 Element Dialog 组件上的 `.sync`
- `.native`、`$listeners`、旧 slot、render function
- `this.$message` 一类原型服务
- `el-icon-*` 类名和 Element UI 子路径导入
- 项目自己的 loader、router、store 和构建链差异

这些项目没有通用安全答案。按目标组件和项目架构处理后再次运行，直到报告里只剩团队确认保留的项目。
