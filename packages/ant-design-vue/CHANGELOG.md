# @vformjs/ant-design-vue

## 0.5.0

### Minor Changes

- 79cff44: Add array-root rules and post-insert focus to `form.list()` / `form.fieldArray()`.
  
  - `rules` register host validation on the array root path;
  - `focus` names the default child path focused after append, prepend, or insert;
  - each insertion can override the child path or pass `{ focus: false }`;
  - official adapters bridge focus to their registered field instances without adding row keys to submitted values.
- 79cff44: Expose concise submit lifecycle state through every form facade and composed form group:
  
  - `submitCount` counts logical submit attempts, with joined duplicate calls counted once;
  - `submitOk` reports whether the latest submit attempt completed successfully.
  
  A new attempt clears `submitOk`. Full resets and record loads clear both values
  without publishing stale model values.
- 79cff44: Replace callback-only subscriptions with typed subscription options and expose `subscribe()` on every Vue application facade.
  
  Subscriptions can filter by `events`, concrete or wildcard `paths`, and optional exact matching. Path-only subscriptions receive value/meta events; global lifecycle events are delivered when explicitly selected.
- 79cff44: Add Standard Schema support for object schemas with inferred input and transformed output types.
  
  - the official `/schema` subpath bundles the private Standard Schema bridge;
  - compatible object schemas infer input and transformed output types;
  - pathless and unsupported symbol-path issues fall back to `_form`, while partial validation keeps only overlapping field issues.
- 79cff44: Expose `validating` on core forms, every Vue application facade, schema-aware forms, and composed form groups.
  
  The flag stays true across superseded validation runs and returns to false only when the active resolver and host-validation pipeline settles.
- 79cff44: Allow `validate()` and `validateField()` to accept wildcard paths such as
  `rows.*.code`. Patterns expand against the current model before resolver and
  host validation, and an empty wildcard selection succeeds without invoking the
  host. Selected-path success returns the input model; whole-form validation and
  submit remain the transformed-output boundary.

### Patch Changes

- Updated dependencies [79cff44]
- Updated dependencies [79cff44]
- Updated dependencies [79cff44]
- Updated dependencies [79cff44]
- Updated dependencies [79cff44]
- Updated dependencies [79cff44]
  - @vformjs/core@0.5.0
  - @vformjs/vue@0.5.0
  - @vformjs/zod@0.5.0

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

- Updated dependencies [e233a28]
- Updated dependencies [e233a28]
- Updated dependencies [e233a28]
- Updated dependencies [e233a28]
  - @vformjs/vue@0.4.0
  - @vformjs/zod@0.4.0
  - @vformjs/core@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [00274b7]
  - @vformjs/core@0.3.0
  - @vformjs/vue@0.3.0
  - @vformjs/zod@0.3.0

## 0.2.0

### Minor Changes

- 86fae5f: Add official Naive UI and Ant Design Vue adapters with typed `useXxxForm` entry points, explicit Zod subpaths, host-specific `form.item(path)` bindings, partial validation, reset, clear, and error scrolling contracts.
- 86fae5f: Unify production form contracts across core and Vue: external models, latest-wins cancellable validation, wildcard array rules, opaque value policies, joined submissions, exact-path bindings, and explicit `useFormGroup` composition now share the same reactive errors, dirty baselines, typed paths, host binding, reset, and validated-output pipeline.
- d2a536d: Add typed API submission outcomes across every form entry. `onSubmit` and inline submit handlers can return `submitFail(error, { errors })`; `form.submit()` preserves the inferred error as `submitError`, copies optional field errors into form state, and keeps the existing `FormResult` return type when no submit error is configured.

### Patch Changes

- Updated dependencies [86fae5f]
- Updated dependencies [d2a536d]
  - @vformjs/core@0.2.0
  - @vformjs/vue@0.2.0
  - @vformjs/zod@0.2.0
