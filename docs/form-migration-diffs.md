---
title: Migrate existing forms
description: Keep the existing UI and business components while vformjs unifies CRUD, dynamic fields, drafts, and multi-section form lifecycles.
---

# Migrate existing forms

A CRUD dialog often starts with a `model` and a few `rules`. Add edit loading, reset, dependent options, dynamic rows, drafts, and several sections, and the page accumulates refs, watchers, loading flags, dirty checks, errors, and submit locks. Each page ends up maintaining a similar form state machine.

vformjs keeps the Form from Element Plus, element-ui, Naive UI, or Ant Design Vue and moves mode, baseline, validation, submission, and error state into one typed form instance. Existing templates and business components stay in place, and the same API continues to work as the page grows.

A dialog with create, edit, reset, and submit is enough to test the result: an edited record no longer leaks into the next create flow, submit state disappears from page code, and the host Form keeps its native validation feedback.

| Page shape | One form instance owns | Business code keeps |
|---|---|---|
| Regular CRUD | Defaults, mode, validation, reset, submit state | API and post-success page actions |
| Dynamic form | Active conditions and rules, stable row keys, error remap, option requests | Domain predicates and data endpoints |
| Large form | Explicit tracking, array operations, drafts, API field errors | Layout, calculations, uploads, payload transforms |
| Multi-section form | Aggregate validation, mode, errors, submit, reset | Section boundaries and final payload |

## 1. Regular CRUD: one form owns create, edit, and reset

### Five pieces of state scattered across the page

Pages commonly maintain the host ref, defaults, rules, reset order, and submit lock separately. After editing one record, its identifier and validation state can leak into the next create flow.

### One form owns the lifecycle

```vue
<script setup lang="ts">
import { reactive, shallowRef, useTemplateRef } from 'vue' // [!code --]
import { shallowRef } from 'vue' // [!code ++]
import type { FormInstance, FormRules } from 'element-plus' // [!code --]
import { r, useElForm } from '@vformjs/element-plus' // [!code ++]

interface ProfileForm {
  recordId: string | undefined
  name: string
  email: string
}

const visible = shallowRef(false)
const submitting = shallowRef(false) // [!code --]
const formRef = useTemplateRef<FormInstance>('form') // [!code --]
const model = reactive<ProfileForm>({ recordId: undefined, name: '', email: '' }) // [!code --]
const rules: FormRules<ProfileForm> = { // [!code --]
  name: [{ required: true, message: 'Name is required' }], // [!code --]
  email: [{ type: 'email', message: 'Enter a valid email' }], // [!code --]
} // [!code --]

const form = useElForm<ProfileForm>({ // [!code ++]
  defaults: { recordId: undefined, name: '', email: '' }, // [!code ++]
  rules: { // [!code ++]
    name: [r.required()], // [!code ++]
    email: [r.email()], // [!code ++]
  }, // [!code ++]
  async onSubmit(values) { // [!code ++]
    await recordApi.save(values) // [!code ++]
    visible.value = false // [!code ++]
  }, // [!code ++]
}) // [!code ++]

function openCreate() {
  Object.assign(model, { recordId: undefined, name: '', email: '' }) // [!code --]
  formRef.value?.clearValidate() // [!code --]
  form.load('create') // [!code ++]
  visible.value = true
}

function openEdit(detail: ProfileForm) {
  Object.assign(model, detail) // [!code --]
  formRef.value?.clearValidate() // [!code --]
  form.load('edit', detail) // [!code ++]
  visible.value = true
}

async function submit() {
  await formRef.value?.validate() // [!code --]
  submitting.value = true // [!code --]
  try { // [!code --]
    await recordApi.save(model) // [!code --]
    visible.value = false // [!code --]
  } // [!code --]
  finally { // [!code --]
    submitting.value = false // [!code --]
  } // [!code --]
  await form.submit() // [!code ++]
}
</script>

<template>
  <el-form ref="form" :model="model" :rules="rules"> <!-- [!code --] -->
  <el-form v-bind="form.host"> <!-- [!code ++] -->
    <el-form-item label="Name" prop="name">
      <el-input v-model="model.name" /> <!-- [!code --] -->
      <el-input v-model="form.model.name" /> <!-- [!code ++] -->
    </el-form-item>

    <el-button :loading="submitting" @click="submit">Save</el-button> <!-- [!code --] -->
    <el-button :loading="form.submitting" @click="submit">Save</el-button> <!-- [!code ++] -->
  </el-form>
</template>
```

