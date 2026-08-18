---
"@vformjs/schema": minor
"@vformjs/element-ui": minor
"@vformjs/element-plus": minor
"@vformjs/naive-ui": minor
"@vformjs/ant-design-vue": minor
---

Add Standard Schema support for object schemas with inferred input and transformed output types.

- `@vformjs/schema` exports `createSchemaResolver`, `schemaIssuesToFormErrors`, and `useSchemaForm`;
- every official UI package exposes a `/schema` subpath with its host adapter already bound;
- pathless and unsupported symbol-path issues fall back to `_form`, while partial validation keeps only overlapping field issues.
