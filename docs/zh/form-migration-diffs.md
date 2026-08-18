---
title: 迁移现有表单
description: 保留现有 UI 和业务组件，用 vformjs 统一 CRUD、动态字段、草稿和多区块提交的表单生命周期。
---

# 迁移现有表单

一个 CRUD 弹窗通常从 `model` 和 `rules` 开始。加入编辑回填、重置、异步选项、动态行、草稿和多个 section 后，页面会逐步堆出 refs、watchers、loading、dirty、errors 和 submit locks。每个页面都在维护一套相似的表单状态机。

vformjs 继续使用 Element Plus、element-ui、Naive UI 或 Ant Design Vue 的 Form，把模式、基线、校验、提交和错误状态收进一个有类型的 form 实例。现有模板和业务组件可以保留；页面变复杂时，仍然沿用同一套 API。

一个同时包含新增、编辑、重置和提交的弹窗就能验证接入结果：编辑记录不会污染下一次新建，提交状态不用重复维护，宿主 Form 的校验反馈保持原样。

| 页面形态 | form 实例统一 | 业务代码保留 |
|---|---|---|
| 常规 CRUD | 默认值基线、模式、校验、重置、提交状态 | API 与成功后的页面动作 |
| 动态表单 | 生效中的条件和规则、稳定行 key、错误重排、选项请求 | 领域条件与数据接口 |
| 大型表单 | 显式追踪、数组操作、草稿、接口字段错误 | 布局、计算、上传和 payload 转换 |
| 多区块表单 | 聚合校验、模式、错误、提交和重置 | section 边界与最终 payload |

## 1. 常规 CRUD：一个实例管住新增、编辑和重置

### 五组状态散落在页面里

宿主 ref、默认值、规则、重置顺序和提交锁通常由页面分别维护。用户编辑一条记录后再次新建，旧标识和校验状态也容易跟着留下来。

### 一个 form 收拢生命周期

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
  name: [{ required: true, message: '请输入名称' }], // [!code --]
  email: [{ type: 'email', message: '邮箱格式不正确' }], // [!code --]
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
    <el-form-item label="名称" prop="name">
      <el-input v-model="model.name" /> <!-- [!code --] -->
      <el-input v-model="form.model.name" /> <!-- [!code ++] -->
    </el-form-item>

    <el-button :loading="submitting" @click="submit">保存</el-button> <!-- [!code --] -->
    <el-button :loading="form.submitting" @click="submit">保存</el-button> <!-- [!code ++] -->
  </el-form>
</template>
```

### 业务动作继续留在页面

- `defaults` 同时是新建和重置的基线。`recordId: undefined` 留在基线里，下一次新建才不会复用上一条记录的标识。
- API 调用进入 `onSubmit`；成功提示、关闭弹窗和刷新列表继续由页面明确处理。
- FormItem 可以继续使用宿主原生 `prop`。接口字段错误需要显示在对应控件下方时，再使用 `form.item(path)`。
- 纯查询表单没有模式切换和提交生命周期，宿主原生 Form 已经覆盖所需状态。

## 2. 动态表单：把条件、动态行和远程选项写进表单定义

### 字段依赖拆在模板和 watcher 里

字段显隐常写在模板里，级联请求和 loading 留在 watcher 里，动态行再维护一套临时 key、索引规则和错误清理。字段之间的依赖被拆到了页面各处。

### 让 form 管依赖关系

```ts
import { reactive, shallowRef, watch } from 'vue' // [!code --]
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
    <el-form-item v-if="model.category === 'regional'" label="区域" prop="region"> <!-- [!code --] -->
    <el-form-item v-if="!hideRegion" label="区域" v-bind="form.item('region')"> <!-- [!code ++] -->
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
      <el-button @click="model.contacts.splice(index, 1)">删除</el-button> <!-- [!code --] -->
      <el-button @click="contacts.remove(row.index)">删除</el-button> <!-- [!code ++] -->
    </div>

    <el-button @click="appendContact">新增联系人</el-button> <!-- [!code --] -->
    <el-button @click="contacts.append()">新增联系人</el-button> <!-- [!code ++] -->
  </el-form>
