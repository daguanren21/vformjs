<script setup lang="ts">
import { useElForm } from '@vformjs/element-plus'
import { r } from '@vformjs/vue'
import { ref } from 'vue'

const log = ref('')

const form = useElForm({
  defaults: {
    name: '',
    email: '',
    remark: '',
  },
  rules: {
    name: [r.required(), r.min(2)],
    email: [r.required(), r.email()],
  },
  onSubmit: async (values) => {
    log.value = JSON.stringify(values, null, 2)
  },
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
      最简单：defaults + rules + form.host + submit
    </p>
    <el-form v-bind="form.host" label-width="100px" style="max-width: 480px">
      <el-form-item label="姓名" prop="name">
        <el-input v-model="form.model.name" placeholder="至少 2 字" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.model.email" />
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="form.model.remark" type="textarea" />
      </el-form-item>
      <el-form-item>
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
.log {
  margin-top: 16px; background: #0f172a; color: #e2e8f0;
  padding: 12px; border-radius: 8px; min-height: 64px;
  white-space: pre-wrap; font-size: 12px;
}
</style>
