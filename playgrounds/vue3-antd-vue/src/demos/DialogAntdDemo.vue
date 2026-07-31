<script setup lang="ts">
import { r } from '@vformjs/vue'
import {
  Button,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  Input,
  Modal,
  Select,
  SelectOption,
  Space,
  Table,
  Tag,
  Textarea,
} from 'ant-design-vue'
import { computed, ref } from 'vue'
import { useAntdForm } from '../form/use-antd-form'

interface Row {
  id: string
  title: string
  owner: string
  status: number
  remark: string
}

const rows = ref<Row[]>([
  { id: '1', title: '接入 Ant Design Vue', owner: '阿超', status: 1, remark: 'defineAdapter' },
  { id: '2', title: '校验联调', owner: '小陈', status: 2, remark: '' },
])

const visible = ref(false)
const log = ref('')

const form = useAntdForm({
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
      rows.value = rows.value.map(item =>
        item.id === values.id ? { ...item, ...values } : item,
      )
      log.value = `已保存 ${values.id}`
    }
    visible.value = false
  },
})

function setFormRef(inst: unknown) {
  form.bindHost(inst)
}

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

const columns = [
  { title: '标题', dataIndex: 'title', key: 'title' },
  { title: '负责人', dataIndex: 'owner', key: 'owner' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '操作', key: 'actions' },
]
</script>

<template>
  <div class="demo">
    <p class="hint">
      列表无 form；弹窗内 useAntdForm + load。详情用 Descriptions。
    </p>

    <a-space style="margin-bottom: 12px">
      <a-button type="primary" @click="openCreate">
        新增
      </a-button>
      <span class="log-inline">{{ log }}</span>
    </a-space>

    <a-table :columns="columns" :data-source="rows" :pagination="false" row-key="id" size="small">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="record.status === 1 ? 'blue' : 'green'">
            {{ record.status === 1 ? '进行中' : '已完成' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button type="link" size="small" @click="openEdit(record)">
              编辑
            </a-button>
            <a-button type="link" size="small" @click="openDetail(record)">
              详情
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="visible"
      :title="dialogTitle"
      :confirm-loading="form.submitting"
      @ok="onConfirm"
    >
      <a-form
        v-if="form.editable"
        :ref="setFormRef"
        :model="form.model"
        :rules="form.rules"
        :label-col="{ style: { width: '80px' } }"
      >
        <a-form-item v-if="form.model.id" label="ID">
          <a-input :value="form.model.id" disabled />
        </a-form-item>
        <a-form-item label="标题" name="title">
          <a-input v-model:value="form.model.title" />
        </a-form-item>
        <a-form-item label="负责人" name="owner">
          <a-input v-model:value="form.model.owner" />
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-select v-model:value="form.model.status" style="width: 100%">
            <a-select-option :value="1">
              进行中
            </a-select-option>
            <a-select-option :value="2">
              已完成
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-textarea v-model:value="form.model.remark" :rows="3" />
        </a-form-item>
      </a-form>

      <a-descriptions v-else bordered :column="1" size="small">
        <a-descriptions-item label="ID">
          {{ form.model.id }}
        </a-descriptions-item>
        <a-descriptions-item label="标题">
          {{ form.model.title }}
        </a-descriptions-item>
        <a-descriptions-item label="负责人">
          {{ form.model.owner }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          {{ form.model.status === 1 ? '进行中' : '已完成' }}
        </a-descriptions-item>
        <a-descriptions-item label="备注">
          {{ form.model.remark || '—' }}
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>
  </div>
</template>

<style scoped>
.hint { color: #8c8c8c; margin: 0 0 12px; line-height: 1.5; }
.log-inline { color: #1677ff; font-size: 13px; }
</style>
