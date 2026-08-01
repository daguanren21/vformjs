<script setup lang="ts">
import { r, useElForm } from '@vformjs/element-plus'
import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus'
import { computed, ref } from 'vue'
import type { HomeLocale } from '../../content'
import LiveExampleFrame from './LiveExampleFrame.vue'

interface TaskRow {
  id: string
  title: string
  owner: string
  status: 'active' | 'done'
  remark: string
}

const props = defineProps<{
  locale: HomeLocale
}>()

const copy = computed(() => props.locale === 'zh'
  ? {
      title: '弹窗 CRUD：一个实例贯穿新建、编辑、详情',
      description: '列表页不持有表单。打开弹窗时调用 form.load()；新建和编辑继续使用 Element Plus Form，详情改用 Descriptions。',
      create: '新增任务',
      edit: '编辑',
      detail: '详情',
      close: '关闭',
      cancel: '取消',
      confirm: '保存',
      labels: { title: '标题', owner: '负责人', status: '状态', remark: '备注', actions: '操作' },
      statuses: { active: '进行中', done: '已完成' },
      requiredTitle: '请填写标题',
      requiredOwner: '请填写负责人',
      result: '最近保存',
    }
  : {
      title: 'Dialog CRUD: one instance across create, edit, and detail',
      description: 'The list owns no form. Opening the dialog calls form.load(); create and edit keep Element Plus Form while detail switches to Descriptions.',
      create: 'New task',
      edit: 'Edit',
      detail: 'Details',
      close: 'Close',
      cancel: 'Cancel',
      confirm: 'Save',
      labels: { title: 'Title', owner: 'Owner', status: 'Status', remark: 'Notes', actions: 'Actions' },
      statuses: { active: 'Active', done: 'Done' },
      requiredTitle: 'Enter a title',
      requiredOwner: 'Enter an owner',
      result: 'Last saved',
    })

const visible = ref(false)
const lastSaved = ref<TaskRow | null>(null)
const rows = ref<TaskRow[]>(props.locale === 'zh'
  ? [
      { id: '1', title: '发布客户门户', owner: '林然', status: 'active', remark: '周五前完成' },
      { id: '2', title: '复核权限矩阵', owner: '周远', status: 'done', remark: '已通过评审' },
    ]
  : [
      { id: '1', title: 'Ship customer portal', owner: 'Ada', status: 'active', remark: 'Due Friday' },
      { id: '2', title: 'Review access matrix', owner: 'Grace', status: 'done', remark: 'Approved' },
    ])

const form = useElForm({
  defaults: {
    id: undefined as string | undefined,
    title: '',
    owner: '',
    status: 'active' as TaskRow['status'],
    remark: '',
  },
  rules: {
    title: [r.required(copy.value.requiredTitle), r.min(2)],
    owner: [r.required(copy.value.requiredOwner)],
    status: [r.required()],
  },
  onSubmit: async (values) => {
    const saved: TaskRow = {
      id: values.id ?? String(Date.now()),
      title: values.title,
      owner: values.owner,
      status: values.status,
      remark: values.remark,
    }
    const index = rows.value.findIndex(row => row.id === saved.id)
    if (index === -1)
      rows.value.unshift(saved)
    else
      rows.value[index] = saved
    lastSaved.value = saved
    visible.value = false
  },
})

const dialogTitle = computed(() => {
  if (form.mode === 'create')
    return copy.value.create
  if (form.mode === 'edit')
    return copy.value.edit
  return copy.value.detail
})

function openCreate() {
  form.load('create')
  visible.value = true
}

function openEdit(row: TaskRow) {
  form.load('edit', row)
  visible.value = true
}

function openDetail(row: TaskRow) {
  form.load('detail', row)
  visible.value = true
}

async function submit() {
  const result = await form.submit()
  if (!result.ok)
    form.scrollToFirstError()
}
</script>

