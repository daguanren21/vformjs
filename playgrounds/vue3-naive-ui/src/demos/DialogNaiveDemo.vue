<script setup lang="ts">
import { r, useNaiveForm } from '@vformjs/naive-ui'
import {
  NButton,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  NSpace,
  NTag,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { computed, h, ref } from 'vue'

interface Row {
  id: string
  title: string
  owner: string
  status: number
  remark: string
}

const rows = ref<Row[]>([
  { id: '1', title: '接入 Naive', owner: '阿超', status: 1, remark: '自定义 adapter' },
  { id: '2', title: '校验联调', owner: '小陈', status: 2, remark: '' },
])

const visible = ref(false)
const log = ref('')

const form = useNaiveForm({
  defaults: {
    id: '',
    title: '',
    owner: '',
    status: 1,
    remark: '',
  },
  rules: {
    title: [r.required('标题必填'), r.min(2)],
    owner: [r.required('负责人必填')],
  },
  onSubmit: async (values) => {
    if (form.mode === 'create') {
      const id = String(Date.now())
      rows.value = [{ ...values, id }, ...rows.value]
      log.value = `已新增 ${id}`
    }
    else if (form.mode === 'edit') {
      rows.value = rows.value.map(r =>
        r.id === values.id ? { ...r, ...values } : r,
      )
      log.value = `已保存 ${values.id}`
    }
    visible.value = false
  },
})


const dialogTitle = computed(() => {
  if (form.mode === 'create')
    return '新增'
  if (form.mode === 'edit')
    return '编辑'
  return '详情'
})

function openCreate() {
  form.load('create')
  visible.value = true
  log.value = ''
}

function openEdit(row: Row) {
  form.load('edit', { ...row })
  visible.value = true
}

function openDetail(row: Row) {
  form.load('detail', { ...row })
  visible.value = true
}

async function onConfirm() {
  if (form.mode === 'detail') {
    visible.value = false
    return
  }
  await form.submit()
}

const columns: DataTableColumns<Row> = [
  { title: '标题', key: 'title' },
  { title: '负责人', key: 'owner' },
  {
    title: '状态',
    key: 'status',
    render: row => h(NTag, { type: row.status === 1 ? 'info' : 'success', size: 'small' }, {
      default: () => (row.status === 1 ? '进行中' : '已完成'),
    }),
  },
  {
    title: '操作',
    key: 'actions',
    render: row => h(NSpace, null, {
      default: () => [
        h(NButton, { size: 'tiny', onClick: () => openEdit(row) }, { default: () => '编辑' }),
        h(NButton, { size: 'tiny', quaternary: true, onClick: () => openDetail(row) }, { default: () => '详情' }),
      ],
    }),
  },
]

const statusOptions = [
  { label: '进行中', value: 1 },
  { label: '已完成', value: 2 },
]
</script>

<template>
  <div class="demo">
    <p class="hint">
      列表无 form；弹窗内 useNaiveForm + load(create/edit/detail)。
      详情用 Descriptions，不用 disabled 表单。
    </p>

    <n-space style="margin-bottom: 12px">
      <n-button type="primary" @click="openCreate">
        新增
      </n-button>
      <span class="log-inline">{{ log }}</span>
    </n-space>

    <n-data-table :columns="columns" :data="rows" :bordered="false" size="small" />

    <n-modal
      v-model:show="visible"
      preset="card"
      :title="dialogTitle"
      style="width: 520px"
      :mask-closable="false"
    >
      <n-form
        v-if="form.editable"
        v-bind="form.host"
        label-placement="left"
        label-width="80"
      >
        <n-form-item v-if="form.model.id" label="ID">
          <n-input :value="form.model.id" disabled />
        </n-form-item>
        <n-form-item label="标题" path="title">
          <n-input v-model:value="form.model.title" />
        </n-form-item>
        <n-form-item label="负责人" path="owner">
          <n-input v-model:value="form.model.owner" />
        </n-form-item>
        <n-form-item label="状态" path="status">
          <n-select v-model:value="form.model.status" :options="statusOptions" />
        </n-form-item>
        <n-form-item label="备注" path="remark">
          <n-input v-model:value="form.model.remark" type="textarea" />
        </n-form-item>
      </n-form>

      <n-descriptions v-else label-placement="left" bordered :column="1">
        <n-descriptions-item label="ID">
          {{ form.model.id }}
        </n-descriptions-item>
        <n-descriptions-item label="标题">
          {{ form.model.title }}
        </n-descriptions-item>
        <n-descriptions-item label="负责人">
          {{ form.model.owner }}
        </n-descriptions-item>
        <n-descriptions-item label="状态">
          {{ form.model.status === 1 ? '进行中' : '已完成' }}
        </n-descriptions-item>
        <n-descriptions-item label="备注">
          {{ form.model.remark || '—' }}
        </n-descriptions-item>
      </n-descriptions>

      <template #footer>
        <n-space justify="end">
          <n-button @click="visible = false">
            取消
          </n-button>
          <n-button type="primary" :loading="form.submitting" @click="onConfirm">
            {{ form.mode === 'detail' ? '关闭' : '确定' }}
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.hint { color: #909399; margin: 0 0 12px; line-height: 1.5; }
.log-inline { color: #18a058; font-size: 13px; }
</style>
