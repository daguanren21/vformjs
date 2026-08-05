# API

Types and methods you touch after install. Prefer the official UI entry (`useElForm`, `useNaiveForm`, or `useAntdForm`) unless you build a custom adapter.

## Imports

```ts
// Element Plus (Vue 3)
import {
  useElForm,
  r,
  fieldPath,
  createElementPlusAdapter,
  submitFail,
  type UseElFormOptions,
  type UseFormReturn,
  type FormMode,
  type FormErrors,
  type SubmitResult,
} from '@vformjs/element-plus'
// Zod-only subpath:
import { useZodForm } from '@vformjs/element-plus/zod'

// element-ui (Vue 2.7) — same surface from '@vformjs/element-ui'
// Naive UI (Vue 3): useNaiveForm from root; useZodForm from '@vformjs/naive-ui/zod'
// Ant Design Vue: useAntdForm from root; useZodForm from '@vformjs/ant-design-vue/zod'

// Headless / custom UI
import {
  useForm,
  defineAdapter,
  adapterOk,
  adapterFail,
  normalizeHostErrors,
  r,
  createForm,
  submitFail,
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

function useElForm<T extends object>(
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
| `model` | `T` | — | caller-owned mutable model; identity retained |
| `valuePolicy` | `FormValuePolicy` | opaque objects use identity | custom clone/equality for File, URL, value objects |
| `rules` | `FormRulesInput \| (values) => FormRulesInput` | — | async-validator style |
| `when` | `Record<path, (values) => boolean>` | — | show/hide; hidden drops rules |
| `whenRules` | `Record<path, (values) => RuleInput>` | — | conditional rules; `null` clears |
| `linkage` | `LinkageRule[]` | — | side effects on deps change |
| `adapter` | `FormHostAdapter` | — | host validate bridge |
| `resolver` | `FormResolver<T, TOutput>` | — | primary validation and output transform; runs before host projection |
| `mode` | `FormMode` | `'create'` | initial mode |
| `modelTracking` | `'deep' \| 'explicit'` | `'deep'` | explicit mode tracks form methods and `field(path)` without full-model scans |
| `throwOnInvalid` | `boolean` | `false` | throw instead of `{ ok: false }` |
| `scrollToError` | `boolean` | `true` | submit scrolls to its first field error |
| `hiddenValues` | `'keep' \| 'omit'` | `'keep'` | snapshot of hidden fields |
| `trimOnSuccess` | `boolean` | `false` | trim top-level strings on ok |
| `submitPolicy` | `'join' \| 'parallel'` | `'join'` | duplicate submit joins the active promise unless parallel is explicit |
| `onSubmit` | `(values, ctx) => SubmitHandlerResult<E>` | — | typed API outcome; `void` means success |
| `onInvalid` | `(errors, ctx) => void` | — | after failed validate/submit |
| `createState` | `(initial) => T` | Vue `reactive` in `useForm` | advanced |

### Return (`UseFormReturn`)

#### State

| Member | Type | Description |
|--------|------|-------------|
| `model` | `T` | Live reactive model (same identity) |
| `rules` | `FormRulesMap` | Current normalized rules |
| `host` | `{ ref, model, rules }` | Bind any supported host with `v-bind="form.host"` |
| `item(path)` | `FormItemBinding` | Host-specific `prop` / `path` / `name` and field error |
| `field(path)` | `WritableComputedRef<TypedFieldValue<T, Path>>` | Exact-path binding for large forms |
| `submitting` | `boolean` | True during `submit` |
| `errors` | `Readonly<FormErrors>` | Reactive core/server error snapshot |
| `dirty` | `boolean` | Whether values differ from the current reset baseline |
| `changedPaths` | `ReadonlyArray<FieldPath>` | Changed dotted leaf paths |
| `mode` | `FormMode` | create / edit / detail |
| `editable` | `boolean` | create \| edit |
| `readonly` | `boolean` | detail |
| `raw` | `FormApi<T, E>` | Underlying headless API |

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
| `field` | `(path) => WritableComputedRef` | Typed path read/write through `setFieldValue`; cached per path |
| `reset` | `(paths?) => void` | Restore to current defaults |
| `rebaseDefaults` | `(values?: T) => void` | Next reset baseline (edit load uses this) |
| `notifyChange` | `(paths?) => void` | After direct v-model mutation for linkage |

#### Validate / submit

| Method | Signature | Description |
|--------|-----------|-------------|
| `validate` | `(paths?) => Promise<FormValidationResult<T, TOutput> \| FormResult<T>>` | Resolver, then host interaction |
| `validateField` | `(paths?) => Promise<FormValidationResult<T, TOutput> \| FormResult<T>>` | Same pipeline scoped to paths |
| `submit` | `(handler?) => Promise<SubmitResult<TOutput, E, T>>` | Validate → transformed output → typed API outcome |
| `clearValidate` | `(paths?) => void` | Host + internal errors |

#### Drafts

| Method | Signature | Description |
|--------|-----------|-------------|
| `snapshotDraft` | `() => FormDraftSnapshot` | Versioned, JSON-serializable capture of current values |
| `restoreDraft` | `(snapshot: unknown) => DraftRestoreResult` | Heal-or-reject restore against the current baseline; never throws |

`restoreDraft` returns a structured outcome instead of failing silently or throwing:

- `'restored'` — draft matched the baseline shape exactly
- `'healed'` — draft applied after dropping unknown paths (`droppedPaths`) and filling missing ones from the baseline (`filledPaths`)
- `'fresh'` — draft rejected (`reason`: `empty` / `malformed` / `unsupported-version`); current values untouched

Restore does **not** rebase: a restored draft is unsaved input, so `dirty` / `changedPaths` reflect it and `reset()` still returns to the baseline. Errors are cleared on restore.

```ts
// persist
localStorage.setItem('draft', JSON.stringify(form.snapshotDraft()))

