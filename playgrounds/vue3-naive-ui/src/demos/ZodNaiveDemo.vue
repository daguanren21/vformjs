<script setup lang="ts">
import { useZodForm } from '@vformjs/naive-ui/zod'
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSpace,
} from 'naive-ui'
import { ref } from 'vue'
import { z } from 'zod'

const log = ref('')

const schema = z.object({
  username: z.string().min(3, '至少 3 位'),
  email: z.email('邮箱不正确'),
  age: z.number().min(1).max(120),
}).refine(v => v.username !== 'admin', {
  message: '用户名不能为 admin',
  path: ['username'],
})

// The official package preconfigures the Naive UI host adapter.
const form = useZodForm({
  schema,
  defaults: {
    username: '',
    email: '',
    age: 18,
  },
  onSubmit: async (values) => {
    log.value = JSON.stringify(values, null, 2)
  },
})

function setFormRef(inst: unknown) {
  form.host.ref(inst)
}

async function onSubmit() {
  const res = await form.submit()
  if (!res.ok)
    log.value = `校验失败:\n${JSON.stringify(res.errors, null, 2)}`
}
</script>

<template>
  <div class="demo">
    <p class="hint">
      useZodForm（@vformjs/naive-ui/zod）已经绑定官方 adapter。
      输入 admin 看 refine 是否挂在 username 上。
    </p>

    <n-form
      :ref="setFormRef"
      :model="form.model"
      :rules="form.rules"
      label-placement="left"
      label-width="90"
      style="max-width: 480px"
    >
      <n-form-item label="用户名" path="username">
        <n-input v-model:value="form.model.username" placeholder="输入 admin 测 refine" />
      </n-form-item>
      <n-form-item label="邮箱" path="email">
        <n-input v-model:value="form.model.email" />
      </n-form-item>
      <n-form-item label="年龄" path="age">
        <n-input-number v-model:value="form.model.age" :min="1" :max="120" style="width: 100%" />
      </n-form-item>
      <n-form-item>
        <n-space>
          <n-button type="primary" :loading="form.submitting" @click="onSubmit">
            提交
          </n-button>
          <n-button @click="form.reset(); log = ''">
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
