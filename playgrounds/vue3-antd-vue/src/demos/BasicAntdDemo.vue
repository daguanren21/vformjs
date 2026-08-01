<script setup lang="ts">
import { r, useAntdForm } from '@vformjs/ant-design-vue'
import { Button, Form, FormItem, Input, Space, Textarea } from 'ant-design-vue'
import { ref } from 'vue'

const log = ref('')

const form = useAntdForm({
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
      真实 Ant Design Vue（a-form）+ defineAdapter。
      文档：docs/guide.md · docs/api.md
    </p>

    <a-form
      :ref="setFormRef"
      :model="form.model"
      :rules="form.rules"
      :label-col="{ style: { width: '90px' } }"
      style="max-width: 480px"
    >
      <a-form-item label="姓名" name="name">
        <a-input v-model:value="form.model.name" placeholder="至少 2 字" />
      </a-form-item>
      <a-form-item label="邮箱" name="email">
        <a-input v-model:value="form.model.email" placeholder="name@example.com" />
      </a-form-item>
      <a-form-item label="备注" name="remark">
        <a-textarea v-model:value="form.model.remark" :rows="3" />
      </a-form-item>
      <a-form-item :wrapper-col="{ offset: 0 }">
        <a-space>
          <a-button type="primary" :loading="form.submitting" @click="onSubmit">
            提交
          </a-button>
          <a-button @click="onReset">
            重置
          </a-button>
        </a-space>
      </a-form-item>
    </a-form>

    <pre class="log">{{ log || '提交结果' }}</pre>
  </div>
</template>

<style scoped>
.hint { color: #8c8c8c; margin: 0 0 16px; line-height: 1.5; }
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
