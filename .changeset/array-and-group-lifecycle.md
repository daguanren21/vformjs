---
"@vformjs/core": minor
"@vformjs/vue": minor
---

Dynamic arrays: keep per-row state with its row.

Structural mutations used to notify the whole array path, which cleared every
row's errors — removing row 2 wiped row 0's message, and `append` erased the red
text the user was fixing. Each mutation now reports a precise op and row-scoped
errors are remapped instead:

| Op | Effect on row errors |
|----|----------------------|
| `append` | untouched |
| `prepend` / `insert(i)` | rows at or after `i` shift up |
| `remove(i)` | row `i` dropped; later rows shift down |
| `move(from, to)` | remapped with the moved row |
| `replace(i)` | row `i` cleared only |
| `update(i, partial)` | only the assigned leaf paths cleared |
| `clear` | all row errors dropped; non-row errors kept |

`restoreInPlace` now restores arrays element-wise, reusing the element objects at
surviving positions. Generated row keys therefore stay stable across `reset()`
and `load('edit', record)` instead of re-keying the whole list, so `v-for` rows
are patched rather than torn down, and the live array keeps its identity. The
restore uses only `splice` / `push`, because Vue 2 cannot observe `arr.length = n`
or `arr[i] = v` — index assignment would leave a Vue 2.7 host rendering a stale
row count.

Composed forms: `useFormGroup` gains `mode` and `load`.

```ts
const detail = await api.get(id)
group.load('edit', { base: detail.base, fees: detail.fees })
```

One call switches every section's mode and hands each one its slice, so sections
can no longer disagree about the mode. Omitted sections fall back to their
factory defaults rather than the previous record, the loaded record becomes the
clean baseline (`group.dirty === false`), and members that expose no `load` are
skipped. `FormGroupMember` gains optional `load` / `mode`, so custom members stay
compatible.