<template>
  <LiveExampleFrame
    anchor="dialog-crud"
    index="01"
    :title="copy.title"
    :description="copy.description"
    code="form.load('create' | 'edit' | 'detail', values?)"
  >
    <div class="crud-toolbar">
      <ElButton type="primary" @click="openCreate">
        {{ copy.create }}
      </ElButton>
      <span class="crud-state">
        {{ form.mode }} · dirty={{ form.dirty }} · changed={{ JSON.stringify(form.changedPaths) }}
      </span>
    </div>

    <div class="crud-table" tabindex="0" :aria-label="copy.title">
      <ElTable :data="rows" border>
        <ElTableColumn prop="title" :label="copy.labels.title" min-width="200" />
        <ElTableColumn prop="owner" :label="copy.labels.owner" width="130" />
        <ElTableColumn :label="copy.labels.status" width="110">
          <template #default="{ row }">
            {{ copy.statuses[row.status as TaskRow['status']] }}
          </template>
        </ElTableColumn>
        <ElTableColumn :label="copy.labels.actions" width="170" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openEdit(row)">
              {{ copy.edit }}
            </ElButton>
            <ElButton link @click="openDetail(row)">
              {{ copy.detail }}
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </div>

    <p class="crud-result" aria-live="polite">
      <strong>{{ copy.result }}:</strong>
      <code>{{ lastSaved ? JSON.stringify(lastSaved) : '—' }}</code>
    </p>

    <ElDialog
      v-model="visible"
      class="vf-example-dialog"
      :title="dialogTitle"
      width="min(560px, calc(100vw - 32px))"
      append-to-body
      destroy-on-close
    >
      <ElForm
        v-if="form.editable"
        v-bind="form.el"
        label-position="top"
        @submit.prevent
      >
        <ElFormItem :label="copy.labels.title" prop="title" :error="form.errors.title?.[0]">
          <ElInput v-model="form.model.title" name="title" autocomplete="off" />
        </ElFormItem>
        <ElFormItem :label="copy.labels.owner" prop="owner" :error="form.errors.owner?.[0]">
          <ElInput v-model="form.model.owner" name="owner" autocomplete="off" />
        </ElFormItem>
        <ElFormItem :label="copy.labels.status" prop="status" :error="form.errors.status?.[0]">
          <ElSelect v-model="form.model.status" style="width: 100%">
            <ElOption :label="copy.statuses.active" value="active" />
            <ElOption :label="copy.statuses.done" value="done" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem :label="copy.labels.remark" prop="remark">
          <ElInput v-model="form.model.remark" name="remark" type="textarea" :rows="3" />
        </ElFormItem>
      </ElForm>

      <ElDescriptions v-else :column="1" border>
        <ElDescriptionsItem :label="copy.labels.title">
          {{ form.model.title }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="copy.labels.owner">
          {{ form.model.owner }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="copy.labels.status">
          {{ copy.statuses[form.model.status] }}
        </ElDescriptionsItem>
        <ElDescriptionsItem :label="copy.labels.remark">
          {{ form.model.remark || '—' }}
        </ElDescriptionsItem>
      </ElDescriptions>

      <template #footer>
        <ElButton @click="visible = false">
          {{ form.readonly ? copy.close : copy.cancel }}
        </ElButton>
        <ElButton
          v-if="form.editable"
          type="primary"
          :loading="form.submitting"
          @click="submit"
        >
          {{ copy.confirm }}
        </ElButton>
      </template>
    </ElDialog>
  </LiveExampleFrame>
</template>

<style scoped>
.crud-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.crud-state {
  color: var(--ph-ink-faint);
  font: 600 0.72rem/1.5 var(--ph-font-mono);
}

.crud-table {
  max-width: 100%;
  overflow-x: auto;
}

.crud-result {
  display: flex;
  gap: 8px;
  margin: 18px 0 0;
  color: var(--ph-ink-soft);
  font-size: 0.82rem;
  overflow-wrap: anywhere;
}

.crud-result strong {
  flex: 0 0 auto;
}

.crud-result code {
  color: var(--ph-accent);
}
</style>