### Page actions stay explicit

- Keep `recordId: undefined` in `defaults`; otherwise create mode can retain the previous edit identifier.
- Keep the host-native `prop` at level 1. Switch to `form.item(path)` only when core/API field errors must be rendered by that FormItem.
- The API call still exists. It moves into `onSubmit`, while success messages, dialog closing, and list refreshes stay explicit.
- Search-only forms have no mode or submit lifecycle. The host-native Form already covers the required state.


## 2. Dynamic forms: define conditions, rows, and remote options together
### Dependencies split across the page

Visibility often lives in the template, dependent requests and loading flags in watchers, and dynamic rows in another set of temporary keys, index rules, and error cleanup. The field dependency graph is scattered across the page.
### Adopt vformjs

```ts
import { r, useElForm } from '@vformjs/element-plus' // [!code ++]

interface ContactRow {
  name: string
  phone: string
  phoneRequired: boolean
}

const model = reactive({ category: '', region: '', contacts: [] as ContactRow[] }) // [!code --]
const regionOptions = shallowRef<Array<{ label: string, value: string }>>([]) // [!code --]
const regionLoading = shallowRef(false) // [!code --]

watch(() => model.category, async (category) => { // [!code --]
  model.region = '' // [!code --]
  regionLoading.value = true // [!code --]
  try { // [!code --]
    regionOptions.value = await catalogApi.regions(category) // [!code --]
  } // [!code --]
  finally { // [!code --]
    regionLoading.value = false // [!code --]
  } // [!code --]
}) // [!code --]

function appendContact() { // [!code --]
  model.contacts.push({ name: '', phone: '', phoneRequired: false }) // [!code --]
} // [!code --]
const form = useElForm({ // [!code ++]
  defaults: { category: '', region: '', contacts: [] as ContactRow[] }, // [!code ++]
  rules: { // [!code ++]
    'contacts.*.name': r.required(), // [!code ++]
    'contacts.*.phone': ({ item }) => // [!code ++]
      (item as ContactRow).phoneRequired ? r.required() : null, // [!code ++]
  }, // [!code ++]
  when: { // [!code ++]
    region: values => values.category === 'regional', // [!code ++]
  }, // [!code ++]
  options: { // [!code ++]
    region: { // [!code ++]
      deps: ['category'], // [!code ++]
      load: ({ get, signal }) => // [!code ++]
        catalogApi.regions(String(get('category')), { signal }), // [!code ++]
    }, // [!code ++]
  }, // [!code ++]
}) // [!code ++]

const contacts = form.list<ContactRow>('contacts', { // [!code ++]
  defaultItem: () => ({ name: '', phone: '', phoneRequired: false }), // [!code ++]
}) // [!code ++]
const hideRegion = form.hidden('region') // [!code ++]
const availableRegions = form.options('region') // [!code ++]
```

