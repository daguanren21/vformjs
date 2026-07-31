<script lang="ts">
import { useElForm } from '@veform/element-ui'
import { r } from '@veform/vue'
import { computed, defineComponent, ref } from 'vue'

type PageMode = 'list' | 'create' | 'edit' | 'detail'

interface Row {
  id: string
  title: string
  owner: string
  status: number
  remark: string
}

export default defineComponent({
  name: 'PageCrudDemo',
  setup() {
    const page = ref<PageMode>('list')
    const currentId = ref('')
    const loading = ref(false)
    const log = ref('')
    const detailView = ref<Row | null>(null)

    const rows = ref<Row[]>([
      { id: '1', title: '页面任务 A', owner: 'Alice', status: 1, remark: '备注 A' },
      { id: '2', title: '页面任务 B', owner: 'Bob', status: 2, remark: '备注 B' },
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
      },
      onSubmit: async (values) => {
        await new Promise(r => setTimeout(r, 250))
        const next: Row = {
          id: String(values.id || Date.now()),
          title: values.title,
          owner: values.owner,
          status: values.status,
          remark: values.remark || '',
        }
        const idx = rows.value.findIndex(r => r.id === next.id)
        if (idx >= 0)
          rows.value.splice(idx, 1, next)
        else
          rows.value.unshift(next)
        log.value = JSON.stringify(next, null, 2)
        goList()
      },
    })

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
      form.load('create')
      form.reset()
    }

    function goCreate() {
      page.value = 'create'
      currentId.value = ''
      detailView.value = null
      form.load('create')
    }

    async function goEdit(id: string) {
      page.value = 'edit'
      currentId.value = id
      detailView.value = null
      loading.value = true
      try {
        form.load('edit', await fakeGet(id))
      }
      finally {
        loading.value = false
      }
    }

    async function goDetail(id: string) {
      page.value = 'detail'
      currentId.value = id
      form.load('create')
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

    return {
      page,
      pageTitle,
      rows,
      form,
      loading,
      detailView,
      currentId,
      log,
      goList,
      goCreate,
      goEdit,
      goDetail,
      onSubmit,
    }
  },
})
</script>

<template>
  <div>
    <p style="color:#909399;margin:0 0 12px">
      页面路由模拟：create/edit 表单；detail 用 Descriptions 文字展示
    </p>
    <el-tag type="info" style="margin-bottom:12px">
      {{ pageTitle }}
    </el-tag>

    <div v-if="page === 'list'">
      <el-button type="primary" @click="goCreate">
        新增（进创建页）
      </el-button>
      <el-table :data="rows" border style="margin-top:12px">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="owner" label="负责人" width="120" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button type="text" @click="goEdit(row.id)">
              编辑
            </el-button>
            <el-button type="text" @click="goDetail(row.id)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-else-if="page === 'create' || page === 'edit'" v-loading="loading">
      <el-button @click="goList">
        ← 返回列表
      </el-button>
      <el-form v-bind="form.el" label-width="90px" style="max-width:480px;margin-top:12px">
        <el-form-item v-if="form.model.id" label="ID">
          <el-input :value="form.model.id" disabled />
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.model.title" />
        </el-form-item>
        <el-form-item label="负责人" prop="owner">
          <el-input v-model="form.model.owner" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.model.status" style="width:100%">
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

    <div v-else-if="page === 'detail'" v-loading="loading">
      <el-button @click="goList">
        ← 返回列表
      </el-button>
      <el-button type="primary" plain style="margin-left:8px" @click="goEdit(currentId)">
        去编辑
      </el-button>
      <el-descriptions
        v-if="detailView"
        title="详情（文字展示，不是 disabled 表单）"
        :column="1"
        border
        style="max-width:520px;margin-top:12px"
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

    <pre style="margin-top:16px;background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;min-height:64px;white-space:pre-wrap;font-size:12px">{{ log || '保存成功后回列表' }}</pre>
  </div>
</template>