</template>
```

### 请求、行 key 和规则各有归属

- `options` 在依赖变化时重置字段、取消旧请求，并只保留最新结果。领域接口仍由业务代码提供。
- `contacts.fields` 的 key 不进入提交数据。移动或删除行时，已有字段错误会跟着对应的业务行移动。
- `when` 管字段是否显示，`rules` 中的条件回调管当前生效的规则；隐藏字段会退出本次校验。

## 3. 大型表单：控制追踪成本，统一草稿和接口错误

### 全模型追踪放大运行时成本

大型模型每次输入都做 deep watch、clone 和 diff，会把字段数量直接变成运行时成本。数组 key、提交锁、接口字段错误和草稿兼容代码也会在每个页面重复出现。

### 改用按字段追踪

```ts
import { computed, reactive, shallowRef, useTemplateRef, watch } from 'vue' // [!code --]
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
const dirty = computed(() => changedPaths.value.length > 0) // [!code --]

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
    <el-table :data="form.model.lines" row-key="itemCode"> <!-- [!code ++] -->
      <!-- 领域列、计算和上传组件保持原样 -->
    </el-table>

    <el-button @click="model.lines.push({ itemCode: '', quantity: 1 })">新增行</el-button> <!-- [!code --] -->
    <el-button @click="lines.append()">新增行</el-button> <!-- [!code ++] -->
  </el-form>
</template>
```

### 草稿、错误和业务逻辑各有归属

- `tracking: 'explicit'` 让字段更新经过 `form.field(path)`、`form.set` 或字段数组方法，避免每次输入都 clone 和 diff 整个模型。
- `form.snapshotDraft()` 生成版本化快照；`form.restoreDraft()` 会丢弃旧字段、补齐新字段，并把恢复后的草稿保留为未保存状态。
- 上传流程、表格列、领域计算和 payload 转换继续留在业务代码里。vformjs 统一表单生命周期和错误合同。

## 4. 多区块表单：组合 form，保留 section 边界

### 父页面承担所有编排

父页面通过多个组件 ref 并发校验，再拼接模型、传播 loading、逐个 reset。新增或移除一个 section，父页面里的提交和重置流程都要跟着修改。

### 组合 form，保留独立宿主

```ts
import { reactive, useTemplateRef } from 'vue' // [!code --]
import type { FormInstance } from 'element-plus' // [!code --]
import { useElForm, useFormGroup } from '@vformjs/element-plus' // [!code ++]

const baseHost = useTemplateRef<FormInstance>('baseHost') // [!code --]
const linesHost = useTemplateRef<FormInstance>('linesHost') // [!code --]
const reviewHost = useTemplateRef<FormInstance>('reviewHost') // [!code --]
const baseModel = reactive({ title: '' }) // [!code --]
const linesModel = reactive({ lines: [] as LineRow[] }) // [!code --]
const reviewModel = reactive({ remark: '' }) // [!code --]

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

  <el-button :loading="group.submitting" @click="submit">提交全部</el-button>
</template>
```

### 每个 section 继续独立

- 每个 section 继续绑定自己的 UI Form 和规则，`useFormGroup` 只组合生命周期，不创建巨型共享宿主。
- `group.validate()` 并发校验成员，错误留在对应 section，并滚动到第一个无效成员。
- `group.load()` 把数据切片交给对应成员。记录里缺少某个 section 时，该成员回到自己的 factory defaults。
- 子组件已经拥有 form 时，只向父页面暴露 `FormGroupMember` 需要的接口，内部响应式状态仍由子组件管理。


## 5. 原子编辑页：把强耦合区块收进一个 form

### 公开文档使用重构示例

下面的示例是重新构造的通用代码。路由、标识符、字段标签、API 名称和
payload 结构均不来自业务仓库；只保留工程形态：多个可视区块原子提交、
重复行存在跨行规则，并且服务端草稿只校验少数字段。

只有当这些区块共享提交边界和联动关系时，才使用一个 form。如果每个
section 都有独立提交边界，应继续保留独立宿主，并使用上一节的
`useFormGroup`。

### section ref 和行级宿主重复维护生命周期

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
      <el-button @click="variants.remove(row.index)">移除</el-button> <!-- [!code ++] -->
    </div> <!-- [!code ++] -->
  </el-form> <!-- [!code ++] -->

  <el-button :loading="submitting" @click="submit">提交</el-button> <!-- [!code --] -->
  <el-button :loading="form.submitting" @click="submit">提交</el-button> <!-- [!code ++] -->
  <el-button :loading="savingDraft" @click="saveDraft">保存草稿</el-button>
</template>
```