```vue
<template>
  <el-form v-bind="form.host">
    <el-form-item v-if="model.category === 'regional'" label="Region" prop="region"> <!-- [!code --] -->
    <el-form-item v-if="!hideRegion" label="Region" v-bind="form.item('region')"> <!-- [!code ++] -->
      <el-select v-model="model.region" :loading="regionLoading"> <!-- [!code --] -->
        <el-option v-for="option in regionOptions" :key="option.value" v-bind="option" /> <!-- [!code --] -->
      <el-select v-model="form.model.region" :loading="availableRegions.loading"> <!-- [!code ++] -->
        <el-option v-for="option in availableRegions.items" :key="option.value" v-bind="option" /> <!-- [!code ++] -->
      </el-select>
    </el-form-item>

    <div v-for="(row, index) in model.contacts" :key="index"> <!-- [!code --] -->
    <div v-for="row in contacts.fields" :key="row.key"> <!-- [!code ++] -->
      <el-form-item :prop="`contacts.${index}.name`"> <!-- [!code --] -->
      <el-form-item v-bind="form.item(`contacts.${row.index}.name`)"> <!-- [!code ++] -->
        <el-input v-model="form.model.contacts[row.index].name" />
      </el-form-item>
      <el-button @click="model.contacts.splice(index, 1)">Remove</el-button> <!-- [!code --] -->
      <el-button @click="contacts.remove(row.index)">Remove</el-button> <!-- [!code ++] -->
    </div>

    <el-button @click="appendContact">Add contact</el-button> <!-- [!code --] -->
    <el-button @click="contacts.append()">Add contact</el-button> <!-- [!code ++] -->
  </el-form>
</template>
```
### Requests, row keys, and rules each have an owner
- `options` resets the dependent value, aborts superseded requests, and keeps only the latest result. Business code still supplies the domain endpoint.
- Keys from `contacts.fields` never enter submitted values. Existing field errors follow the matching business row through move and remove operations.
- `when` controls visibility; conditional callbacks in `rules` control active validation. Hidden fields leave validation with their rules removed.

### Track fields explicitly


```ts
import type { FormInstance } from 'element-plus' // [!code --]
import { r, submitFail, useElForm } from '@vformjs/element-plus' // [!code ++]

interface LineRow {
  itemCode: string
  quantity: number
}

interface DocumentForm {
  documentId: string | undefined
  title: string
  notes: string
  lines: LineRow[]
  attachmentIds: string[]
}

function createDefaults(): DocumentForm {
  return { documentId: undefined, title: '', notes: '', lines: [], attachmentIds: [] }
}

const hostRef = useTemplateRef<FormInstance>('host') // [!code --]
const model = reactive(createDefaults()) // [!code --]
const baseline = shallowRef(structuredClone(model)) // [!code --]
const submitting = shallowRef(false) // [!code --]
const changedPaths = shallowRef<string[]>([]) // [!code --]
watch(model, () => { // [!code --]
  changedPaths.value = diffDocument(baseline.value, model) // [!code --]
}, { deep: true }) // [!code --]
const form = useElForm<DocumentForm>({ // [!code ++]
  defaults: createDefaults, // [!code ++]
  tracking: 'explicit', // [!code ++]
  rules: { // [!code ++]
    title: [r.required()], // [!code ++]
    'lines.*.itemCode': [r.required()], // [!code ++]
    'lines.*.quantity': [r.numberMin(1)], // [!code ++]
  }, // [!code ++]
  async onSubmit(values) { // [!code ++]
    const response = await documentApi.save(values) // [!code ++]
    if (!response.ok) { // [!code ++]
      return submitFail(response.error, { errors: response.fieldErrors }) // [!code ++]
    } // [!code ++]
  }, // [!code ++]
}) // [!code ++]

const title = form.field('title') // [!code ++]
const lines = form.list<LineRow>('lines', { // [!code ++]
  defaultItem: () => ({ itemCode: '', quantity: 1 }), // [!code ++]
}) // [!code ++]

async function submit() {
  await hostRef.value?.validate() // [!code --]
  submitting.value = true // [!code --]
  try { // [!code --]
    await documentApi.save(model) // [!code --]
  } // [!code --]
  catch (error) { // [!code --]
    projectServerErrors(error, hostRef.value) // [!code --]
  } // [!code --]
  finally { // [!code --]
    submitting.value = false // [!code --]
  } // [!code --]
  await form.submit() // [!code ++]
}

function saveDraft() {
  draftStore.save(structuredClone(model)) // [!code --]
  draftStore.save(form.snapshotDraft()) // [!code ++]
}

function restoreDraft(snapshot: unknown) {
  Object.assign(model, snapshot) // [!code --]
  form.restoreDraft(snapshot) // [!code ++]
}
```

