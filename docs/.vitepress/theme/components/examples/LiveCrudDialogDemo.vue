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
      capability: '弹窗 CRUD',
      title: '弹窗 CRUD：一个实例贯穿新建、编辑、详情',
      goal: '列表页不持有表单。打开弹窗时调用 form.load()；新建和编辑继续使用 Element Plus Form，详情切换为只读 Descriptions。',
      steps: [
        '新增任务 → 空标题直接保存，查看宿主报错。',
        '编辑一行并修改任意字段 — dirty 与 changedPaths 随之更新。',
        '保存后在状态面板查看最近写入的记录。',
        '打开详情 → 表单切换为只读 Descriptions。',
      ],
      expect: '详情模式没有保存按钮，submit 会被拒绝。',
      apis: ['form.load(mode, values?)', 'form.editable', 'form.dirty', 'form.changedPaths'],
      stateLabel: '运行时状态',
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
      records: '条记录',
    }
  : {
      capability: 'Dialog CRUD',
      title: 'Dialog CRUD: one instance across create, edit, and detail',
      goal: 'The list owns no form. Opening the dialog calls form.load(); create and edit keep Element Plus Form while detail switches to read-only Descriptions.',
      steps: [
        'New task → save with an empty title and read the host errors.',
        'Edit a row, change any field — dirty and changedPaths update.',
        'Save and check the state panel for the last-saved record.',
        'Open Details → the form becomes read-only Descriptions.',
      ],
      expect: 'Detail mode offers no save action and its submit is rejected.',
      apis: ['form.load(mode, values?)', 'form.editable', 'form.dirty', 'form.changedPaths'],
      stateLabel: 'Runtime state',
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
      records: 'records',
    })

const sourceHref = 'https://github.com/daguanren21/vformjs/blob/main/docs/.vitepress/theme/components/examples/LiveCrudDialogDemo.vue'

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
  await form.submit()
}
</script>

<template>
  <LiveExampleFrame
    :locale="locale"
    anchor="dialog-crud"
    index="01"
    :capability="copy.capability"
    :title="copy.title"
    :goal="copy.goal"
    :steps="copy.steps"
    :expect="copy.expect"
    :apis="copy.apis"
    :source-href="sourceHref"
    :state-label="copy.stateLabel"
  >
    <div class="crud-toolbar">
      <ElButton type="primary" @click="openCreate">
        {{ copy.create }}
      </ElButton>
      <span class="crud-count">{{ rows.length }} {{ copy.records }}</span>
    </div>

    <div class="crud-table" tabindex="0" :aria-label="copy.title">
      <ElTable :data="rows" border>
        <ElTableColumn prop="title" :label="copy.labels.title" min-width="180" />
        <ElTableColumn prop="owner" :label="copy.labels.owner" width="104" />
        <ElTableColumn :label="copy.labels.status" width="96">
          <template #default="{ row }">
            {{ copy.statuses[row.status as TaskRow['status']] }}
          </template>
        </ElTableColumn>
        <ElTableColumn :label="copy.labels.actions" width="148" fixed="right">
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

    <template #state>
      <p><span>mode</span><code>{{ form.mode }}</code></p>
      <p><span>dirty</span><code>{{ form.dirty }}</code></p>
      <p><span>changedPaths</span><code>{{ JSON.stringify(form.changedPaths) }}</code></p>
      <p aria-live="polite">
        <span>{{ copy.result }}</span><code>{{ lastSaved ? JSON.stringify(lastSaved) : '—' }}</code>
      </p>
    </template>

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
        v-bind="form.host"
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
  gap: 10px 14px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.crud-count {
  color: var(--ph-ink-faint);
  font: 600 0.7rem/1.5 var(--ph-font-mono);
  letter-spacing: 0.04em;
}

.crud-table {
  --el-table-header-bg-color: var(--ph-sunken);
  --el-table-header-text-color: var(--ph-ink-soft);
  --el-table-text-color: var(--ph-ink-soft);
  --el-table-row-hover-bg-color: var(--ph-accent-wash);

  max-width: 100%;
  overflow-x: auto;
  border-radius: var(--ph-radius, 10px);
}

.crud-table:focus-visible {
  outline: 2px solid var(--ph-accent);
  outline-offset: 3px;
}

/* VitePress forces .vp-doc table{display:block; margin:20px 0} — that pushed
   ElTable's body rows a full margin below the header; restore the internals */
.crud-table :deep(.el-table__header),
.crud-table :deep(.el-table__body) {
  display: table;
  margin: 0;
  border-collapse: separate;
}

/* keep the doc-table zebra + full cell borders out of ElTable's grid lines */
.crud-table :deep(.el-table tr) {
  background: transparent;
}

.crud-table :deep(.el-table th),
.crud-table :deep(.el-table td) {
  border-top: 0;
  border-left: 0;
}
</style>
