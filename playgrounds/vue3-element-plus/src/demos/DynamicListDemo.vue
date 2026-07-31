<script setup lang="ts">
import { useElForm } from '@vformjs/element-plus'
import { fieldPath, r } from '@vformjs/vue'
import { ref } from 'vue'

const log = ref('')

const form = useElForm({
  defaults: {
    project: '',
    members: [{ name: '', role: 'dev' }] as Array<{ key?: string, name: string, role: string }>,
  },
  rules: {
    project: [r.required()],
  },
  onSubmit: async (values) => {
    log.value = JSON.stringify(values, null, 2)
  },
})

const members = form.list('members', {
  defaultItem: () => ({ name: '', role: 'dev' }),
})
const memberFields = members.fields

async function onSubmit() {
  const res = await form.submit()
  if (!res.ok)
    log.value = `校验失败:\n${JSON.stringify(res.errors, null, 2)}`
}
</script>

<template>
  <div class="demo">
    <p class="hint">
      form.list 动态数组；行 prop 用 fieldPath('members', i, 'name')
    </p>
    <el-form v-bind="form.el" label-width="100px" style="max-width: 640px">
      <el-form-item label="项目名" prop="project">
        <el-input v-model="form.model.project" />
      </el-form-item>

      <el-form-item
        v-for="(row, index) in memberFields"
        :key="row.key"
        :label="`成员 ${index + 1}`"
        :prop="fieldPath('members', index, 'name')"
        :rules="[r.required('姓名必填')]"
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
        <el-button @click="form.reset(); log = ''">
          重置
        </el-button>
      </el-form-item>
    </el-form>
    <pre class="log">{{ log || '提交结果' }}</pre>
  </div>
</template>

<style scoped>
.hint { color: #909399; margin: 0 0 12px; }
.row { display: flex; gap: 8px; width: 100%; }
.log {
  margin-top: 16px; background: #0f172a; color: #e2e8f0;
  padding: 12px; border-radius: 8px; min-height: 64px;
  white-space: pre-wrap; font-size: 12px;
}
</style>
