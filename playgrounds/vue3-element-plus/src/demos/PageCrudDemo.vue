<script setup lang="ts">
/**
 * Demo：独立页面 新增 / 编辑 / 详情
 * - form 只在「表单页」里（create / edit）
 * - detail 不是 disabled form，而是纯展示
 * - 列表只负责跳转（这里用假路由 state 模拟）
 */
import { useElForm } from '@vformjs/element-plus'
import { r } from '@vformjs/vue'
import { computed, ref, watch } from 'vue'

type PageMode = 'list' | 'create' | 'edit' | 'detail'

interface Row {
  id: string
  title: string
  owner: string
  status: number
  remark: string
}

const page = ref<PageMode>('list')
const currentId = ref('')
const loading = ref(false)
const log = ref('')

const rows = ref<Row[]>([
  { id: '1', title: '页面任务 A', owner: 'Alice', status: 1, remark: '列表数据 A' },
  { id: '2', title: '页面任务 B', owner: 'Bob', status: 2, remark: '列表数据 B' },
])

const form = useElForm({
  defaults: {
    id: undefined as string | undefined,
    title: '',
    owner: '',
    status: 1,
    remark: '',
  },
  rules: {
    title: [r.required(), r.min(2)],
    owner: [r.required()],
    status: [r.required('请选择', 'change')],
  },
  onSubmit: async (values) => {
    await new Promise(r => setTimeout(r, 250))
    const next: Row = {
      id: String(values.id || Date.now()),
      title: String(values.title),
      owner: String(values.owner),
      status: Number(values.status),
      remark: String(values.remark || ''),
    }
    const idx = rows.value.findIndex(r => r.id === next.id)
    if (idx >= 0)
      rows.value[idx] = next
    else
      rows.value.unshift(next)
    log.value = JSON.stringify(next, null, 2)
    // 提交后回列表（模拟 router.back / push list）
    goList()
  },
})

/** 详情页专用展示数据（不是 form.model，避免和编辑态缠在一起） */
const detailView = ref<Row | null>(null)

const pageTitle = computed(() => {
  if (page.value === 'create')
    return '新增页 /xxx/create'
  if (page.value === 'edit')
    return `编辑页 /xxx/${currentId.value}/edit`
  if (page.value === 'detail')
    return `详情页 /xxx/${currentId.value}`
  return '列表页 /xxx'
})

async function fakeGet(id: string): Promise<Row> {
  await new Promise(r => setTimeout(r, 200))
  const row = rows.value.find(r => r.id === id)
  return {
    id,
    title: row?.title ?? '',
    owner: row?.owner ?? '',
    status: row?.status ?? 1,
    remark: row?.remark ?? '',
  }
}

function goList() {
  page.value = 'list'
  currentId.value = ''
  detailView.value = null
  form.load('create') // 清掉残留，避免下次进页脏数据
  form.reset()
}

async function goCreate() {
  // 模拟 router.push('/tasks/create')
  page.value = 'create'
  currentId.value = ''
  detailView.value = null
  form.load('create')
}

async function goEdit(id: string) {
  // 模拟 router.push(`/tasks/${id}/edit`)
  page.value = 'edit'
  currentId.value = id
  detailView.value = null
  loading.value = true
  try {
    const detail = await fakeGet(id)
    form.load('edit', detail)
  }
  finally {
    loading.value = false
  }
}

async function goDetail(id: string) {
  // 模拟 router.push(`/tasks/${id}`)
  // 详情：只拉数据做展示，不走 disabled 表单
  page.value = 'detail'
  currentId.value = id
  form.load('create') // 详情不用编辑 form
  form.reset()
  loading.value = true
  try {
    detailView.value = await fakeGet(id)
  }
  finally {
    loading.value = false
  }
}

async function onSubmit() {
  const res = await form.submit()
  if (!res.ok)
    log.value = `校验失败:\n${JSON.stringify(res.errors, null, 2)}`
}

// 离开表单页时清 log 可选
watch(page, (p) => {
  if (p === 'list')
    return
  if (p === 'create' || p === 'edit')
    log.value = ''
})
</script>

<template>
  <div class="demo">
    <p class="hint">
      独立页面：列表只跳转。create/edit 用 form；detail 是文字展示，不是 disabled 表单。
    </p>

    <el-tag type="info" style="margin-bottom: 12px">
      当前：{{ pageTitle }}
    </el-tag>

    <!-- ===== 列表页 ===== -->
    <div v-if="page === 'list'">
      <el-button type="primary" @click="goCreate">
        新增（进创建页）
      </el-button>
      <el-table :data="rows" border style="margin-top: 12px">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="owner" label="负责人" width="120" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button link type="primary" @click="goEdit(row.id)">
              编辑
            </el-button>
            <el-button link @click="goDetail(row.id)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- ===== 新增 / 编辑 表单页 ===== -->
    <div v-else-if="page === 'create' || page === 'edit'" v-loading="loading">
      <div class="toolbar">
        <el-button @click="goList">
          ← 返回列表
        </el-button>
        <el-tag>{{ form.mode }}</el-tag>
      </div>
      <el-form v-bind="form.el" label-width="90px" style="max-width: 480px; margin-top: 12px">
        <el-form-item v-if="form.model.id" label="ID">
          <el-input :model-value="form.model.id" disabled />
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.model.title" />
        </el-form-item>
        <el-form-item label="负责人" prop="owner">
          <el-input v-model="form.model.owner" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.model.status" style="width: 100%">
            <el-option label="进行中" :value="1" />
            <el-option label="已完成" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.model.remark" type="textarea" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="form.submitting" @click="onSubmit">
            保存
          </el-button>
          <el-button @click="form.reset()">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- ===== 详情页：纯展示 ===== -->
    <div v-else-if="page === 'detail'" v-loading="loading">
      <div class="toolbar">
        <el-button @click="goList">
          ← 返回列表
        </el-button>
        <el-button type="primary" plain @click="goEdit(currentId)">
          去编辑
        </el-button>
      </div>

      <el-descriptions
        v-if="detailView"
        title="详情展示（Descriptions，不是 disabled form）"
        :column="1"
        border
        style="max-width: 520px; margin-top: 12px"
      >
        <el-descriptions-item label="ID">
          {{ detailView.id }}
        </el-descriptions-item>
        <el-descriptions-item label="标题">
          {{ detailView.title }}
        </el-descriptions-item>
        <el-descriptions-item label="负责人">
          {{ detailView.owner }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          {{ detailView.status === 1 ? '进行中' : '已完成' }}
        </el-descriptions-item>
        <el-descriptions-item label="备注">
          {{ detailView.remark || '—' }}
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <pre class="log">{{ log || '保存成功后回列表，并显示结果' }}</pre>
  </div>
</template>

<style scoped>
.demo { }
.hint { color: #909399; margin: 0 0 12px; }
.toolbar { display: flex; gap: 8px; align-items: center; }
.log {
  margin-top: 16px; background: #0f172a; color: #e2e8f0;
  padding: 12px; border-radius: 8px; min-height: 64px;
  white-space: pre-wrap; font-size: 12px;
}
</style>
