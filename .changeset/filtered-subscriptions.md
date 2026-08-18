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

Replace callback-only subscriptions with typed subscription options and expose `subscribe()` on every Vue application facade.

Subscriptions can filter by `events`, concrete or wildcard `paths`, and optional exact matching. Path-only subscriptions receive value/meta events; global lifecycle events are delivered when explicitly selected.