```vue
<template>
  <el-form ref="host" :model="model"> <!-- [!code --] -->
  <el-form v-bind="form.host"> <!-- [!code ++] -->
    <el-input v-model="model.title" /> <!-- [!code --] -->
    <el-input v-model="title" /> <!-- [!code ++] -->

    <el-table :data="model.lines"> <!-- [!code --] -->
    <el-table :data="form.model.lines"> <!-- [!code ++] -->
      <!-- Domain columns, calculations, and upload controls stay unchanged. -->
    </el-table>

    <el-button @click="model.lines.push({ itemCode: '', quantity: 1 })">Add row</el-button> <!-- [!code --] -->
    <el-button @click="lines.append()">Add row</el-button> <!-- [!code ++] -->
  </el-form>
</template>
```
### Drafts, errors, and business logic each have an owner

- `tracking: 'explicit'` routes updates through `form.field(path)`, `form.set`, or field-array methods and avoids cloning and diffing the full model on every input.
- `form.snapshotDraft()` creates a versioned snapshot. `form.restoreDraft()` drops obsolete paths, fills new paths, and keeps the restored draft dirty instead of silently rebasing it.
- Upload transport, table columns, domain calculations, and payload transforms stay in business code.
## 4. Multi-section forms: compose forms and preserve section boundaries

### The parent orchestrates every section

A parent page calls several component refs, validates them concurrently, joins
models, propagates loading, and resets each host. Adding or removing one section
also changes the parent submit and reset flows.

### Adopt vformjs

```ts
import { useElForm, useFormGroup } from '@vformjs/element-plus' // [!code ++]
import { reactive, useTemplateRef } from 'vue' // [!code --]
import type { FormInstance } from 'element-plus' // [!code --]

const baseHost = useTemplateRef<FormInstance>('baseHost') // [!code --]
const linesHost = useTemplateRef<FormInstance>('linesHost') // [!code --]
const reviewHost = useTemplateRef<FormInstance>('reviewHost') // [!code --]
const baseModel = reactive({ title: '' }) // [!code --]
const baseForm = useElForm({ defaults: { title: '' } }) // [!code ++]
const linesForm = useElForm({ defaults: { lines: [] as LineRow[] } }) // [!code ++]
const reviewForm = useElForm({ defaults: { remark: '' } }) // [!code ++]
const group = useFormGroup({ // [!code ++]
  base: baseForm, // [!code ++]
  lines: linesForm, // [!code ++]
  review: reviewForm, // [!code ++]
}) // [!code ++]

async function submit() {
  const [baseValid, linesValid, reviewValid] = await Promise.all([ // [!code --]
    baseHost.value?.validate(), // [!code --]
    linesHost.value?.validate(), // [!code --]
    reviewHost.value?.validate(), // [!code --]
  ]) // [!code --]
  if (!baseValid || !linesValid || !reviewValid) // [!code --]
    return // [!code --]
  await documentApi.save({ base: baseModel, lines: linesModel, review: reviewModel }) // [!code --]
  await group.submit(values => documentApi.save(values)) // [!code ++]
}

function openEdit(detail: GroupedDocument) {
  Object.assign(baseModel, detail.base) // [!code --]
  Object.assign(linesModel, detail.lines) // [!code --]
  Object.assign(reviewModel, detail.review) // [!code --]
  group.load('edit', detail) // [!code ++]
}

function resetAll() {
  baseHost.value?.resetFields() // [!code --]
  linesHost.value?.resetFields() // [!code --]
  reviewHost.value?.resetFields() // [!code --]
  group.reset() // [!code ++]
}
```

