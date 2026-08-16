<script setup lang="ts">
import { useZodForm } from '@vformjs/ant-design-vue/zod'
import { Button, Form, FormItem, Input, InputNumber, Space } from 'ant-design-vue'
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


async function onSubmit() {
  const res = await form.submit()
  if (!res.ok)
    log.value = `校验失败:\n${JSON.stringify(res.errors, null, 2)}`
}
</script>

<template>
  <div class="demo">
    <p class="hint">
      useZodForm（@vformjs/ant-design-vue/zod）已经绑定官方 adapter。输入 admin 测试 refine。
    </p>

    <a-form
      v-bind="form.host"
      :label-col="{ style: { width: '90px' } }"
      style="max-width: 480px"
    >
      <a-form-item label="用户名" name="username">
        <a-input v-model:value="form.model.username" placeholder="输入 admin 测 refine" />
      </a-form-item>
      <a-form-item label="邮箱" name="email">
        <a-input v-model:value="form.model.email" />
      </a-form-item>
      <a-form-item label="年龄" name="age">
        <a-input-number v-model:value="form.model.age" :min="1" :max="120" style="width: 100%" />
      </a-form-item>
      <a-form-item>
        <a-space>
          <a-button type="primary" :loading="form.submitting" @click="onSubmit">
            提交
          </a-button>
          <a-button @click="form.reset(); log = ''">
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
