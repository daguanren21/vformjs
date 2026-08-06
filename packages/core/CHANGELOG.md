# @vformjs/core

## 0.3.0

### Minor Changes

- 00274b7: Add draft persistence contracts: `snapshotDraft()` captures a versioned, JSON-serializable snapshot, and `restoreDraft()` heals or rejects drafts against the current baseline shape with a structured `DraftRestoreResult` (`restored` / `healed` / `fresh` + `droppedPaths` / `filledPaths`) instead of throwing or silently corrupting state. Restore never rebases, so `dirty` / `changedPaths` keep reflecting the restored draft as unsaved input.

## 0.2.0

### Minor Changes

- 86fae5f: Unify production form contracts across core and Vue: external models, latest-wins cancellable validation, wildcard array rules, opaque value policies, joined submissions, exact-path bindings, and explicit `useFormGroup` composition now share the same reactive errors, dirty baselines, typed paths, host binding, reset, and validated-output pipeline.
- d2a536d: Add typed API submission outcomes across every form entry. `onSubmit` and inline submit handlers can return `submitFail(error, { errors })`; `form.submit()` preserves the inferred error as `submitError`, copies optional field errors into form state, and keeps the existing `FormResult` return type when no submit error is configured.

## 0.1.1

### Patch Changes

- aa89619: Point package exports to dist artifacts and ship package READMEs on npm.

## 0.1.0

### Minor Changes

- Initial public release of vformjs: form state, adapters for Element Plus / element-ui, Zod bridge, and defineAdapter.
