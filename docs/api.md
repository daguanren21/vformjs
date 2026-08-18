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
  type UseApplicationFormReturn,
  type FormMode,
  type FormErrors,
  type SubmitResult,
} from '@vformjs/element-plus'
// Zod-only subpath:
import { useZodForm } from '@vformjs/element-plus/zod'
// Any Standard Schema-compatible library:
import { useSchemaForm } from '@vformjs/element-plus/schema'

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
// Standard Schema bridge without a UI adapter
import { createSchemaResolver, useSchemaForm } from '@vformjs/schema'
```

`useForm` is the low-level custom-adapter hook. Its flat `UseFormReturn` is for
adapter and library authors; application code should use the official facade
below.

---

## One application facade

Each official UI package exposes one form hook. The hook name changes with the
host library; its options and return shape do not.

| UI host | Hook |
|---|---|
| Element Plus / element-ui | `useElForm` |
| Naive UI | `useNaiveForm` |
| Ant Design Vue | `useAntdForm` |
| Any official `/zod` entry | `useZodForm` |

`defaults` infers the model type. Zod additionally infers the parsed submit
output from `schema`.

```ts
function useElForm<T extends object>(
  options: UseElFormOptions<T>,
): UseApplicationFormReturn<T>
```

Lifecycle and advanced operations share one flat object. The template contract
does not change:

```ts
form.model
form.host
form.item('email')
form.load('edit', detail)
form.submit()
form.reset()

form.get()
form.get('profile.email')
form.set('profile.email', 'ada@example.com')
form.list('contacts')
form.validate()
form.snapshotDraft()
```

There is no `values`, `fields`, `validation`, `draft`, or `raw` namespace on
the application form.

### Options

| Option | Type | Default | Notes |
|---|---|---|---|
| `defaults` | `T \| () => T` | **required** | Initial values and reset baseline |
| `model` | `T` | — | Caller-owned reactive model; identity retained |
| `rules` | `ApplicationRules<T>` | — | Static inputs and field-local conditional callbacks in one map; a whole-form callback is also accepted |
| `when` | `Record<path, (values) => boolean>` | — | Field visibility; hidden fields leave active validation |
| `linkage` | `LinkageRule[]` | — | Dependency-driven side effects |
| `options` | `Record<path, OptionsSource<T>>` | — | Remote options with cache, abort, and dependency reload |
| `hiddenValues` | `'keep' \| 'omit'` | `'keep'` | Include or omit hidden fields from snapshots |
| `tracking` | `'deep' \| 'explicit'` | `'deep'` | Explicit mode avoids whole-model scans |
| `submitPolicy` | `'join' \| 'parallel'` | `'join'` | Duplicate submit behavior |
| `throwOnInvalid` | `boolean` | `false` | Throw instead of returning `{ ok: false }` |
| `mode` | `'create' \| 'edit' \| 'detail'` | `'create'` | Initial mode |
| `valuePolicy` | `FormValuePolicy` | built in | Clone/equality policy for opaque values |
| `resolver` | `FormResolver<T, TOutput>` | — | Validation and output transform; Zod supplies this |
| `scrollToError` | `boolean` | `true` | Submit scrolls to its first field error |
| `trimOnSuccess` | `boolean` | `false` | Trim top-level strings after successful validation |
| `onSubmit` | `(values, ctx) => SubmitHandlerResult<E>` | — | Typed API outcome; `void` means success |
| `onInvalid` | `(errors, ctx) => void` | — | Runs after failed validation or submit |

```ts
const form = useElForm({
  defaults: { country: '', city: '' },
  rules: {
    country: r.required(),
    city: ({ values }) => values.country ? r.required() : null,
  },
  when: {
    city: values => Boolean(values.country),
  },
  options: {
    city: {
      deps: ['country'],
      load: ({ get, signal }) => api.cities(get('country'), { signal }),
    },
  },
  submitPolicy: 'join',
})
```

A field-local rule callback receives one `RulePatternContext<T>` object:
`{ values, pattern, path, wildcards, index, item, value }`. Static rule inputs
may be a single rule; arrays are only needed for multiple rules.

### State and lifecycle

| Member | Description |
|---|---|
| `model` | Live reactive model |
| `host` | `{ ref, model, rules }` for `v-bind="form.host"` |
| `item(path)` | Host field binding plus projected field errors |
| `validating` | `true` while the active resolver or host validation is running |
| `submitting` | `true` while submit is running |
| `submitCount` | Logical submit attempts since the last full reset or load |
| `submitOk` | Whether the latest submit attempt completed successfully |
| `errors` | Reactive core and server errors |
| `dirty` | Whether values differ from the reset baseline |
| `changedPaths` | Changed dotted leaf paths |
| `mode` | `'create'`, `'edit'`, or `'detail'` |
| `editable` / `readonly` | Mode-derived booleans |
| `load(mode, values?)` | Switch mode; edit/detail values become the clean baseline |
| `submit(handler?)` | Validate, transform, then execute the submit handler |
| `reset(paths?)` | Restore all or selected paths to the baseline |
| `subscribe(options)` | Filter form events by type and value/meta path |

### Values and fields

| Method | Description |
|---|---|
| `field(path)` | Cached, typed writable computed for one path |
| `get()` | Deep value snapshot |
| `get({ hidden: 'omit' })` | Snapshot without hidden fields |
| `get(path)` | Type-safe dotted-path read |
| `set(partial, opts?)` | Patch or replace model values |
| `set(path, value)` | Type-safe dotted-path write and dependency notification |
| `rebase(values?)` | Replace the next-reset baseline |
| `notify(paths?)` | Notify linkage after direct model mutation |
| `hidden(path)` | `ComputedRef<boolean>` for conditional rendering |
| `options(path)` | Stable live `{ items, loading, error, loaded }` object; no `.value` |
| `reloadOptions(paths?)` | Drop matching option caches and refetch |
| `list(path, opts?)` | Reactive field array with stable row keys |

```ts
form.set('profile.email', 'ada@example.com')
const email = form.get('profile.email') // string
const members = form.list<Member>('members')
const cities = form.options('city')
cities.loading
```

### Subscriptions

```ts
const stop = form.subscribe({
  events: ['values', 'meta'],
  paths: ['profile', 'members.*.email'],
  callback(event) {
    console.log(event)
  },
})

