# Vue 2.7 to Vue 3 migration

vformjs keeps the form lifecycle stable while the host UI moves from element-ui to Element Plus. The migration command changes only syntax with a deterministic one-to-one replacement. Anything that depends on application semantics remains in the report.

See how regular CRUD, dynamic fields, large models, and multi-section forms adopt vformjs in [Migrate existing forms](/form-migration-diffs).

## Paired reference

The repository runs the same task CRUD dialog on both stacks:

| Stack | Source | Run |
|---|---|---|
| Vue 2.7 + element-ui | [`playgrounds/vue2-element-ui/src/demos/DialogCrudDemo.vue`](https://github.com/daguanren21/vformjs/blob/main/playgrounds/vue2-element-ui/src/demos/DialogCrudDemo.vue) | `pnpm dev:vue2` |
| Vue 3 + Element Plus | [`playgrounds/vue3-element-plus/src/demos/DialogCrudDemo.vue`](https://github.com/daguanren21/vformjs/blob/main/playgrounds/vue3-element-plus/src/demos/DialogCrudDemo.vue) | `pnpm dev:vue3` |

Both versions own the same defaults and `Row` type, call `form.load('create' | 'edit' | 'detail')`, submit the same value shape, reset to the current baseline, and render detail mode as Descriptions.

## Stable vformjs contract

| Contract | During migration |
|---|---|
| `defaults` and inferred `form.model` | unchanged |
| `load`, `mode`, `editable`, `readonly` | unchanged |
| `reset`, `rebase`, `dirty`, `changedPaths` | unchanged |
| `submit`, `validateField`, API `errors` | unchanged |
| `when`, conditional `rules`, `linkage`, `form.list` | unchanged |
| Zod schema and parsed submit output | unchanged; switch the adapter import only |

## Run the codemod

```bash
# inspect every edit and manual issue without writing
pnpm dlx vformjs migrate vue2-to-vue3 --dry-run --json

# apply safe edits and persist the review queue
pnpm dlx vformjs migrate vue2-to-vue3 --report migration-report.json
```

A clean automatic pass returns exit code `0`. Exit code `2` means safe edits were produced but the report still contains manual review items. Parse/configuration failures return `1`.

## Safe automatic edits

- `@vformjs/element-ui` import source → `@vformjs/element-plus`
- `element-ui` import source and theme CSS → Element Plus equivalents
- `@vitejs/plugin-vue2` import/dependency → `@vitejs/plugin-vue`
- package dependencies for Vue 3, Element Plus, and `@vue/compiler-sfc`
- `<el-submenu>` → `<el-sub-menu>`
- Element dialog `:visible.sync="state"` → `v-model="state"`
- explicit Element input `:value` / `@input` pair → `:model-value` / `@update:model-value`

The command parses JavaScript/TypeScript imports and Vue templates before editing. A second run produces zero edits.

## Manual review queue

The report records a file, line, code, evidence, and concrete action for cases that are not mechanically safe:

- Vue bootstrap (`new Vue`, `Vue.use`) and plugin registration
- `.sync` on non-Element-dialog components
- `.native`, `$listeners`, legacy scoped slots, render functions
- prototype services such as `this.$message`
- `el-icon-*` classes and Element UI subpath imports
- project-specific loader, router, store, and build-chain differences

These are deliberately not guessed. Resolve them against the target component and application architecture, then rerun the command until the report contains no unexpected items.
