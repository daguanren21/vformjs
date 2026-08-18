---
"@vformjs/core": minor
"@vformjs/vue": minor
"@vformjs/element-ui": minor
"@vformjs/element-plus": minor
"@vformjs/naive-ui": minor
"@vformjs/ant-design-vue": minor
---

Allow `validate()` and `validateField()` to accept wildcard paths such as
`rows.*.code`. Patterns expand against the current model before resolver and
host validation, and an empty wildcard selection succeeds without invoking the
host. Selected-path success returns the input model; whole-form validation and
submit remain the transformed-output boundary.