stop()
```

`paths` accepts concrete prefixes and wildcard paths. Set `exact: true` to
disable parent/child prefix matching. With only `paths`, the subscription
receives value and meta events. Global lifecycle events such as `reset` or
`submit-end` are delivered only when explicitly selected through `events`.

### Validation and server errors

| Method | Description |
|---|---|
| `validate()` | Run whole-form resolver and host validation; success may return transformed output |
| `validate(paths)` | Validate selected concrete or wildcard paths and return the current input model |
| `validateField(paths)` | Selected-path alias; `rows.*.code` expands against current rows |
| `clearValidate(paths?)` | Clear host validation and internal errors |
| `setErrors(errors)` | Replace server/core errors |
| `setFieldError(path, messages)` | Set one field error |
| `clearErrors(paths?)` | Clear internal errors only |
| `scrollToFirstError()` | Ask the host to scroll to the first field error |

Changing a field clears stale core/server errors for that path.

Selected-path validation never claims that the entire model was transformed.
Use parameterless `validate()` or `submit()` when resolver output differs from
the input model.

```ts
type FormValidationResult<TInput, TOutput = TInput> =
  | { ok: true, values: TOutput }
  | { ok: false, values: TInput, errors: FormErrors }

type FormErrors = Record<string, string[]>
```

### Drafts

```ts
localStorage.setItem('draft', JSON.stringify(form.snapshotDraft()))

