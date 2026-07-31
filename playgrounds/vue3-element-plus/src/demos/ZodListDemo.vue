<script setup lang="ts">
import { useZodForm } from '@vformjs/element-plus'
import { fieldPath } from '@vformjs/vue'
import { ref } from 'vue'
import { z } from 'zod'

const log = ref('')

const schema = z.object({
  project: z.string().min(1, '项目名必填'),
  members: z.array(z.object({
    name: z.string().min(1, '姓名必填'),
    role: z.string().min(1),
  })).min(1, '至少一名成员'),
})

const form = useZodForm({
  schema,
  defaults: {
    project: '',
    members: [{ name: '', role: 'dev' }],
  },
  onSubmit: async (values) => {
    log.value = JSON.stringify(values, null, 2)
  },
})

const members = form.list('members', {
  defaultItem: () => ({ name: '', role: 'dev' }),
})

async function onSubmit() {
  const res = await form.submit()
  if (!res.ok)
    log.value = `校验失败:\n${JSON.stringify(res.errors, null, 2)}`
}
</script>

<template>
  <div class="demo">
    <p class="hint">
      Zod + form.list：数组 path 自动生成 members.i.name 规则
    </p>
    <el-form v-bind="form.el" label-width="100px" style="max-width: 640px">
      <el-form-item label="项目名" prop="project">
        <el-input v-model="form.model.project" />
      </el-form-item>

      <el-form-item
        v-for="(row, index) in members.fields"
        :key="row.key"
        :label="`成员 ${index + 1}`"
        :prop="fieldPath('members', index, 'name')"
      >
        <div class="row">
          <el-input v-model="form.model.members[index].name" placeholder="姓名" />
          <el-select v-model="form.model.members[index].role" style="width: 140px">
            <el-option label="开发" value="dev" />
            <el-option label="设计" value="design" />
            <el-option label="测试" value="qa" />
          </el-select>
          <el-button @click="members.remove(index)">
            删除
          </el-button>
        </div>
      </el-form-item>

      <el-form-item>
        <el-button @click="members.append()">
          添加成员
        </el-button>
        <el-button type="primary" :loading="form.submitting" @click="onSubmit">
          提交
        </el-button>
      </el-form-item>
    </el-form>
    <pre class="log">{{ log || '提交结果' }}</pre>
  </div>
</template>

<style scoped>
.hint { color: #909399; margin: 0 0 12px; }
.row { display: flex; gap: 8px; width: 100%; align-items: center; }
.log {
  margin-top: 16px; background: #0f172a; color: #e2e8f0;
  padding: 12px; border-radius: 8px; min-height: 64px;
  white-space: pre-wrap; font-size: 12px;
}
</style>
