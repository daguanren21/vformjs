# vformjs

[English](./README.md) | [简体中文](./README.zh-CN.md)

[![CI](https://github.com/daguanren21/vformjs/actions/workflows/ci.yml/badge.svg)](https://github.com/daguanren21/vformjs/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@vformjs/element-plus?label=npm)](https://www.npmjs.com/package/@vformjs/element-plus)
[![npm provenance](https://img.shields.io/badge/npm-provenance-verified-2ea44f)](https://registry.npmjs.org/-/npm/v1/attestations/@vformjs%2felement-plus@0.1.1)
[![license](https://img.shields.io/github/license/daguanren21/vformjs)](./LICENSE)

Typed CRUD form lifecycle for Vue 2.7 and Vue 3. Keep the existing Element Plus, element-ui, Naive UI, or Ant Design Vue Form; one typed form instance owns create/edit/detail, validation, API errors, reset baselines, linkage, and dynamic rows.

[Live examples](https://vformjs.vercel.app/examples) · [Guide](https://vformjs.vercel.app/guide) · [API](https://vformjs.vercel.app/api) · [Discussions](https://github.com/daguanren21/vformjs/discussions)

## Is vformjs for your project?

vformjs is designed for **admin projects with many CRUD forms**. It fits well if you have:

- **20+ forms**, mostly create/edit dialogs
- **Repeated create/edit mode switching** logic
- **Cancel flows that reset to baseline state**
- **Server-side field-level errors** mapped back to inputs
- **Dynamic arrays** or conditional fields

vformjs can reduce form lifecycle boilerplate by ~20-25% in such projects.

**If your project has fewer than 10 forms** or they're mostly single-mode (login, settings), **a 20-line project-local helper is likely sufficient**. Honest positioning helps you choose correctly.

## Install

```bash
pnpm add @vformjs/element-plus element-plus vue     # Vue 3
# pnpm add @vformjs/element-ui element-ui vue@^2.7 # Vue 2.7
# pnpm add @vformjs/naive-ui naive-ui vue
# pnpm add @vformjs/ant-design-vue ant-design-vue vue
```

| Package | Role |
|---------|------|
| `@vformjs/element-plus` | Vue 3 + Element Plus — start here |
| `@vformjs/element-ui` | Vue 2.7 + element-ui |
| `@vformjs/naive-ui` | Vue 3 + Naive UI |
| `@vformjs/ant-design-vue` | Vue 3 + Ant Design Vue |
| `@vformjs/vue` | `useForm` / `defineAdapter` for custom UI |
| `@vformjs/zod` | Zod schema bridge |
| `@vformjs/core` | Headless engine (transitive) |

## Quick start

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
    <el-form-item label="Name" v-bind="form.item('name')">
      <el-input v-model="form.model.name" />
    </el-form-item>
    <el-form-item label="Email" prop="email">
      <el-input v-model="form.model.email" />
    </el-form-item>
    <el-button type="primary" :loading="form.submitting" @click="form.submit()">
      Submit
    </el-button>
  </el-form>
</template>
```

`form.host` is `{ ref, model, rules }`. `form.item(path)` supplies host-specific field props and errors.
`onSubmit` may return `submitFail(error, { errors })`; the error stays typed as
`result.submitError`, and field errors become reactive `form.errors`.

## What you get

- **Modes** — `form.load('create' | 'edit' | 'detail', values?)` in the dialog/page, not the list
- **Trust state** — reactive `errors`, `dirty`, `changedPaths`, and server-error scrolling
- **Submit failures** — typed `submitError` values with optional field errors
- **Rules** — `r.required()`, email, min/max, pattern, custom; or a function of values
- **when / whenRules** — show/hide and conditional rules
- **linkage** — react when other fields change
- **list / fieldArray** — dynamic rows with stable keys
- **Zod** — `useZodForm({ schema, defaults })` from `@vformjs/element-plus/zod`
- **Adapters** — swap UI without rewriting form logic

## Docs

| Link | Content |
|------|---------|
| **[Live examples](https://vformjs.vercel.app/examples)** | Real Element Plus CRUD, conditional linkage, and dynamic array + Zod flows |
| **[Guide](https://vformjs.vercel.app/guide)** | Install, bind the host Form, modes, rules, arrays, Zod, adapters |
| **[Vue 2.7 → Vue 3](https://vformjs.vercel.app/migration)** | Stable form contracts, safe codemod scope, dry-run, and manual review report |
| **[API](https://vformjs.vercel.app/api)** | Options, return types, `r.*`, linkage, and adapter contracts |
| **[Integration feedback](https://github.com/daguanren21/vformjs/issues/new/choose)** | Report a completed or blocked real-project adoption |

## Agent-friendly CLI

```bash
pnpm dlx vformjs init
pnpm dlx vformjs add form profile
pnpm dlx vformjs audit forms --json
pnpm dlx vformjs doctor
pnpm dlx vformjs migrate vue2-to-vue3 --dry-run --json
pnpm dlx vformjs skill install
```

Host and Zod detection come from `package.json`. Generated modules use `form.host`, `form.item(path)`, typed paths, localized rules, and typed submit outcomes; Zod imports only the `/zod` subpath. Output is idempotent, and edited files are never replaced without `--force`. Use `--dry-run --json` in coding-agent loops.

Private/company UI packages are never auto-detected. Configure their generated
import and factory explicitly with `--adapter-package` and `--form-factory`;
runtime integration remains a business-owned `defineAdapter` wrapper.

## Local

```bash
pnpm install
pnpm test
pnpm docs:dev    # product site + docs
pnpm docs:build
pnpm dev:vue3    # Element Plus playground
pnpm dev:vue2
pnpm dev:naive
pnpm dev:antd
```

## License

[MIT](./LICENSE)
