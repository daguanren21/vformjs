import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { auditForms } from '../src/audit'

const temporaryRoots: string[] = []

function createProject(files: Record<string, string>): string {
  const root = mkdtempSync(resolve(tmpdir(), 'vformjs-audit-'))
  temporaryRoots.push(root)
  for (const [file, source] of Object.entries(files)) {
    const path = resolve(root, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, source)
  }
  return root
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0))
    rmSync(root, { force: true, recursive: true })
})

describe('auditForms template classification', () => {
  it('does not count form items or option loops as forms or dynamic arrays', () => {
    const root = createProject({
      'src/PostForm.vue': `
<script setup lang="ts">
const form = { status: '' }
const options = [{ value: '0', label: 'Enabled' }]
</script>
<template>
  <el-form v-show="showSearch" :model="form">
    <el-form-item label="Status" prop="status">
      <el-radio v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </el-radio>
    </el-form-item>
  </el-form>
</template>
`,
    })

    const report = auditForms(root)
    expect(report.formsFound).toBe(1)
    expect(report.forms[0]).toMatchObject({
      hosts: ['el-form'],
      labels: ['single-host'],
      migration: 'mechanical',
    })
  })

  it('scopes conditional arrays and external models to the form subtree', () => {
    const root = createProject({
      'src/ContactsForm.vue': `
<script setup lang="ts">
const props = defineProps<{ form: { contacts: Array<{ name: string }> } }>()
</script>
<template>
  <el-form :model="props.form">
    <section v-if="props.form.contacts.length">
      <div v-for="(contact, index) in props.form.contacts" :key="index">
        <el-form-item :prop="\`contacts.\${index}.name\`">
          <el-input v-model="contact.name" />
        </el-form-item>
      </div>
    </section>
  </el-form>
</template>
`,
    })

    const report = auditForms(root)
    expect(report.forms[0]).toMatchObject({
      hosts: ['el-form'],
      labels: [
        'conditional',
        'dynamic-array',
        'external-model',
        'single-host',
      ],
      migration: 'manual',
    })
  })

  it('counts exact form roots without inflating on their form items', () => {
    const root = createProject({
      'src/Page.vue': `
<template>
  <el-form :model="query">
    <el-form-item prop="name"><el-input v-model="query.name" /></el-form-item>
  </el-form>
  <el-form :model="editor">
    <el-form-item prop="name"><el-input v-model="editor.name" /></el-form-item>
  </el-form>
</template>
`,
    })

    const report = auditForms(root)
    expect(report.forms[0]).toMatchObject({
      hosts: ['el-form'],
      labels: ['multi-host'],
      migration: 'manual',
    })
  })

  it('keeps custom-host and Options API evidence with scoped template labels', () => {
    const root = createProject({
      'src/ComplexForm.vue': `
<script>
export default {
  props: { modelValue: Object },
  data() { return { rows: [] } },
  methods: { validate() { return this.$refs.form.validate() } },
}
</script>
<template>
  <CustomForm ref="form" :model="modelValue">
    <section v-if="modelValue.visible">
      <div v-for="(row, index) in rows" :key="index">
        <CustomFormItem :prop="\`rows.\${index}.name\`" />
      </div>
    </section>
  </CustomForm>
</template>
`,
    })

    const report = auditForms(root)
    expect(report.forms[0]).toMatchObject({
      hosts: ['CustomForm'],
      labels: [
        'conditional',
        'custom-host',
        'dynamic-array',
        'external-model',
        'options-api',
        'single-host',
      ],
      migration: 'manual',
    })
  })

  it('ignores same-named local helpers but keeps imported vformjs factories', () => {
    const root = createProject({
      'src/local.ts': 'export function useNaiveForm() { return {} }\n',
      'src/vform.ts': `
import { useForm } from '@vformjs/vue'
export const form = useForm({ defaultValues: { name: '' } })
`,
    })

    const report = auditForms(root)
    expect(report.formsFound).toBe(1)
    expect(report.forms[0]).toMatchObject({
      file: 'src/vform.ts',
      hosts: [],
      labels: ['vformjs'],
      migration: 'mechanical',
    })
  })
})
