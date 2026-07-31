# Guide

Install → bind host form → submit. Modes, arrays, linkage, Zod, custom UI.

## Install

```bash
# Vue 3 + Element Plus
pnpm add @vformjs/element-plus element-plus vue

# Vue 2.7 + element-ui
pnpm add @vformjs/element-ui element-ui vue@^2.7

# Custom UI only
pnpm add @vformjs/vue vue

# Optional Zod bridge
pnpm add @vformjs/zod zod
```

| Package | You import |
|---------|------------|
| `@vformjs/element-plus` | `useElForm`, `r`, `useZodForm` |
| `@vformjs/element-ui` | same for Vue 2.7 |
| `@vformjs/vue` | `useForm`, `defineAdapter`, `r` |
| `@vformjs/zod` | `useZodForm` (or via UI package) |
| `@vformjs/core` | transitive — rarely direct |

## First form (Element Plus)

```ts
import { useElForm, r } from '@vformjs/element-plus'

const form = useElForm({
  defaults: { name: '', email: '' },
  rules: {
    name: [r.required(), r.min(2)],
    email: [r.required(), r.email()],
  },
  onSubmit: async (values) => {
    await api.save(values)
  },
})
```

```vue
<template>
  <el-form v-bind="form.el" label-width="100px">
    <el-form-item label="Name" prop="name">
      <el-input v-model="form.model.name" />
    </el-form-item>
    <el-form-item label="Email" prop="email">
      <el-input v-model="form.model.email" />
    </el-form-item>
    <el-button type="primary" :loading="form.submitting" @click="onSubmit">
      Submit
    </el-button>
    <el-button @click="form.reset()">Reset</el-button>
  </el-form>
</template>

<script setup lang="ts">
async function onSubmit() {
  const res = await form.submit()
  if (!res.ok) {
    // res.errors: Record<field, string[]>
  }
}
</script>
```

`form.el` = `{ ref, model, rules }`. One `v-bind` wires the host form.

`defaults` drives TypeScript inference for `form.model` and `onSubmit(values)`.

element-ui: same API from `@vformjs/element-ui`.

## After install — common ops

```ts
// read / write
form.model.name
form.setFieldValue('profile.email', 'a@b.com')
form.getFieldValue('profile.email')
form.setValues({ name: 'x' })          // merge partial
form.getValues()                       // snapshot
form.getValues({ hidden: 'omit' })     // drop hidden fields

// validate
await form.validate()
await form.validateField('email')
form.clearValidate()
form.clearValidate(['email', 'name'])

// submit
const res = await form.submit()
// res.ok ? res.values : res.errors
await form.submit(async (values) => api.save(values)) // one-shot handler

// reset
form.reset()
form.reset('email')
form.rebaseDefaults(detail)            // next reset() returns to detail
```

## Modes: create / edit / detail

Put `useElForm` **inside the dialog or form page**. List pages only open UI / route.

```ts
form.load('create')
form.load('edit', detail)
form.load('detail', detail)

form.mode      // 'create' | 'edit' | 'detail'
form.editable  // create | edit → true
form.readonly  // detail → true
```

```vue
<el-form v-if="form.editable" v-bind="form.el">...</el-form>

<el-descriptions v-else-if="form.readonly" border>
  <el-descriptions-item label="Name">{{ form.model.name }}</el-descriptions-item>
</el-descriptions>
```

Detail UI should be Descriptions / text, not a disabled form. `submit()` rejects in detail mode.

Dialog sketch:

```
ListPage          → no form
  └─ TaskDialog   → owns form
       openCreate → form.load('create')
       openEdit   → fetch → form.load('edit', detail)
       openDetail → fetch → form.load('detail', detail)
```

## Rules

```ts
import { r } from '@vformjs/element-plus'

rules: {
  name: [r.required(), r.min(2), r.max(32)],
  email: [r.required(), r.email()],
  age: [r.numberMin(0), r.numberMax(120)],
  phone: [r.mobile()],
  site: [r.url()],
  code: [r.pattern(/^[A-Z]+$/, 'uppercase only')],
  agree: [r.requiredTrue('accept terms')],
}
```

