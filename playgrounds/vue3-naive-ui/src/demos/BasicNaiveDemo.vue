<script setup lang="ts">
import { r, useNaiveForm } from '@vformjs/naive-ui'
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NSpace,
} from 'naive-ui'
import { ref } from 'vue'

const log = ref('')

const form = useNaiveForm({
  defaults: {
    name: '',
    email: '',
    remark: '',
  },
  rules: {
    name: [r.required('请输入姓名'), r.min(2, '至少 2 个字')],
    email: [r.required('请输入邮箱'), r.email('邮箱格式不对')],
  },
  onSubmit: async (values) => {
    log.value = JSON.stringify(values, null, 2)
  },
})

function setFormRef(inst: unknown) {
  form.bindHost(inst)
}

async function onSubmit() {
  const res = await form.submit()
  if (!res.ok)
    log.value = `校验失败:\n${JSON.stringify(res.errors, null, 2)}`
}

function onReset() {
  form.reset()
  log.value = ''
}
</script>

<template>
  <div class="demo">
    <p class="hint">
      真实 Naive UI（n-form）+ 自定义 FormHostAdapter。
      文档：docs/guide.md · docs/api.md · 对照 naiveui.com Form。
    </p>

    <n-form
      :ref="setFormRef"
      :model="form.model"
      :rules="form.rules"
      label-placement="left"
      label-width="90"
      style="max-width: 480px"
    >
      <n-form-item label="姓名" path="name">
        <n-input v-model:value="form.model.name" placeholder="至少 2 字" />
      </n-form-item>
      <n-form-item label="邮箱" path="email">
        <n-input v-model:value="form.model.email" placeholder="name@example.com" />
      </n-form-item>
      <n-form-item label="备注" path="remark">
        <n-input v-model:value="form.model.remark" type="textarea" />
      </n-form-item>
      <n-form-item>
        <n-space>
          <n-button type="primary" :loading="form.submitting" @click="onSubmit">
            提交
          </n-button>
          <n-button @click="onReset">
            重置
          </n-button>
        </n-space>
      </n-form-item>
    </n-form>

    <pre class="log">{{ log || '提交结果' }}</pre>
  </div>
</template>

<style scoped>
.hint { color: #909399; margin: 0 0 16px; line-height: 1.5; }
.log {
  margin-top: 16px;
  background: #0f172a;
  color: #e2e8f0;
  padding: 12px;
  border-radius: 8px;
  min-height: 64px;
  white-space: pre-wrap;
  font-size: 12px;
}
</style>