### 一个状态所有者，边界仍然明确

- 一个宿主统一负责校验顺序、错误、loading 和首个错误滚动。
- `form.list()` 把行 key 留在提交值之外，并在插入、删除和移动后重映射
  行错误。
- wildcard 规则替代逐行注册 validator。任意一行填写 `color` 后，条件规则
  会要求每一行都填写该字段。
- `linkage` 显式描述跨区块同步。子 section 只渲染字段，不再通过组件 ref
  暴露生命周期方法。
- `toPayload()` 是上面定义的应用层 mapper。运行时字段渲染、上传、计算和
  传输层序列化不会迁入 vformjs。
- 服务端草稿仍然是 API 动作；`snapshotDraft()` 是本地版本化快照，不能
  替代服务端保存。

## 6. 用 Agent 迁移存量页面

vformjs CLI 带有与当前版本匹配的迁移 skill。Agent 会读取完整组件、调用方、模型和 API 类型、子表单合同与测试，再把页面里重复的表单状态迁入 vformjs。

确定性 codemod 只能替换语义明确的语法。隐藏值是否清空、级联字段如何重置、payload 怎样转换、多个 section 是否原子提交，需要结合项目代码和产品规则判断。Agent 可以完成代码迁移和验证，维护者只确认这些业务选择。

| 页面形态 | Agent 完成 | 你需要确认 |
|---|---|---|
| 常规 CRUD | 迁移模式、基线、校验、提交和重置，删除旧状态 | 保存成功后的页面动作 |
| 动态表单 | 迁移条件规则、动态行和远程选项 | 隐藏值与级联值的重置规则 |
| 大型表单 | 迁移 tracking、草稿和接口字段错误 | 领域计算、payload 转换和性能目标 |
| 多区块表单 | 每个宿主保留一个 form，再组合提交 | section 归属与原子提交边界 |

安装与 CLI 同版本的 skill：

```bash
pnpm dlx vformjs skill install
# 安装到 Claude skill 目录
pnpm dlx vformjs skill install --agent claude
```

迁移任务可以直接写成：

```text
使用已安装的 vformjs skill 迁移当前表单。

读取完整组件、全部调用方、子表单合同、模型/API 类型和现有测试。
保留现有 UI、校验反馈、接口语义和成功后的页面动作。

把新增、编辑、重置、提交、动态字段和接口错误迁入一个明确的 form 实例，
迁移所有调用方，并删除旧 model/rules/ref/reset/submit 状态机。

仓库代码能确定的内容直接完成；隐藏值策略、级联重置、payload 映射或
section 归属存在多种合理业务语义时，再向维护者提问。

运行 typecheck 和目标 build，并实际验证新增、编辑、重置与无效提交。
```

### 验收迁移结果

- 页面只保留一个表单状态来源，旧 model 不再与 `form.model` 双绑。
- 提交只经过 `form.submit()`，旧 `validate()` 和提交锁已经删除。
- 动态表单覆盖显隐、行移动/删除和旧选项请求竞态。
- 多区块表单覆盖单个 section 失败、全部成功和整体重置。
- typecheck 和 build 通过后，还要运行实际表单路径。

skill 安装包内包含当前 CLI 版本的迁移决策和验证规则，工具升级后不会继续使用旧版迁移合同。

## 哪些页面值得迁移

新增、编辑、重置、提交和接口错误已经在多个页面重复时，迁入 vformjs 可以删除成套的页面状态。纯查询、纯详情或只有一两个字段的页面，宿主原生 Form 已经足够。

| 当前页面 | 建议 |
|---|---|
| 单宿主、静态规则、标准 CRUD | 从一个新增/编辑弹窗开始 |
| 条件字段、动态行、远程选项 | 列出字段依赖，再配置 `when`、条件 `rules`、`options` 和 `form.list()` |
| 大表格或深层嵌套模型 | 使用 `tracking: 'explicit'`，逐字段接入 |
| 多个强耦合 section 原子提交 | 优先使用一个宿主；section 只负责渲染，重复行使用 `form.list()` |
| 多个可独立校验的 section | 每个 section 一个 form，再用 `useFormGroup` 组合 |
| 纯查询、纯详情、只有一两个字段 | 保留宿主原生 Form |

继续阅读：

- [快速开始](/zh/guide)
- [API 速查](/zh/api)
- [Vue 2.7 到 Vue 3 迁移](/zh/migration)