Helpers (async-validator style):  
`required` · `email` · `url` · `min` · `max` · `len` · `range` ·  
`number` · `integer` · `numberMin` · `numberMax` · `numberRange` ·  
`pattern` · `mobile` · `idCard` · `requiredTrue` · `custom(validator)`

String sugar also works: `rules: { name: 'required' }`.

Dynamic rules from values:

```ts
rules: (values) => ({
  other: values.type === 'other' ? [r.required()] : [],
})
```

## Conditional fields

```ts
const form = useElForm({
  defaults: { type: 'a', extra: '' },
  when: {
    // path → visible when true
    extra: (v) => v.type === 'other',
  },
  whenRules: {
    extra: (v) => (v.type === 'other' ? [r.required()] : null),
  },
  rules: { type: [r.required()] },
})
```

```vue
<el-form-item v-if="!form.hidden('extra').value" label="Extra" prop="extra">
  <el-input v-model="form.model.extra" />
</el-form-item>
```

Hidden fields drop rules and clear validation automatically.

## Linkage

```ts
linkage: [
  {
    deps: ['city'],
    run: ({ get, set, setOptions, clearValidate }) => {
      const city = get('city')
      set('district', '')
      setOptions('district', districtsOf(city))
      clearValidate('district')
    },
  },
]
```

`deps: '*'` listens to every change. `when: 'init'` runs once on create.

If you mutate `form.model` via `v-model` and linkage does not fire, call `form.notifyChange('city')`.

## Field arrays

```ts
const contacts = form.list<{ name: string, phone: string }>('contacts', {
  defaultItem: () => ({ name: '', phone: '' }),
})
```

```vue
<div v-for="row in contacts.fields.value" :key="row.key">
  <el-form-item :prop="`contacts.${row.index}.name`" :rules="[r.required()]">
    <el-input v-model="form.model.contacts[row.index].name" />
  </el-form-item>
  <el-button @click="contacts.remove(row.index)">Remove</el-button>
</div>
<el-button @click="contacts.append()">Add</el-button>
```

API: `append` · `prepend` · `insert` · `remove` · `move` · `replace` · `update` · `clear` · `fields`.

## Zod

```ts
import { z } from 'zod'
import { useZodForm } from '@vformjs/element-plus/zod'
// also re-exported from '@vformjs/element-plus'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.coerce.number().min(0),
}).refine((v) => v.name !== 'admin', { message: 'reserved', path: ['name'] })

const form = useZodForm({
  schema,
  defaults: { name: '', email: '', age: 0 },
  onSubmit: async (values) => {
    // values: z.output — transforms / coerce applied
    await api.save(values)
  },
})
```

Field blur/change runs full `safeParse` (including `refine`).  
Success `submit` / `validate` return **parsed output**.

## Custom UI adapter

Official packages cover Element only. Naive / Ant Design Vue / custom shells:

```ts
import { defineAdapter, useForm, r, adapterOk, adapterFail } from '@vformjs/vue'

const createNaiveAdapter = defineAdapter({
  name: 'naive-ui',
  async validate(host, { paths }) {
    // host is your FormInst; throw or return adapterFail(errors)
    await host.validate(/* filter by paths if needed */)
  },
  clearValidate(host) {
    host.restoreValidation()
  },
})

const form = useForm({
  defaultValues: { name: '' },
  rules: { name: [r.required()] },
  adapter: createNaiveAdapter(),
  onSubmit: async (v) => api.save(v),
})
```

```vue
<!-- bind host instance so adapter can validate -->
<n-form ref="formRef" :model="form.model" :rules="naiveRules">
  ...
</n-form>
```

```ts
// after mount / when ref ready
form.bindHost(formRef.value)
```

Runnable copies: `playgrounds/vue3-naive-ui`, `playgrounds/vue3-antd-vue` (`pnpm dev:naive` / `pnpm dev:antd`).

`normalizeHostErrors` already maps common Naive / Ant Design error shapes.

## Local playgrounds

```bash
pnpm install
pnpm dev:vue3    # Element Plus
pnpm dev:vue2    # element-ui
pnpm dev:naive
pnpm dev:antd
pnpm test
pnpm build
```

Full API tables → [api.md](./api.md).
