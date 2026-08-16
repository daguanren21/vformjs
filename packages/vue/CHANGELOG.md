# @vformjs/vue

## 0.4.0

### Minor Changes

- e233a28: Replace tiered form factories and nested capability namespaces with one
  application hook and one flat script API per UI package. `get` / `set`
  overload whole-form and typed dotted-path operations; field arrays, remote
  options, validation, server errors, drafts, and model tracking remain
  available as direct methods.
  
  Flatten application configuration: `when`, conditional entries in `rules`,
  `linkage`, `options`, `hiddenValues`, `submitPolicy`, and `throwOnInvalid` now
  sit beside `defaults` and `onSubmit`. Native Vue templates and UI components
  remain unchanged. Zod and composed forms use the same contract.
- e233a28: Dynamic arrays: keep per-row state with its row.
  
  Structural mutations used to notify the whole array path, which cleared every
  row's errors — removing row 2 wiped row 0's message, and `append` erased the red
  text the user was fixing. Each mutation now reports a precise op and row-scoped
  errors are remapped instead:
  
  | Op | Effect on row errors |
  |----|----------------------|
  | `append` | untouched |
  | `prepend` / `insert(i)` | rows at or after `i` shift up |
  | `remove(i)` | row `i` dropped; later rows shift down |
  | `move(from, to)` | remapped with the moved row |
  | `replace(i)` | row `i` cleared only |
  | `update(i, partial)` | only the assigned leaf paths cleared |
  | `clear` | all row errors dropped; non-row errors kept |
  
  `restoreInPlace` now restores arrays element-wise, reusing the element objects at
  surviving positions. Generated row keys therefore stay stable across `reset()`
  and `load('edit', record)` instead of re-keying the whole list, so `v-for` rows
  are patched rather than torn down, and the live array keeps its identity. The
  restore uses only `splice` / `push`, because Vue 2 cannot observe `arr.length = n`
  or `arr[i] = v` — index assignment would leave a Vue 2.7 host rendering a stale
  row count.
  
  Composed forms: `useFormGroup` gains `mode` and `load`.
  
  ```ts
  const detail = await api.get(id)
  group.load('edit', { base: detail.base, fees: detail.fees })
  ```
  
  One call switches every section's mode and hands each one its slice, so sections
  can no longer disagree about the mode. Omitted sections fall back to their
  factory defaults rather than the previous record, the loaded record becomes the
  clean baseline (`group.dirty === false`), and members that expose no `load` are
  skipped. `FormGroupMember` gains optional `load` / `mode`, so custom members stay
  compatible.
- e233a28: Add `optionSources`: declarative remote field options.
  
  A source declares `load` plus optional `deps`, `key`, `select`, `resetValue`,
  and `lazy`. The form owns what every dialog used to hand-write per select:
  
  - loads on create, reloads when `deps` change, and resets the dependent value to
    its factory default so cascades (`country → city → district`) stay consistent;
  - shares one in-flight request and one payload across every source resolving to
    the same `key`, with `select` picking each field's slice — one endpoint
    returning many lists feeds many selects in one request;
  - aborts superseded loads via `AbortSignal` and drops their late results;
  - exposes `{ items, loading, error, loaded }` through `form.options(path)`
    (Vue `ComputedRef`) and `form.getOptionsState(path)` (core), mirroring resolved
    items into `getMeta(path).options`;
  - refreshes after `setValues` / `reset` / `load('edit', record)` without clearing
    the incoming record.
  
  `form.reloadOptions(paths?)` drops cached payloads and refetches. Wildcard
  patterns (`rows.*.city`) expand per array row with distinct cache keys.
  Synchronous, already-in-memory options keep using `setOptions` from `linkage`.

### Patch Changes

- e233a28: Fix three defects found by running a dynamic table form on Vue 2.7 + element-ui.
  
  **A pristine form showed every required error on mount.** `useForm` publishes
  rules after the first render, and element's `<el-form>` watches `rules` and calls
  `validate()` when `validateOnRuleChange` is on (its default). A brand-new form
  lit up every required field before the user touched anything, while
  `form.errors` was still empty.
  
  `FormHostAdapter` gains optional `hostProps()`, merged into `form.host`. The
  element-ui and element-plus adapters return `{ validateOnRuleChange: false }`, so
  vformjs owns revalidation. Dynamic rules still re-bind their validate events, and
  submit still validates everything.
  
  **`optionSources` never loaded for array rows added after creation.** A source
  declared as `rows.*.country` only covered the rows that existed when the form was
  built; appending a row left its select with no options (an element select then
  renders the raw value instead of the label). Freshly materialized paths now get
  their first load even when nothing they depend on changed — `lazy` still opts out.
  
  **A dep change in one row cleared its siblings.** The reset decision was made per
  pattern, so editing `rows.0.country` cleared `rows.1.city` too. Reset is now
  decided per materialized row against that row's own dep paths. A structural array
  change still reloads options (indices shift) but no longer counts as an edit to
  any row's dep, so appending or removing a row never clears sibling values.
  Resetting a row beyond the factory defaults falls back to the first row's leaf
  default instead of writing `undefined`.
- Updated dependencies [e233a28]
- Updated dependencies [e233a28]
- Updated dependencies [e233a28]
  - @vformjs/core@0.4.0

## 0.3.0

### Minor Changes

- 00274b7: Add draft persistence contracts: `snapshotDraft()` captures a versioned, JSON-serializable snapshot, and `restoreDraft()` heals or rejects drafts against the current baseline shape with a structured `DraftRestoreResult` (`restored` / `healed` / `fresh` + `droppedPaths` / `filledPaths`) instead of throwing or silently corrupting state. Restore never rebases, so `dirty` / `changedPaths` keep reflecting the restored draft as unsaved input.

### Patch Changes

- Updated dependencies [00274b7]
  - @vformjs/core@0.3.0

## 0.2.0

### Minor Changes

- 86fae5f: Unify production form contracts across core and Vue: external models, latest-wins cancellable validation, wildcard array rules, opaque value policies, joined submissions, exact-path bindings, and explicit `useFormGroup` composition now share the same reactive errors, dirty baselines, typed paths, host binding, reset, and validated-output pipeline.
- d2a536d: Add typed API submission outcomes across every form entry. `onSubmit` and inline submit handlers can return `submitFail(error, { errors })`; `form.submit()` preserves the inferred error as `submitError`, copies optional field errors into form state, and keeps the existing `FormResult` return type when no submit error is configured.

### Patch Changes

- Updated dependencies [86fae5f]
- Updated dependencies [d2a536d]
  - @vformjs/core@0.2.0

## 0.1.1

### Patch Changes

- aa89619: Point package exports to dist artifacts and ship package READMEs on npm.
- Updated dependencies [aa89619]
  - @vformjs/core@0.1.1

## 0.1.0

### Minor Changes

- Initial public release of vformjs: form state, adapters for Element Plus / element-ui, Zod bridge, and defineAdapter.

### Patch Changes

- Updated dependencies
  - @vformjs/core@0.1.0
