<script setup lang="ts">
import { r, submitFail, useElForm } from '@vformjs/element-plus'
import { shallowRef } from 'vue'
import AtomicAttributeSection from './atomic-editor/AtomicAttributeSection.vue'
import AtomicSingleSection from './atomic-editor/AtomicSingleSection.vue'
import AtomicSummarySection from './atomic-editor/AtomicSummarySection.vue'
import AtomicVariantSection from './atomic-editor/AtomicVariantSection.vue'
import type {
  EditorValues,
  SaveError,
  VariantRow,
} from './atomic-editor/types'

const output = shallowRef('等待操作')
const drafting = shallowRef(false)

function toPayload(values: EditorValues) {
  const entries = values.summary.mode === 'single'
    ? [{
        code: values.single.code,
        color: '',
        notes: values.summary.notes,
      }]
    : values.variants.map(variant => ({ ...variant }))
  return {
    header: {
      code: values.summary.code,
      mode: values.summary.mode,
      notes: values.summary.notes,
    },
    fields: { ...values.attributes },
    entries,
  }
}

const form = useElForm<EditorValues, SaveError>({
  defaults: {
    summary: {
      code: '',
      notes: '',
      mode: 'matrix',
    },
    attributes: {
      category: 'standard',
    },
    single: {
      code: '',
    },
    variants: [{
      code: '',
      color: '',
      notes: '',
    }],
  },
  rules: {
    'summary.code': r.required('编码必填'),
    'single.code': ({ values }) =>
      values.summary.mode === 'single' ? r.required('条目编码必填') : null,
    'variants.*.code': ({ values }) =>
      values.summary.mode === 'matrix' ? r.required('变体编码必填') : null,
    'variants.*.color': ({ values }) =>
      values.summary.mode === 'matrix' && values.variants.some(row => row.color)
        ? r.required('填写颜色后每一行都必填')
        : null,
  },
  linkage: [{
    deps: ['summary.notes'],
    run: ({ get, set, values }) => {
      const notes = String(get('summary.notes') ?? '')
      values.variants.forEach((row, index) => {
        if (row.notes !== notes)
          set(`variants.${index}.notes`, notes)
      })
    },
  }],
  onSubmit: async (values) => {
    if (values.summary.mode === 'matrix') {
      const seen = new Set<string>()
      const errors: Record<string, string[]> = {}
      values.variants.forEach((row, index) => {
        if (seen.has(row.code))
          errors[`variants.${index}.code`] = ['编码不能重复']
        seen.add(row.code)
      })
      if (Object.keys(errors).length) {
        return submitFail<SaveError>(
          { kind: 'DuplicateCode' },
          { errors },
        )
      }
    }
    output.value = `正式提交\n${JSON.stringify(toPayload(values), null, 2)}`
  },
})

const variants = form.list<VariantRow>('variants', {
  defaultItem: () => ({
    code: '',
    color: '',
    notes: form.model.summary.notes,
  }),
  rules: {
    type: 'array',
    min: 1,
    message: '请至少添加一个变体',
  },
  focus: 'code',
})

async function submit() {
  const result = await form.submit()
  if (!result.ok)
    output.value = `正式提交失败\n${JSON.stringify(result, null, 2)}`
}

async function saveDraft() {
  drafting.value = true
  try {
    form.clearValidate()
    const paths = form.model.summary.mode === 'single'
      ? ['summary.code', 'single.code']
      : ['summary.code', 'variants.*.code']
    const result = await form.validateField(paths)
    output.value = result.ok
      ? `草稿\n${JSON.stringify(toPayload(form.get()), null, 2)}`
      : `草稿校验失败\n${JSON.stringify(result.errors, null, 2)}`
  }
  finally {
    drafting.value = false
  }
}
</script>

<template>
  <div class="atomic-editor">
    <div class="demo-intro">
      <strong>原子编辑页</strong>
      <span>一个 form 负责区块、联动、动态行、草稿和提交。</span>
    </div>

    <el-form v-bind="form.host" label-width="110px">
      <AtomicSummarySection :form="form" />
      <AtomicAttributeSection :form="form" />
      <AtomicSingleSection
        v-if="form.model.summary.mode === 'single'"
        :form="form"
      />
      <AtomicVariantSection
        v-else
        :form="form"
        :variants="variants"
      />

      <div class="editor-actions">
        <el-button
          type="primary"
          :loading="form.submitting"
          :disabled="drafting"
          @click="submit"
        >
          正式提交
        </el-button>
        <el-button
          :loading="drafting"
          :disabled="form.submitting"
          @click="saveDraft"
        >
          保存草稿
        </el-button>
        <el-button @click="form.load('create'); output = '已重置'">
          新建重置
        </el-button>
      </div>
    </el-form>

    <div class="runtime-state">
      <span>validating: {{ form.validating }}</span>
      <span>submitting: {{ form.submitting }}</span>
      <span>submitCount: {{ form.submitCount }}</span>
      <span>submitOk: {{ form.submitOk }}</span>
      <span>dirty: {{ form.dirty }}</span>
    </div>
    <pre class="output">{{ output }}</pre>
  </div>
</template>

<style scoped>
.atomic-editor {
  max-width: 880px;
}

.demo-intro,
.runtime-state,
.editor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.demo-intro {
  margin-bottom: 16px;
}

.atomic-editor :deep(.editor-section) {
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.atomic-editor :deep(.editor-section h3) {
  margin: 0 0 16px;
}

.atomic-editor :deep(.section-title),
.atomic-editor :deep(.variant-row) {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.atomic-editor :deep(.section-title) {
  justify-content: space-between;
}

.atomic-editor :deep(.variant-row) {
  padding: 12px;
  margin-bottom: 12px;
  background: #f5f7fa;
  border-radius: 6px;
}

.atomic-editor :deep(.variant-row .el-form-item) {
  flex: 1;
  margin-bottom: 0;
}

.runtime-state {
  margin-top: 16px;
  font-family: monospace;
}

.output {
  min-height: 100px;
  padding: 12px;
  margin-top: 12px;
  color: #e2e8f0;
  white-space: pre-wrap;
  background: #0f172a;
  border-radius: 8px;
}
</style>
