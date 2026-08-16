---
"@vformjs/ant-design-vue": minor
"@vformjs/element-plus": minor
"@vformjs/element-ui": minor
"@vformjs/naive-ui": minor
"@vformjs/vue": minor
"@vformjs/zod": minor
"vformjs": patch
---

Replace tiered form factories and nested capability namespaces with one
application hook and one flat script API per UI package. `get` / `set`
overload whole-form and typed dotted-path operations; field arrays, remote
options, validation, server errors, drafts, and model tracking remain
available as direct methods.

Flatten application configuration: `when`, conditional entries in `rules`,
`linkage`, `options`, `hiddenValues`, `submitPolicy`, and `throwOnInvalid` now
sit beside `defaults` and `onSubmit`. Native Vue templates and UI components
remain unchanged. Zod and composed forms use the same contract.
