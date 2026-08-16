---
"@vformjs/core": patch
"@vformjs/vue": patch
"@vformjs/element-ui": patch
"@vformjs/element-plus": patch
---

Fix three defects found by running a dynamic table form on Vue 2.7 + element-ui.

**A pristine form showed every required error on mount.** `useForm` publishes
rules after the first render, and element's `<el-form>` watches `rules` and calls
`validate()` when `validateOnRuleChange` is on (its default). A brand-new form
lit up every required field before the user touched anything, while
`form.errors` was still empty.

`FormHostAdapter` gains optional `hostProps()`, merged into `form.host`. The
element-ui and element-plus adapters return `{ validateOnRuleChange: false }`, so
vformjs owns revalidation. Dynamic rules still re-bind their validate events, and
submit still validates everything.

**`optionSources` never loaded for array rows added after creation.** A source
declared as `rows.*.country` only covered the rows that existed when the form was
built; appending a row left its select with no options (an element select then
renders the raw value instead of the label). Freshly materialized paths now get
their first load even when nothing they depend on changed — `lazy` still opts out.

**A dep change in one row cleared its siblings.** The reset decision was made per
pattern, so editing `rows.0.country` cleared `rows.1.city` too. Reset is now
decided per materialized row against that row's own dep paths. A structural array
change still reloads options (indices shift) but no longer counts as an edit to
any row's dep, so appending or removing a row never clears sibling values.
Resetting a row beyond the factory defaults falls back to the first row's leaf
default instead of writing `undefined`.