```vue
<template>
  <BaseSection ref="baseHost" v-model="baseModel" /> <!-- [!code --] -->
  <LinesSection ref="linesHost" v-model="linesModel" /> <!-- [!code --] -->
  <ReviewSection ref="reviewHost" v-model="reviewModel" /> <!-- [!code --] -->
  <BaseSection :form="baseForm" /> <!-- [!code ++] -->
  <LinesSection :form="linesForm" /> <!-- [!code ++] -->
  <ReviewSection :form="reviewForm" /> <!-- [!code ++] -->

  <el-button :loading="group.submitting" @click="submit">Submit all</el-button>
</template>
```

### Each section remains independent

- Each member still binds its own UI Form and rules. `useFormGroup` does not create one giant host.

- `group.validate()` validates members concurrently, preserves errors in the owning section, and scrolls to the first invalid member.
- `group.load()` passes each value slice to the corresponding member. An omitted section returns to its factory defaults instead of retaining the previous record.
- If a child already owns its form, expose the minimal `FormGroupMember` surface. Do not let the parent mutate private child state.


## 5. Atomic editors: collapse coupled sections into one form

### Reconstructed public example

The example below is synthetic. Routes, identifiers, field labels, API names,
and payload shapes do not come from an application repository. It preserves
only the engineering shape: several visual sections submit atomically, repeated
rows have cross-row rules, and a small subset of fields is required for a
server-side draft.

Use this approach when the sections are not independent forms. If each section
has its own submit boundary, keep the separate hosts and use `useFormGroup` as
shown above.

### Section refs and row-local hosts duplicate the lifecycle

