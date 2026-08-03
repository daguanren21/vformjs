# Guide

Install → bind host form → submit. Modes, arrays, linkage, Zod, custom UI.

## Install

```bash
# Vue 3 + Element Plus
pnpm add @vformjs/element-plus element-plus vue

# Vue 2.7 + element-ui
pnpm add @vformjs/element-ui element-ui vue@^2.7

# Vue 3 + Naive UI
pnpm add @vformjs/naive-ui naive-ui vue

# Vue 3 + Ant Design Vue
pnpm add @vformjs/ant-design-vue ant-design-vue vue

# Custom UI only
pnpm add @vformjs/vue vue

# Optional schema validation
pnpm add @vformjs/zod zod
```

| Package | You import |
|---------|------------|
| `@vformjs/element-plus` | `useElForm`, `r`, `useZodForm` |
| `@vformjs/element-ui` | same for Vue 2.7 |
| `@vformjs/naive-ui` | `useNaiveForm`, `r`, `useZodForm` |
| `@vformjs/ant-design-vue` | `useAntdForm`, `r`, `useZodForm` |
| `@vformjs/vue` | `useForm`, `defineAdapter`, `r` |
| `@vformjs/zod` | `useZodForm` (or via UI package) |
| `@vformjs/core` | transitive — rarely direct |

## First form (Element Plus)

```ts
import { r, submitFail, useElForm } from '@vformjs/element-plus'

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
  <el-form v-bind="form.host" label-width="100px">
    <el-form-item label="Name" v-bind="form.item('name')">
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

`form.host` wires `{ ref, model, rules }`; `form.item(path)` maps field props and errors.

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

// server errors / unsaved changes
form.errors.email
form.setErrors({ email: ['Already registered'] })
form.scrollToFirstError()
form.dirty
form.changedPaths

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

For caller-owned state, pass a reactive `model` alongside the reset baseline:

```ts
const model = reactive<FormValues>({ name: '', email: '' })
const form = useElForm({ defaults: { name: '', email: '' }, model })
```

Large forms can avoid the deep model watcher and bind exact paths:

```ts
const form = useElForm({
  defaults,
  modelTracking: 'explicit',
})
const email = form.field('profile.email') // WritableComputedRef<string>
```

```vue
<el-input v-model="email" />
```

In `explicit` mode, mutate through `field(path)`, `setFieldValue`, `setValues`,
or field-array methods. Direct `form.model` writes are intentionally not tracked.

## Server errors and unsaved changes

`errors` is reactive. Bind an API field error to the host item when the UI library
does not expose an imperative server-error API:

```vue
<el-form-item
  label="Email"
  prop="email"
  :error="form.errors.email?.[0]"
>
  <el-input v-model="form.model.email" />
</el-form-item>
```

```ts
const result = await form.submit(async (values) => {
  const response = await api.save(values)
  if (!response.ok) {
    return submitFail(response.error, {
      errors: response.fieldErrors,
    })
  }
})

if (!result.ok && 'submitError' in result)
  result.submitError // keeps the API error type
```

`submitFail` copies optional field errors into reactive `form.errors`. Validation failures remain
the existing `{ ok: false, values, errors }` branch. Thrown or rejected handlers remain exceptions;
convert expected API failures explicitly.
Failed submit scrolls to the first field error by default. Set `scrollToError: false`
only when the screen provides its own error navigation.

Changing a field clears its stale core/server error. `dirty` and `changedPaths`
compare the live model with the current reset baseline. `load('edit', detail)`,
`load('detail', detail)`, `rebaseDefaults()`, and `reset()` update that baseline
predictably.

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
<el-form v-if="form.editable" v-bind="form.host">...</el-form>

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
import {
  createRuleBuilders,
  enUSRuleMessages,
  r,
} from '@vformjs/element-plus'

const en = createRuleBuilders(enUSRuleMessages)

rules: {
  name: [en.required(), en.min(2), en.max(32)],
  email: [en.required(), en.email()],
  age: [r.numberMin(0), r.numberMax(120)],
  phone: [r.phone()],
  site: [r.url()],
  code: [r.pattern(/^[A-Z]+$/, 'uppercase only')],
}
```

