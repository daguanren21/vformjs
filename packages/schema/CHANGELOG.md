# @vformjs/schema

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
  
  - `@vformjs/schema` exports `createSchemaResolver`, `schemaIssuesToFormErrors`, and `useSchemaForm`;
  - every official UI package exposes a `/schema` subpath with its host adapter already bound;
  - pathless and unsupported symbol-path issues fall back to `_form`, while partial validation keeps only overlapping field issues.
- 79cff44: Expose `validating` on core forms, every Vue application facade, schema-aware forms, and composed form groups.
  
  The flag stays true across superseded validation runs and returns to false only when the active resolver and host-validation pipeline settles.

### Patch Changes

- Updated dependencies [79cff44]
- Updated dependencies [79cff44]
- Updated dependencies [79cff44]
- Updated dependencies [79cff44]
- Updated dependencies [79cff44]
  - @vformjs/core@0.5.0
  - @vformjs/vue@0.5.0
