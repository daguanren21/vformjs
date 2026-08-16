---
"@vformjs/core": minor
"@vformjs/vue": minor
"@vformjs/element-ui": minor
"@vformjs/element-plus": minor
"@vformjs/naive-ui": minor
"@vformjs/ant-design-vue": minor
---

Add `optionSources`: declarative remote field options.

A source declares `load` plus optional `deps`, `key`, `select`, `resetValue`,
and `lazy`. The form owns what every dialog used to hand-write per select:

- loads on create, reloads when `deps` change, and resets the dependent value to
  its factory default so cascades (`country → city → district`) stay consistent;
- shares one in-flight request and one payload across every source resolving to
  the same `key`, with `select` picking each field's slice — one endpoint
  returning many lists feeds many selects in one request;
- aborts superseded loads via `AbortSignal` and drops their late results;
- exposes `{ items, loading, error, loaded }` through `form.options(path)`
  (Vue `ComputedRef`) and `form.getOptionsState(path)` (core), mirroring resolved
  items into `getMeta(path).options`;
- refreshes after `setValues` / `reset` / `load('edit', record)` without clearing
  the incoming record.

`form.reloadOptions(paths?)` drops cached payloads and refetches. Wildcard
patterns (`rows.*.city`) expand per array row with distinct cache keys.
Synchronous, already-in-memory options keep using `setOptions` from `linkage`.
