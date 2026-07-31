# API

Types and methods you touch after install. Prefer the UI entry (`useElForm`) unless you build a custom adapter.

## Imports

```ts
// Element Plus (Vue 3)
import {
  useElForm,
  useZodForm,
  r,
  fieldPath,
  createElementPlusAdapter,
  type UseElFormOptions,
  type UseFormReturn,
  type FormMode,
} from '@vformjs/element-plus'
// Zod-only subpath:
import { useZodForm } from '@vformjs/element-plus/zod'

// element-ui (Vue 2.7) — same surface from '@vformjs/element-ui'

// Headless / custom UI
import {
  useForm,
  defineAdapter,
  adapterOk,
  adapterFail,
  normalizeHostErrors,
  r,
  createForm,
  type UseFormOptions,
  type UseFormReturn,
  type FormMode,
} from '@vformjs/vue'

// Zod bridge without Element adapter
import { useZodForm, zodToRules } from '@vformjs/zod'
```

---

## `useElForm(options)`

Element entry. Sets adapter for you. `defaults` is required (infers `T`).

```ts
type UseElFormOptions<T> = Omit<UseFormOptions<T>, 'defaultValues' | 'adapter'> & {
  defaults: T | (() => T)
}

function useElForm<T extends Record<string, unknown>>(
  options: UseElFormOptions<T>,
): UseFormReturn<T>
```

Same return shape as `useForm` below.

---

## `useForm(options)`

```ts
type FormMode = 'create' | 'edit' | 'detail'

type UseFormOptions<T> = CreateFormOptions<T> & {
  mode?: FormMode   // default 'create'
}

function useForm<T>(options: UseFormOptions<T>): UseFormReturn<T>
```

### Options (`CreateFormOptions`)

| Option | Type | Default | Notes |
|--------|------|---------|--------|
| `defaultValues` / `defaults` | `T \| () => T` | **required** | `useElForm` uses `defaults` |
| `rules` | `FormRulesInput \| (values) => FormRulesInput` | — | async-validator style |
| `when` | `Record<path, (values) => boolean>` | — | show/hide; hidden drops rules |
| `whenRules` | `Record<path, (values) => RuleInput>` | — | conditional rules; `null` clears |
| `linkage` | `LinkageRule[]` | — | side effects on deps change |
| `adapter` | `FormHostAdapter` | — | host validate bridge |
| `mode` | `FormMode` | `'create'` | initial mode |
| `throwOnInvalid` | `boolean` | `false` | throw instead of `{ ok: false }` |
| `hiddenValues` | `'keep' \| 'omit'` | `'keep'` | snapshot of hidden fields |
| `trimOnSuccess` | `boolean` | `false` | trim top-level strings on ok |
| `onSubmit` | `(values, ctx) => void \| Promise` | — | default submit handler |
| `onInvalid` | `(errors, ctx) => void` | — | after failed validate/submit |
| `createState` | `(initial) => T` | Vue `reactive` in `useForm` | advanced |

### Return (`UseFormReturn`)

#### State

| Member | Type | Description |
|--------|------|-------------|
| `model` | `T` | Live reactive model (same identity) |
| `rules` | `FormRulesMap` | Current normalized rules |
| `el` | `{ ref, model, rules }` | Bind with `v-bind="form.el"` |
| `formProps` | `{ model, rules }` | Without ref binder |
| `formRef` | `unknown` | Host instance if bound |
| `submitting` | `boolean` | True during `submit` |
| `mode` | `FormMode` | create / edit / detail |
| `editable` | `boolean` | create \| edit |
| `readonly` | `boolean` | detail |
| `raw` | `FormApi<T>` | Underlying headless API |

#### Modes

| Method | Signature | Description |
|--------|-----------|-------------|
| `load` | `(mode, values?: Partial<T>) => void` | Switch mode; edit/detail fill model & rebase defaults |
| `setMode` | `(mode) => void` | Mode only, no value fill |

#### Values

| Method | Signature | Description |
|--------|-----------|-------------|
| `getValues` | `(opts?: { hidden?: 'keep'\|'omit' }) => T` | Deep snapshot |
| `setValues` | `(partial, opts?: { merge?: boolean }) => void` | Patch model |
| `setFieldValue` | `(path, value) => void` | Path write + notify |
| `getFieldValue` | `(path) => V \| undefined` | Path read |
| `reset` | `(paths?) => void` | Restore to current defaults |
| `rebaseDefaults` | `(values?: T) => void` | Next reset baseline (edit load uses this) |
| `notifyChange` | `(paths?) => void` | After direct v-model mutation for linkage |

#### Validate / submit

| Method | Signature | Description |
|--------|-----------|-------------|
| `validate` | `(paths?) => Promise<FormResult<T>>` | Full or partial |
| `validateField` | `(paths?) => Promise<FormResult<T>>` | Alias of partial validate |
| `submit` | `(handler?) => Promise<FormResult<T>>` | Validate → handler/`onSubmit` |
| `clearValidate` | `(paths?) => void` | Host + internal errors |

```ts
type FormResult<T> =
  | { ok: true, values: T }
  | { ok: false, values: T, errors: FormErrors }

type FormErrors = Record<string, string[]>
```

#### Meta / arrays

