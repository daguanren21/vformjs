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

Add array-root rules and post-insert focus to `form.list()` / `form.fieldArray()`.

- `rules` register host validation on the array root path;
- `focus` names the default child path focused after append, prepend, or insert;
- each insertion can override the child path or pass `{ focus: false }`;
- official adapters bridge focus to their registered field instances without adding row keys to submitted values.