```ts
import { computed, reactive, ref, useTemplateRef, watch } from 'vue' // [!code --]
import { r, useElForm } from '@vformjs/element-plus' // [!code ++]

interface VariantRow {
  code: string
  color: string
  notes: string
  attributes: Record<string, unknown>
}

interface EditorValues {
  summary: {
    code: string
    notes: string
  }
  attributes: Record<string, unknown>
  variants: VariantRow[]
}

interface EditorPayload { // [!code ++]
  header: EditorValues['summary'] // [!code ++]
  fields: Record<string, unknown> // [!code ++]
  entries: VariantRow[] // [!code ++]
} // [!code ++]
 // [!code ++]
function toPayload(values: EditorValues): EditorPayload { // [!code ++]
  return { // [!code ++]
    header: { ...values.summary }, // [!code ++]
    fields: { ...values.attributes }, // [!code ++]
    entries: values.variants.map(row => ({ // [!code ++]
      code: row.code, // [!code ++]
      color: row.color, // [!code ++]
      notes: row.notes, // [!code ++]
      attributes: { ...row.attributes }, // [!code ++]
    })), // [!code ++]
  } // [!code ++]
} // [!code ++]

const summaryRef = useTemplateRef<SectionHandle>('summaryRef') // [!code --]
const attributesRef = useTemplateRef<SectionHandle>('attributesRef') // [!code --]
const variantsRef = useTemplateRef<SectionHandle>('variantsRef') // [!code --]
const submitting = ref(false) // [!code --]
const savingDraft = ref(false) // [!code --]

const summaryModel = reactive({ code: '', notes: '' }) // [!code --]
const variantRows = ref<VariantRow[]>([]) // [!code --]
const colorRules = computed(() => [{ // [!code --]
  required: variantRows.value.some(row => Boolean(row.color)), // [!code --]
  message: 'Required', // [!code --]
}]) // [!code --]
watch( // [!code --]
  () => summaryModel.notes, // [!code --]
  (notes) => { // [!code --]
    variantRows.value.forEach((row) => { // [!code --]
      row.notes = notes // [!code --]
    }) // [!code --]
  }, // [!code --]
) // [!code --]

const form = useElForm<EditorValues>({ // [!code ++]
  defaults: { // [!code ++]
    summary: { code: '', notes: '' }, // [!code ++]
    attributes: {}, // [!code ++]
    variants: [], // [!code ++]
  }, // [!code ++]
  tracking: 'explicit', // [!code ++]
  rules: { // [!code ++]
    'summary.code': r.required(), // [!code ++]
    'variants.*.code': r.required(), // [!code ++]
    'variants.*.color': ({ values }) => // [!code ++]
      values.variants.some(row => row.color) ? r.required() : null, // [!code ++]
  }, // [!code ++]
  linkage: [ // [!code ++]
    { // [!code ++]
      deps: ['summary.notes'], // [!code ++]
      run: ({ get, set, values }) => { // [!code ++]
        const notes = String(get('summary.notes') ?? '') // [!code ++]
        values.variants.forEach((_row, index) => { // [!code ++]
          set(`variants.${index}.notes`, notes) // [!code ++]
        }) // [!code ++]
      }, // [!code ++]
    }, // [!code ++]
  ], // [!code ++]
}) // [!code ++]

const variants = form.list<VariantRow>('variants', { // [!code ++]
  defaultItem: () => ({ // [!code ++]
    code: '', // [!code ++]
    color: '', // [!code ++]
    notes: form.model.summary.notes, // [!code ++]
    attributes: {}, // [!code ++]
  }), // [!code ++]
}) // [!code ++]

async function submit() {
  const results = await Promise.allSettled([ // [!code --]
    summaryRef.value?.validate(), // [!code --]
    attributesRef.value?.validate(), // [!code --]
    variantsRef.value?.validate(), // [!code --]
  ]) // [!code --]
  if (results.some(result => result.status === 'rejected')) // [!code --]
    return // [!code --]
 // [!code --]
  submitting.value = true // [!code --]
  try { // [!code --]
    await editorApi.save({ // [!code --]
      summary: summaryRef.value?.getValues(), // [!code --]
      attributes: attributesRef.value?.getValues(), // [!code --]
      variants: variantsRef.value?.getValues(), // [!code --]
    }) // [!code --]
  } // [!code --]
  finally { // [!code --]
    submitting.value = false // [!code --]
  } // [!code --]
  await form.submit(values => editorApi.save(toPayload(values))) // [!code ++]
}

async function saveDraft() {
  summaryRef.value?.clearValidate() // [!code --]
  attributesRef.value?.clearValidate() // [!code --]
  variantsRef.value?.clearValidate() // [!code --]
  await Promise.all([ // [!code --]
    summaryRef.value?.validateField('code'), // [!code --]
    variantsRef.value?.validateField('code'), // [!code --]
  ]) // [!code --]

  const result = await form.validateField([ // [!code ++]
    'summary.code', // [!code ++]
    'variants.*.code', // [!code ++]
  ]) // [!code ++]
  if (!result.ok) // [!code ++]
    return // [!code ++]

  savingDraft.value = true
  try {
    await editorApi.saveDraft(toPayload(form.get()))
  }
  finally {
    savingDraft.value = false
  }
}
```

```vue
<template>
  <SummarySection ref="summaryRef" /> <!-- [!code --] -->
  <AttributesSection ref="attributesRef" /> <!-- [!code --] -->
  <VariantsSection ref="variantsRef" /> <!-- [!code --] -->

  <el-form v-bind="form.host"> <!-- [!code ++] -->
    <SummarySection :form="form" /> <!-- [!code ++] -->
    <AttributesSection :form="form" /> <!-- [!code ++] -->
    <div v-for="row in variants.fields" :key="row.key"> <!-- [!code ++] -->
      <VariantSection :form="form" :index="row.index" /> <!-- [!code ++] -->
      <el-button @click="variants.remove(row.index)">Remove</el-button> <!-- [!code ++] -->
    </div> <!-- [!code ++] -->
  </el-form> <!-- [!code ++] -->

  <el-button :loading="submitting" @click="submit">Submit</el-button> <!-- [!code --] -->
  <el-button :loading="form.submitting" @click="submit">Submit</el-button> <!-- [!code ++] -->
  <el-button :loading="savingDraft" @click="saveDraft">Save draft</el-button>
</template>
```

