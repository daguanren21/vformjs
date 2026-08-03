---
"@vformjs/core": minor
"@vformjs/vue": minor
"@vformjs/zod": minor
"@vformjs/element-plus": minor
"@vformjs/element-ui": minor
"@vformjs/naive-ui": minor
"@vformjs/ant-design-vue": minor
---

Add typed API submission outcomes across every form entry. `onSubmit` and inline submit handlers can return `submitFail(error, { errors })`; `form.submit()` preserves the inferred error as `submitError`, copies optional field errors into form state, and keeps the existing `FormResult` return type when no submit error is configured.
