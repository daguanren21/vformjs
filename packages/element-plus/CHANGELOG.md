# @vformjs/element-plus

## 0.3.0

### Patch Changes

- Updated dependencies [00274b7]
  - @vformjs/core@0.3.0
  - @vformjs/vue@0.3.0
  - @vformjs/zod@0.3.0

## 0.2.0

### Minor Changes

- 86fae5f: Unify production form contracts across core and Vue: external models, latest-wins cancellable validation, wildcard array rules, opaque value policies, joined submissions, exact-path bindings, and explicit `useFormGroup` composition now share the same reactive errors, dirty baselines, typed paths, host binding, reset, and validated-output pipeline.
- d2a536d: Add typed API submission outcomes across every form entry. `onSubmit` and inline submit handlers can return `submitFail(error, { errors })`; `form.submit()` preserves the inferred error as `submitError`, copies optional field errors into form state, and keeps the existing `FormResult` return type when no submit error is configured.

### Patch Changes

- Updated dependencies [86fae5f]
- Updated dependencies [d2a536d]
  - @vformjs/core@0.2.0
  - @vformjs/vue@0.2.0
  - @vformjs/zod@0.2.0

## 0.1.1

### Patch Changes

- aa89619: Point package exports to dist artifacts and ship package READMEs on npm.
- Updated dependencies [aa89619]
  - @vformjs/core@0.1.1
  - @vformjs/vue@0.1.1
  - @vformjs/zod@0.1.1

## 0.1.0

### Minor Changes

- Initial public release of vformjs: form state, adapters for Element Plus / element-ui, Zod bridge, and defineAdapter.

### Patch Changes

- Updated dependencies
  - @vformjs/core@0.1.0
  - @vformjs/vue@0.1.0
  - @vformjs/zod@0.1.0