### One owner, explicit boundaries

- One host owns validation order, errors, loading, and first-error scrolling.
- `form.list()` keeps row keys outside submitted values and remaps row errors
  after insertion, removal, and movement.
- Wildcard rules replace row-by-row validator registration. The conditional
  color rule activates for every row after any row supplies a color.
- `linkage` makes cross-section propagation explicit. Child sections render
  fields; they no longer expose lifecycle methods through component refs.
- `toPayload()` is the application-owned mapper defined above. Runtime field
  renderers, uploads, calculations, and transport-specific serialization do
  not move into vformjs.
- A server-side draft is still an API action. `snapshotDraft()` is a local,
  versioned snapshot and is not a replacement for that endpoint.

## 6. Let an AI Agent handle the “manual” cases

“Manual” in an audit report means a deterministic codemod cannot infer the
semantics safely. It does **not** mean a person must type every edit. An Agent
using the vformjs skill can read the complete component, callers, model/API
types, child contracts, and tests before making a semantic migration.

| Work | Agent role | Maintainer gate |
|---|---|---|
| Regular form | Complete the clean cutover and verification | Confirm post-success page actions |
| Dynamic form | Map `when`, wildcard rules, `list`, and `optionSources` | Decide hidden-value and dependent-value reset semantics |
| Complex form | Migrate lifecycle, tracking, drafts, and API errors | Confirm domain calculations, payload transforms, and performance target |
| Multi-form | Create one form per host and compose with `useFormGroup` | Confirm section ownership and atomic-submit boundary |
| Custom UI | Classify A/B/C/D and implement an A/B adapter or C bridge | Stop for D-class parallel form engines |

Install the repository-matched skill into the target project:

```bash
pnpm dlx vformjs skill install
# Claude-specific location:
pnpm dlx vformjs skill install --agent claude
```

Then give the Agent a bounded, evidence-driven task:

```text
Use the installed vformjs skill to migrate this form.

Read the complete component, every caller, child-form contract, model/API
types, and existing tests first. Report the A/B/C/D host class, the
regular/dynamic/complex/multi-form shape, and the observable behavior contract.

Resolve everything available in the repository. Ask only when hidden-value
policy, dependent-option reset, payload mapping, or section ownership has
multiple valid business meanings.

Make a clean cutover: migrate every caller and remove the old
model/rules/ref/reset/submit state machine. Run typecheck, the target build,
and the actual create/edit/reset/invalid-submit path. Public output must be
sanitized; keep the real business diff inside the authorized repository.
```

The Agent still needs review gates:

- No dual binding between the old model and `form.model`.
- No simultaneous old `validate()` and new `form.submit()`.
- Dynamic forms must exercise hide/show, row move/remove, and stale options.

- Multi-forms must exercise one invalid section, all-valid submit, and reset.
- A build pass is not behavioral proof; run the actual form surface.
- Public issues and docs use reconstructed examples, never application source.

The installed skill includes the full
`references/migration-workflow.md` decision and verification workflow.

## Which pages should migrate

Migrate when create, edit, reset, submit, and API-error state repeat across
pages. Keep host-native forms for search-only, read-only, or one/two-field UI.

| Existing page | Recommendation |
|---|---|
| One host, static rules, standard CRUD | Good first migration |
| Conditional fields, dynamic rows, remote options | Map dependencies, then configure `when`, conditional `rules`, `options`, and `form.list()` |
| Large table or deeply nested model | Set `tracking: 'explicit'` before wiring fields |
| Coupled sections submitted atomically | Prefer one host; keep sections presentational and use `form.list()` for repeated rows |
| Independently valid sections | One form per section, composed with `useFormGroup` |
| Search-only, read-only, or one/two fields | Keep the host-native form; the benefit is usually too small |

Continue with:

- [Guide](/guide)
- [API reference](/api)
- [Vue 2.7 to Vue 3 migration](/migration)
