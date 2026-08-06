# vformjs

## 0.2.1

### Patch Changes

- d3f5c48: Parse Vue SFC templates when auditing forms so form-item tags, option loops, unrelated conditions, and unrelated props no longer inflate host or manual-review classifications.
- d3f5c48: Fix migrate precision: deduplicate sfc-parse-failed to one issue per malformed SFC (Vue compiler cascades duplicate errors), and skip minified vendor bundles so they never appear in the manual review queue.

## 0.2.0

### Minor Changes

- 86fae5f: Add the unscoped `vformjs` CLI with deterministic official-host detection, idempotent scaffolding, diagnostics, form audits, custom import/factory presets, dry-run output, Vue 2-to-3 migration, and coding-agent skill installation. Private UI packages remain explicit business-owned presets rather than built-in detection rules.
- 86fae5f: Add an AST-guided Vue 2.7 + element-ui to Vue 3 + Element Plus migration command with dry-run output, deterministic safe rewrites, idempotence, and evidence-backed manual review reports.
