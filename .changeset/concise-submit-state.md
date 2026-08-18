---
"@vformjs/core": minor
"@vformjs/vue": minor
"@vformjs/zod": minor
"@vformjs/schema": minor
"@vformjs/element-ui": minor
"@vformjs/element-plus": minor
"@vformjs/naive-ui": minor
"@vformjs/ant-design-vue": minor
---

Expose concise submit lifecycle state through every form facade and composed form group:

- `submitCount` counts logical submit attempts, with joined duplicate calls counted once;
- `submitOk` reports whether the latest submit attempt completed successfully.

A new attempt clears `submitOk`. Full resets and record loads clear both values
without publishing stale model values.
