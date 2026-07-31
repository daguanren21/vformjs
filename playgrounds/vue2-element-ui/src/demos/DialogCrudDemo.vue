<script lang="ts">
import { useElForm } from '@vformjs/element-ui'
import { r } from '@vformjs/vue'
import { computed, defineComponent, ref } from 'vue'

interface Row {
  id: string
  title: string
  owner: string
  status: number
  remark?: string
}

export default defineComponent({
  name: 'DialogCrudDemo',
  setup() {
    const visible = ref(false)
    const loadingDetail = ref(false)
    const last = ref('')
    const rows = ref<Row[]>([
      { id: '1', title: '弹窗任务 A', owner: 'Alice', status: 1, remark: '备注 A' },
      { id: '2', title: '弹窗任务 B', owner: 'Bob', status: 2, remark: '备注 B' },
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
        visible.value = false
        last.value = JSON.stringify(values, null, 2)
        const next = {
          id: values.id || String(Date.now()),
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
      },
    })

    const dialogTitle = computed(() => {
      if (form.mode === 'create')
        return '新增'
      if (form.mode === 'edit')
        return '编辑'
      return '详情'
    })

    const detailView = computed(() => {
      if (form.mode !== 'detail')
        return null
      return { ...form.model }
    })

    async function fakeGet(id: string) {
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

    function openCreate() {
      form.load('create')
      visible.value = true
    }
    async function openEdit(id: string) {
      visible.value = true
      loadingDetail.value = true
      try {
        form.load('edit', await fakeGet(id))
      }
      finally {
        loadingDetail.value = false
      }
    }
    async function openDetail(id: string) {
      visible.value = true
      loadingDetail.value = true
      try {
        form.load('detail', await fakeGet(id))
      }
      finally {
        loadingDetail.value = false
      }
    }

    return {
      form,
      rows,
      visible,
      loadingDetail,
      last,
      dialogTitle,
      detailView,
      openCreate,
      openEdit,
      openDetail,
    }
  },
})
</script>

<template>
  <div>
    <p style="color:#909399;margin:0 0 12px">
      弹窗：create/edit 表单；detail 用描述列表展示文字（非 disabled 表单）
    </p>
    <el-button type="primary" @click="openCreate">
      新增
    </el-button>
    <el-table :data="rows" border style="margin-top:12px">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="owner" label="负责人" width="120" />
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button type="text" @click="openEdit(row.id)">
            编辑
          </el-button>
          <el-button type="text" @click="openDetail(row.id)">
            详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog :visible.sync="visible" :title="dialogTitle" width="520px">
      <div v-loading="loadingDetail">
        <el-form v-if="form.editable" v-bind="form.el" label-width="90px">
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
        </el-form>

        <el-descriptions v-else-if="detailView" :column="1" border>
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
      <span slot="footer">
        <el-button @click="visible = false">
          {{ form.readonly ? '关闭' : '取消' }}
        </el-button>
        <el-button
          v-if="form.editable"
          type="primary"
          :loading="form.submitting"
          @click="form.submit()"
        >
          确定
        </el-button>
      </span>
    </el-dialog>

    <pre style="margin-top:16px;background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;min-height:64px;white-space:pre-wrap;font-size:12px">{{ last || '提交成功后显示' }}</pre>
  </div>
</template>
