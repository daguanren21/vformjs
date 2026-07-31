# vformjs

[English](./README.md) | [简体中文](./README.zh-CN.md)

Vue 2.7 / Vue 3 的表单状态和校验层。  
Element Plus / element-ui 开箱即用；Naive、Ant Design Vue 等自己写一层 `defineAdapter`。

## 安装

```bash
pnpm add @vformjs/element-plus element-plus vue     # Vue 3
# pnpm add @vformjs/element-ui element-ui vue@^2.7 # Vue 2.7
```

| 包 | 用途 |
|----|------|
| `@vformjs/element-plus` | Vue 3 + Element Plus，日常从这个进 |
| `@vformjs/element-ui` | Vue 2.7 + element-ui |
| `@vformjs/vue` | 自定义 UI 时用 `useForm` / `defineAdapter` |
| `@vformjs/zod` | Zod schema 桥 |
| `@vformjs/core` | 无头引擎，一般不用直接装 |

## 最小例子

```ts
import { useElForm, r } from '@vformjs/element-plus'

const form = useElForm({
  defaults: { name: '', email: '' },
  rules: {
    name: [r.required(), r.min(2)],
    email: [r.required(), r.email()],
  },
  onSubmit: async (values) => api.save(values),
})
```

```vue
<template>
  <el-form v-bind="form.el" label-width="100px">
    <el-form-item label="姓名" prop="name">
      <el-input v-model="form.model.name" />
    </el-form-item>
    <el-form-item label="邮箱" prop="email">
      <el-input v-model="form.model.email" />
    </el-form-item>
    <el-button type="primary" :loading="form.submitting" @click="form.submit()">
      提交
    </el-button>
  </el-form>
</template>
```

`form.el` 是 `{ ref, model, rules }`，绑一次即可。  
`defaults` 会推 `form.model` 和 `onSubmit(values)` 的类型。

## 装完之后常用这几下

```ts
form.load('create')
form.load('edit', detail)
form.load('detail', detail)

await form.submit()
form.reset()
form.validateField('email')
form.list('contacts').append()
```

- **模式**：form 放弹窗或表单页里，列表页不要 `useForm`。详情用 Descriptions，别整表 `disabled`。
- **规则**：`r.required()` / `r.email()` / `r.min()`，或 `rules: (values) => …`。
- **显隐**：`when`、`whenRules`；模板里 `v-if="!form.hidden('x').value"`。
- **联动**：`linkage: [{ deps, run }]`。
- **数组**：`form.list('items')`，`fields` 带稳定 `key`。
- **Zod**：`import { useZodForm } from '@vformjs/element-plus/zod'`。

## 文档

| 文档 | 内容 |
|------|------|
| **[guide.md](./docs/guide.md)** | 安装到日常用法（模式、规则、数组、Zod、自定义 adapter） |
| **[api.md](./docs/api.md)** | 选项、返回值、`r.*`、linkage、adapter 表 |

## 本地

```bash
pnpm install
pnpm test
pnpm dev:vue3
pnpm dev:vue2
pnpm dev:naive
pnpm dev:antd
```

## License

[MIT](./LICENSE)
