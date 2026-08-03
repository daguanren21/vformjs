# vformjs

[English](./README.md) | [简体中文](./README.zh-CN.md)

[![CI](https://github.com/daguanren21/vformjs/actions/workflows/ci.yml/badge.svg)](https://github.com/daguanren21/vformjs/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@vformjs/element-plus?label=npm)](https://www.npmjs.com/package/@vformjs/element-plus)
[![npm provenance](https://img.shields.io/badge/npm-provenance-verified-2ea44f)](https://registry.npmjs.org/-/npm/v1/attestations/@vformjs%2felement-plus@0.1.1)
[![license](https://img.shields.io/github/license/daguanren21/vformjs)](./LICENSE)

面向 Vue 2.7 / Vue 3 后台项目的 CRUD 表单编排层。保留 Element Plus、element-ui、Naive UI 或 Ant Design Vue 原生 Form；一个类型明确的 form 实例处理新建、编辑、详情、校验、接口错误、reset 基线、联动和动态行。

[在线示例](https://vformjs.vercel.app/zh/examples) · [快速开始](https://vformjs.vercel.app/zh/guide) · [API](https://vformjs.vercel.app/zh/api) · [讨论区](https://github.com/daguanren21/vformjs/discussions)

## 安装

```bash
pnpm add @vformjs/element-plus element-plus vue     # Vue 3
# pnpm add @vformjs/element-ui element-ui vue@^2.7 # Vue 2.7
# pnpm add @vformjs/naive-ui naive-ui vue
# pnpm add @vformjs/ant-design-vue ant-design-vue vue
```

| 包 | 用途 |
|----|------|
| `@vformjs/element-plus` | Vue 3 + Element Plus，日常从这个进 |
| `@vformjs/element-ui` | Vue 2.7 + element-ui |
| `@vformjs/naive-ui` | Vue 3 + Naive UI |
| `@vformjs/ant-design-vue` | Vue 3 + Ant Design Vue |
| `@vformjs/vue` | 自定义 UI 时用 `useForm` / `defineAdapter` |
| `@vformjs/zod` | Zod schema 桥 |
| `@vformjs/core` | 无头引擎，一般不用直接装 |

## 最小例子

```ts
import { r, submitFail, useElForm } from '@vformjs/element-plus'

const form = useElForm({
  defaults: { name: '', email: '' },
  rules: {
    name: [r.required(), r.min(2)],
    email: [r.required(), r.email()],
  },
  onSubmit: async (values) => {
    const result = await api.save(values)
    if (!result.ok)
      return submitFail(result.error, { errors: result.fieldErrors })
  },
})
```

```vue
<template>
  <el-form v-bind="form.host" label-width="100px">
    <el-form-item label="姓名" v-bind="form.item('name')">
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

`form.host` 是 `{ ref, model, rules }`，`form.item(path)` 会补齐宿主字段属性与错误。
`defaults` 会推 `form.model` 和 `onSubmit(values)` 的类型。
`onSubmit` 可以返回 `submitFail(error, { errors })`：错误类型保留在
`result.submitError`，字段错误同步进入响应式 `form.errors`。

## 装完之后常用这几下

```ts
form.load('create')
form.load('edit', detail)
form.load('detail', detail)

await form.submit()
form.reset()
form.validateField('email')
form.list('contacts').append()
form.dirty
form.setErrors({ email: ['邮箱已注册'] })
form.scrollToFirstError()
```

- **模式**：form 放弹窗或表单页里，列表页不要 `useForm`。详情用 Descriptions，别整表 `disabled`。
- **提交失败**：用 `submitFail` 返回类型化 API 错误，并可附带字段错误。
- **规则**：`r.required()` / `r.email()` / `r.min()`，或 `rules: (values) => …`。
- **显隐**：`when`、`whenRules`；模板里 `v-if="!form.hidden('x').value"`。
- **联动**：`linkage: [{ deps, run }]`。
- **数组**：`form.list('items')`，`fields` 带稳定 `key`。
- **Zod**：`import { useZodForm } from '@vformjs/element-plus/zod'`。

## 文档

| 入口 | 内容 |
|------|------|
| **[在线示例](https://vformjs.vercel.app/zh/examples)** | 真实 Element Plus 弹窗 CRUD、条件联动、动态数组与 Zod |
| **[快速开始](https://vformjs.vercel.app/zh/guide)** | 安装、绑定宿主 Form、模式、规则、数组、Zod、adapter |
| **[Vue 2.7 → Vue 3](https://vformjs.vercel.app/zh/migration)** | 稳定表单契约、安全 codemod 范围、dry-run 与人工复核报告 |
| **[API](https://vformjs.vercel.app/zh/api)** | 选项、返回值、`r.*`、linkage、adapter 契约 |
| **[接入反馈](https://github.com/daguanren21/vformjs/issues/new/choose)** | 记录真实项目完成接入或中途卡住的原因 |

## Agent CLI

```bash
pnpm dlx vformjs init
pnpm dlx vformjs add form profile
pnpm dlx vformjs audit forms --json
pnpm dlx vformjs doctor
pnpm dlx vformjs migrate vue2-to-vue3 --dry-run --json
pnpm dlx vformjs skill install
```

CLI 从 `package.json` 检测宿主和 Zod。生成模块直接使用 `form.host`、`form.item(path)`、类型安全路径、独立语言规则与类型化提交结果；Zod 只走 `/zod` 子入口。重复执行不会改写相同文件，已编辑文件默认拒绝覆盖。

私有或公司 UI 包不会被自动识别。通过 `--adapter-package` 和
`--form-factory` 显式配置生成代码的导入与工厂；运行时适配继续由业务侧
基于 `defineAdapter` 封装。

## 本地

```bash
pnpm install
pnpm test
pnpm docs:dev    # 产品首页与文档站
pnpm docs:build
pnpm dev:vue3
pnpm dev:vue2
pnpm dev:naive
pnpm dev:antd
```

## License

[MIT](./LICENSE)