const result = form.restoreDraft(
  JSON.parse(localStorage.getItem('draft') ?? 'null'),
)
```

`restoreDraft` never throws. It returns:

- `'restored'` — the draft matches the baseline shape.
- `'healed'` — unknown paths were dropped and missing paths were filled from
  the baseline.
- `'fresh'` — the draft was empty, malformed, or from an unsupported version;
  current values remain unchanged.

Restore does not rebase. The restored draft remains unsaved input, so `dirty`
and `changedPaths` reflect it.

### Typed submission failures

Return `submitFail(error)` for an expected API failure. Optional field errors
are copied into `form.errors`.

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

Returning `void` or `submitOk()` means success. Expected failures should use
`submitFail`; thrown errors remain rejected promises. Concurrent submit calls
join the active promise by default. Set `submitPolicy: 'parallel'` only when
duplicate writes are intentional.

`submitCount` increments once per logical attempt, so joined duplicate calls
count once. `submitOk` resets to `false` when a new attempt starts and becomes
`true` only after validation and the submit handler succeed. A full reset or
`load()` clears both values.

### `OptionsSource`

```ts
interface OptionsSource<T extends object> {
  deps?: FieldPath[]                                   // reload triggers; also resets the field value
  key?: (values, context) => unknown                   // cache identity; null bypasses the cache
  load: (context) => unknown | Promise<unknown>        // context: { values, get, signal, path, wildcards }
  select?: (payload, context) => unknown               // per-field slice of a shared payload
  resetValue?: boolean                                 // default true when deps is set
  lazy?: boolean                                       // skip the create-time load
}

interface FieldOptionsState {
  items: unknown
  loading: boolean
  error: unknown
  loaded: boolean
}
```

Patterns may use `*` for array rows (`rows.*.city`); sibling rows get distinct
cache keys. A dep change resets the dependent value to its factory default,
which cascades to deeper dependents. `form.set` / `reset` /
`load('edit', …)` refresh options but never clear the incoming record.

---

## `FieldArrayApi`

```ts
interface FieldArrayApi<TItem> {
  fields: ReadonlyArray<{ key: string, index: number }>
  append: (item?, options?: { focus?: FieldPath | false }) => void
  prepend: (item?, options?: { focus?: FieldPath | false }) => void
  insert: (index, item?, options?: { focus?: FieldPath | false }) => void
  remove: (index: number | number[]) => void
  move: (from: number, to: number) => void
  replace: (index: number, item: TItem) => void
  update: (index: number, partial: Partial<TItem>) => void
  clear: () => void
}
```

`form.list` exposes `fields` as `ComputedRef` for templates.

Options: `{ defaultItem?, keyName?, rules?, focus? }`.


```ts
const contacts = form.list<Contact>('contacts', {
  defaultItem: () => ({ name: '', phone: '' }),
  rules: { type: 'array', min: 1, message: 'Add at least one contact' },
  focus: 'name',
})

contacts.append()
contacts.insert(0, undefined, { focus: 'phone' })
contacts.prepend(undefined, { focus: false })
```

`rules` are registered on the array root. Mount `form.item('contacts')` to show
their host feedback. `focus` is relative to the inserted row and runs after the
host mounts it.

Rules and conditional rules accept wildcard row paths:

```ts
const form = useElForm({
  defaults: { contacts: [] as Contact[] },
  rules: {
    'contacts.*.name': r.required(),
    'contacts.*.phone': ({ item }) =>
      (item as Contact).phoneRequired ? r.required() : null,
  },
})
```

Wildcard rules are materialized to host paths such as `contacts.0.name` whenever
the array changes. Literal paths override wildcard rules.

Row-scoped errors follow their row across structural changes:

| Op | Effect on row errors |
|----|----------------------|
| `append` | untouched |
| `prepend` / `insert(i)` | rows at or after `i` shift up |
| `remove(i)` | row `i` dropped; later rows shift down |
| `move(from, to)` | remapped with the moved row |
| `replace(i)` | row `i` cleared only |
| `update(i, partial)` | only the assigned leaf paths cleared |
| `clear` | all row errors dropped; non-row errors kept |

Generated row keys track the row object, so `move` carries the key, and
`reset()` / `load('edit', record)` keep keys for surviving positions instead of
re-keying the list. Pass `keyName` to key rows off a backend id instead.

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
group.submitCount
group.validating
group.submitOk
await group.validate()
await group.submit(async ({ base, details }) => api.save({ ...base, details }))
group.reset()
```

Validation errors are keyed by member name. `submit` receives each member's
validated output, scrolls the first invalid member, and uses the same
`join` / `parallel` submit policy. `submitCount` and `submitOk` follow the same
reset and load semantics as an individual form.

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

Headless, no Vue. `createForm` returns the full low-level `FormApi`. Vue apps
should use `useForm` / `useElForm` so model state is reactive and modes work.

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