// restore
const result = form.restoreDraft(JSON.parse(localStorage.getItem('draft') ?? 'null'))
if (result.status === 'healed')
  console.info('draft adjusted to current schema', result.droppedPaths, result.filledPaths)
```

#### Errors

| Method | Signature | Description |
|--------|-----------|-------------|
| `setErrors` | `(errors: FormErrors) => void` | Replace errors, typically from an API response |
| `setFieldError` | `(path, messages) => void` | Set one field error |
| `clearErrors` | `(paths?) => void` | Clear core errors only |
| `scrollToFirstError` | `() => FieldPath \| undefined` | Ask the bound host to scroll to the first field error |

Changing a field clears stale core/server errors for that path. `clearValidate` clears both core errors and host validation UI.

```ts
type FormValidationResult<TInput, TOutput = TInput> =
  | { ok: true, values: TOutput }
  | { ok: false, values: TInput, errors: FormErrors }

type FormResult<T> =
  | { ok: true, values: T }
  | { ok: false, values: T, errors: FormErrors }

type FormErrors = Record<string, string[]>
```

A resolver is the validation source of truth and may transform successful values:

```ts
type FormResolver<TInput, TOutput = TInput> = (
  values: TInput,
  context: {
    paths?: readonly FieldPath[]
    signal: AbortSignal
    validationId: number
  },
) => FormValidationResult<TInput, TOutput> | Promise<...>
```

#### Typed API submission failures

Return `submitFail(error)` for an expected API failure. Its error type is inferred into
`SubmitResult<T, E>`. Optional field errors are copied into reactive `form.errors`.

```ts
type SaveUserError =
  | { kind: 'EmailTaken' }
  | { kind: 'ServiceUnavailable', retryable: true }

const form = useElForm({
  defaults: { email: '' },
  onSubmit: async (values) => {
    const response = await api.save(values)
    if (!response.ok) {
      return submitFail<SaveUserError>(response.error, {
        errors: response.fieldErrors,
      })
    }
  },
})

const result = await form.submit()
if (!result.ok && 'submitError' in result)
  result.submitError // SaveUserError
```

```ts
type SubmitOutcome<E> =
  | { ok: true }
  | { ok: false, error: E, errors?: FormErrors }

type SubmitResult<T, E = never> =
  | FormResult<T>
  | { ok: false, values: T, submitError: E, errors?: FormErrors }