| Method | Signature | Description |
|--------|-----------|-------------|
| `getMeta` | `(path) => FieldMeta` | `{ hidden, disabled, options?, extra? }` |
| `hidden` | `(path) => ComputedRef<boolean>` | Vue computed for `v-if` |
| `list` | `(path, opts?) => FieldArrayApi & { fields: ComputedRef }` | Reactive field array |
| `fieldArray` | same without computed unwrap | From `raw` / core |
| `bindHost` | `(instance?) => void` | Hand host form instance to adapter |

---

## `FieldArrayApi`

```ts
interface FieldArrayApi<TItem> {
  fields: ReadonlyArray<{ key: string, index: number }>
  append: (item?: Partial<TItem> | TItem) => void
  prepend: (item?: Partial<TItem> | TItem) => void
  insert: (index: number, item?: Partial<TItem> | TItem) => void
  remove: (index: number | number[]) => void
  move: (from: number, to: number) => void
  replace: (index: number, item: TItem) => void
  update: (index: number, partial: Partial<TItem>) => void
  clear: () => void
}
```

`form.list` exposes `fields` as `ComputedRef` for templates.

Options: `{ defaultItem?: () => TItem, keyName?: string }`.

---

## `r` / `ruleBuilders`

```ts
r.required(message?, trigger?)
r.email(message?, trigger?)
r.url(message?, trigger?)
r.min(n, message?, trigger?)
r.max(n, message?, trigger?)
r.len(n, message?, trigger?)
r.range(min, max, message?, trigger?)
r.number(message?, trigger?)
r.integer(message?, trigger?)
r.numberMin(n, message?, trigger?)
r.numberMax(n, message?, trigger?)
r.numberRange(min, max, message?, trigger?)
r.pattern(regex, message?, trigger?)
r.mobile(message?, trigger?)
r.idCard(message?, trigger?)
r.requiredTrue(message?, trigger?)
r.custom(validator, message?, trigger?)
```

Default trigger is usually `'blur'` (numbers often `'change'`).  
Messages default to Chinese; pass your own string for i18n.

`RuleInput` accepts `RuleItem | RuleItem[] | string | string[] | null`.

---

## Linkage

```ts
interface LinkageRule<T> {
  deps: FieldPath[] | '*'
  when?: 'deps' | 'any' | 'init'
  run: (ctx: LinkageCtx<T>) => void | Promise<void>
}

interface LinkageCtx<T> {
  get: (path) => unknown
  values: Readonly<T>
  set: (path, value) => void
  patch: (partial) => void
  setHidden: (path, hidden) => void
  setDisabled: (path, disabled) => void
  setFieldRules: (path, rules) => void
  setOptions: (path, options) => void
  clearValidate: (paths?) => void
  getMeta: (path) => FieldMeta
}
```

---

## `defineAdapter`

```ts
defineAdapter<THost>({
  name?: string
  validate(host, ctx: { paths?: FieldPath[] }): void | HostValidateResult | Promise<...>
  clearValidate?(host, paths?)
  scrollToField?(host, path)
  afterModelReset?(host)
  mapErrors?(err): FormErrors   // default: normalizeHostErrors
  unboundMessage?: string
})
```

Returns a **factory**: `createXxxAdapter()` → new `FormHostAdapter` per form.

- Host throws → mapped via `mapErrors`
- Or return `adapterOk()` / `adapterFail({ field: ['msg'] })`

```ts
interface FormHostAdapter {
  bind?: (instance: unknown) => void
  validate: (paths?: FieldPath[]) => Promise<HostValidateResult>
  clearValidate?: (paths?: FieldPath[]) => void
  scrollToField?: (path: FieldPath) => void
  afterModelReset?: () => void
}
```

---

## `useZodForm(options)`

```ts
interface UseZodFormOptions<S extends ZodType> {
  schema: S
  defaults: z.input<S> | (() => z.input<S>)
  deep?: boolean      // dotted nested paths; auto when nested objects
  arrays?: boolean    // list.i.field rules; default true
  // + UseFormOptions except rules / defaultValues
}

// Success path uses z.output; failure keeps live input model
validate(): Promise<FormResult<ZodOutput> | FormResult<ZodInput>>
submit(handler?): Promise<FormResult<ZodOutput> | FormResult<ZodInput>>
```

Element packages omit `adapter` for you.

Low-level: `zodToRules`, `zodToRulesDeep`, `zodIssuesToFormErrors`, `createSharedZodParser`.

---

## Paths

Dotted strings: `'profile.email'`, `'contacts.0.phone'`.

```ts
import { fieldPath } from '@vformjs/element-plus'
fieldPath('contacts', index, 'phone') // 'contacts.3.phone'
```

---

## `createForm` (core)

Headless, no Vue. Same options/API as `FormApi` under `form.raw`.  
Vue apps should use `useForm` / `useElForm` so model is `reactive` and modes work.

---

## Types cheat sheet

```ts
type FieldPath = string
type FormErrors = Record<string, string[]>
type FormRulesMap = Record<string, RuleItem[]>
type FormResult<T> = { ok: true, values: T } | { ok: false, values: T, errors: FormErrors }
type FormMode = 'create' | 'edit' | 'detail'
```

Usage walkthrough → [guide.md](./guide.md).
