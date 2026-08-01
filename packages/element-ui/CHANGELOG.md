# @vformjs/element-ui

## 0.2.0

### Minor Changes

- 86fae5f: Add production-safe form state and validation contracts: active rules without a host now fail explicitly, server errors are reactive and scrollable, and `dirty`/`changedPaths` track the current reset baseline across core and Vue APIs.

### Patch Changes

- Updated dependencies [86fae5f]
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