```

`submit()` scrolls to the first field error by default. Set `scrollToError: false`
when a screen owns custom error navigation.

Returning `void` or `submitOk()` means API success. A thrown or rejected handler still rejects
`submit()`; convert expected failures to `submitFail` and leave unexpected defects as exceptions.
When no typed API failure is configured (`E = never`), `submit()` remains
`Promise<FormResult<T>>`.

Concurrent calls join the active submission promise by default, so the handler runs once.
Set `submitPolicy: 'parallel'` only when duplicate API writes are intentional.

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

Rules and conditional rules accept wildcard row paths:

```ts
rules: {
  'contacts.*.name': [r.required()],
},
whenRules: {
  'contacts.*.phone': (_values, { item, index, path }) =>
    (item as Contact).phoneRequired ? [r.required()] : null,
}
```

Wildcard rules are materialized to host paths such as `contacts.0.name` whenever
the array changes. Literal paths override wildcard rules.

---

## `useFormGroup(forms)`

Compose independently hosted forms without implicit registration:

```ts
const group = useFormGroup({
  base: baseForm,
  details: detailsForm,
})

group.dirty
group.changedPaths // ['base.name', 'details.items.0.amount']
await group.validate()
await group.submit(async ({ base, details }) => api.save({ ...base, details }))
group.reset()
```

Validation errors are keyed by member name. `submit` receives each member's
validated output, scrolls the first invalid member, and uses the same
`join` / `parallel` submit policy.

---

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
r.phone(message?, trigger?)
r.idCard(message?, trigger?)
r.arrayRequired(message?, trigger?)
r.equalTo(getOther, message?, trigger?)
r.trimRequired(message?, trigger?)
r.custom(validator, trigger?, message?)

Default trigger is usually `'blur'` (numbers often `'change'`).  
Messages default to Chinese; pass a string per rule or create a localized builder set.

Create an SSR-safe localized builder set once per app:

```ts
import {
  createRuleBuilders,
  enUSRuleMessages,
} from '@vformjs/element-plus'

const r = createRuleBuilders(enUSRuleMessages)
```

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
  itemProps?(path, error): FormItemBinding
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
  getItemProps?: (path: FieldPath, error?: string) => FormItemBinding
}
```

---

## `useZodForm(options)`

```ts
interface UseZodFormOptions<S extends ZodType, E = never> {
  schema: S
  defaults: z.input<S> | (() => z.input<S>)
  onSubmit?: (
    values: z.output<S>,
    ctx: { form: FormApi<z.input<S>, E> },
  ) => SubmitHandlerResult<E>
  deep?: boolean      // dotted nested paths; auto when nested objects
  arrays?: boolean    // list.i.field rules; default true
  // + UseFormOptions except rules / defaultValues / onSubmit
}

// Success path uses z.output; failure keeps live input model
validate(): Promise<FormResult<ZodOutput> | FormResult<ZodInput>>
submit<E2 = never>(
  handler?: (
    values: ZodOutput,
    ctx: { form: FormApi<ZodInput, E> },
  ) => SubmitHandlerResult<E2>,
): Promise<SubmitResult<ZodOutput, E | E2> | FormResult<ZodInput>>
```

Element packages omit `adapter` for you.

`useZodForm` installs `createZodResolver(schema)` into the core pipeline. Async
refinements are awaited. Official UI adapters only bind/project/scroll; import
their integration exclusively from the package's `/zod` subpath.

Low-level: `zodToRules`, `zodToRulesDeep`, `zodIssuesToFormErrors`, `createSharedZodParser`.

---

## Paths

Dotted strings: `'profile.email'`, `'contacts.0.phone'`.

```ts
import { createFieldPath, fieldPath } from '@vformjs/element-plus'

const path = createFieldPath<FormValues>()
path('profile.email') // checked by TypeScript
fieldPath('contacts', index, 'phone') // dynamic: 'contacts.3.phone'
```

---

## `createForm` (core)

Headless, no Vue. Same options/API as `FormApi` under `form.raw`.  
Vue apps should use `useForm` / `useElForm` so model is `reactive` and modes work.

`FormRulesMap` is a host-rule description, not a headless validator. If active `rules`
exist without an adapter, `validate()` / `submit()` return `{ ok: false }` with a
configuration error instead of silently succeeding. Use a UI adapter or `useZodForm`
for schema-only validation.

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
