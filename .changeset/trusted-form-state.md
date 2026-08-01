---
"@vformjs/core": minor
"@vformjs/vue": minor
"@vformjs/zod": patch
"@vformjs/element-plus": minor
"@vformjs/element-ui": minor
---

Add production-safe form state and validation contracts: active rules without a host now fail explicitly, server errors are reactive and scrollable, and `dirty`/`changedPaths` track the current reset baseline across core and Vue APIs.