Helpers (async-validator style):
`required` · `email` · `url` · `min` · `max` · `len` · `range` ·
`number` · `integer` · `numberMin` · `numberMax` · `numberRange` ·
`pattern` · `phone` · `idCard` · `arrayRequired` · `equalTo` ·
`trimRequired` · `custom(validator)`.

String sugar also works with the default message set: `rules: { name: 'required' }`.

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

Declare row rules once with `*`; vformjs materializes the concrete host paths:

```ts
rules: {
  'contacts.*.name': [r.required()],
  'contacts.*.phone': [r.phone()],
},
whenRules: {
  'contacts.*.phone': (_values, { item }) =>
    (item as Contact).phoneRequired ? [r.required(), r.phone()] : [r.phone()],
}
```

```ts
const contacts = form.list<{ name: string, phone: string }>('contacts', {
  defaultItem: () => ({ name: '', phone: '' }),
})
```

```vue
<div v-for="row in contacts.fields" :key="row.key">
  <el-form-item :prop="`contacts.${row.index}.name`">
    <el-input v-model="form.model.contacts[row.index].name" />
  </el-form-item>
  <el-button @click="contacts.remove(row.index)">Remove</el-button>
</div>
<el-button @click="contacts.append()">Add</el-button>
```

API: `append` · `prepend` · `insert` · `remove` · `move` · `replace` · `update` · `clear` · `fields`.

## Composed forms

Keep independently hosted sections independent, then compose their lifecycle:

```ts
const group = useFormGroup({
  base: baseForm,
  details: detailsForm,
  fees: feesForm,
})

group.dirty
group.changedPaths
await group.validate()
await group.submit(async (values) => api.save(values))
group.reset()
```

Errors are grouped by section. The first invalid member owns scrolling. No
provide/inject registration or UI-specific parent wrapper is required.

## Zod

```ts
import { z } from 'zod'
import { useZodForm } from '@vformjs/element-plus/zod'

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

## Official UI adapters

Naive UI and Ant Design Vue use the same form lifecycle through official packages:

```ts
import { r, useNaiveForm } from '@vformjs/naive-ui'
// import { r, useAntdForm } from '@vformjs/ant-design-vue'

const form = useNaiveForm({
  defaults: { name: '' },
  rules: { name: [r.required()] },
  onSubmit: async values => api.save(values),
})
```

```vue
<n-form v-bind="form.host">
  <n-form-item v-bind="form.item('name')">
    <n-input v-model:value="form.model.name" />
  </n-form-item>
</n-form>
```

Use `name` on Ant Design Vue fields. Import schema-aware entries from
`@vformjs/naive-ui/zod` or `@vformjs/ant-design-vue/zod`.

For another host with form-level rules and a validation instance, use
`defineAdapter` from `@vformjs/vue`. The adapter should only bridge the host's
`validate`, `clear`, and `scroll` methods; form state remains in `useForm`.

Runnable host integrations: `playgrounds/vue3-naive-ui` and
`playgrounds/vue3-antd-vue` (`pnpm dev:naive` / `pnpm dev:antd`).

## Agent-friendly CLI

The unscoped `vformjs` CLI detects the installed UI host and Zod, then writes a
typed form module without generating a second UI abstraction:

```bash
pnpm dlx vformjs init
pnpm dlx vformjs add form profile
pnpm dlx vformjs audit forms --json
pnpm dlx vformjs doctor
pnpm dlx vformjs migrate vue2-to-vue3 --dry-run --json
pnpm dlx vformjs skill install --agent agents
```

```bash
# Explicit custom/company preset; vformjs does not detect private UI packages
pnpm dlx vformjs init \
  --host company \
  --adapter-package @company/forms \
  --form-factory useCompanyForm
```

`init` and `add` are idempotent. They refuse to overwrite edited output unless
`--force` is explicit. `--dry-run --json` produces a deterministic plan for a
coding agent or CI job.

`audit forms` inventories single/multi-host forms, conditional fields, dynamic
arrays, external models, custom hosts, and Options API surfaces. It reports
conservative `mechanical` / `manual` dispositions and never edits source files.
Custom presets are explicit import/factory contracts; private package detection
stays outside vformjs.

Generated modules expose a typed path helper and submit outcome contract, use
localized rule builders, and document the single `form.host` / `form.item(path)`
binding. Zod templates import only the adapter package's `/zod` subpath.

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
