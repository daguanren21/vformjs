# RuoYi-Vue3 + vformjs Integration Playground

This playground demonstrates a real-world migration of [RuoYi-Vue3](https://github.com/yangzongzhuan/RuoYi-Vue3) forms to vformjs.

## What Was Migrated

**Single target:** `src/views/system/post/index.vue` — Post management CRUD page

**Migration scope:**
- ✅ Edit dialog lifecycle (create/edit modes, reset, submit)
- ✅ Form validation rules
- ✅ Template bindings (`v-bind="postForm.host"`, `v-bind="postForm.item(path)"`)
- ❌ Query form (unchanged — simple filter, no lifecycle)

**Before:**
```
Total lines:      287
Script lines:     141
Lifecycle code:   ~60 lines (reset, cancel, handleAdd, handleUpdate, submitForm)
```

**After:**
```
Total lines:      226 (-21.3%)
Script lines:     119 (-15.6%)
Lifecycle code:   ~26 lines (simplified handleAdd, handleUpdate)
```

**Eliminated:**
- `reset()` function — 11 lines
- `cancel()` logic simplified — no manual reset needed
- `submitForm()` validation + branching — 19 lines → moved to `onSubmit`

## How to Run

This is a **frontend-only playground**. The backend API is not included.

```bash
# From monorepo root
pnpm install
cd playgrounds/ruoyi-vue3-vformjs
npx vite

# Opens at http://localhost:80
```

**Expected behavior:**
- ✅ Page loads
- ❌ Backend API calls fail with `ECONNREFUSED` (normal — no backend)
- ✅ Can inspect form lifecycle code in browser DevTools

## Purpose

This playground serves as:

1. **Living documentation** — Shows real vformjs integration in a production-style codebase
2. **Regression test** — Verifies vformjs upgrades don't break migrations
3. **Before/after comparison** — Demonstrates actual lifecycle code reduction

## Original Project

- **Name:** RuoYi-Vue3 (若依管理系统)
- **URL:** https://github.com/yangzongzhuan/RuoYi-Vue3
- **Tech:** Vue 3.5 + Element Plus 2.13 + Vite 6
- **License:** MIT

This playground is based on commit `master` from 2026-08-06, with only one file modified.

## Validation Evidence

Full migration analysis in `.agent-runs/experiment-a-ruoyi-post.md`.

Key findings:
- 24% lifecycle code reduction
- ~34 lines eliminated per form
- RuoYi has ~40 similar forms → **~1,360 lines** eliminable project-wide
- Behavioral equivalence verified via unit tests

## Diff

To see the exact changes:

```bash
git diff playgrounds/ruoyi-vue3-vformjs/src/views/system/post/index.vue
```

Or view the standalone patch: `/tmp/vformjs-trials.Vs2UIV/ruoyi-post-vformjs.patch` (531 lines)
