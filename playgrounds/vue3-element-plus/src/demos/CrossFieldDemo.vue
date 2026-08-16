<script setup lang="ts">
import { useElForm } from '@vformjs/element-plus'
import { r } from '@vformjs/vue'
import { ref } from 'vue'

const log = ref('')

const form = useElForm({
  defaults: {
    password: '',
    confirmPassword: '',
  },
  rules: {
    password: [r.required(), r.min(6)],
    confirmPassword: ({ values }) => [
      r.required(),
      r.equalTo(() => values.password, '两次密码不一致'),
    ],
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
      跨字段：r.equalTo(() => form.model.password)
    </p>
    <el-form v-bind="form.host" label-width="110px" style="max-width: 420px">
      <el-form-item label="密码" prop="password">
        <el-input v-model="form.model.password" type="password" show-password />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input v-model="form.model.confirmPassword" type="password" show-password />
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
