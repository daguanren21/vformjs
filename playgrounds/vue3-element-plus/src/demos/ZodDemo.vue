<script setup lang="ts">
import { useZodForm } from '@veform/element-plus'
import { ref } from 'vue'
import { z } from 'zod'

const log = ref('')

const schema = z.object({
  username: z.string().min(3, '至少 3 位').regex(/^[a-zA-Z]\w*$/, '字母开头'),
  email: z.email('邮箱不正确'),
  age: z.number().min(1).max(120),
  website: z.union([z.url('URL 不正确'), z.literal('')]).optional(),
}).refine(v => v.username !== 'admin', {
  message: '用户名不能为 admin',
  path: ['username'],
})

// 一条龙：schema + defaults，自动注入 element-plus adapter
const form = useZodForm({
  schema,
  defaults: {
    username: '',
    email: '',
    age: 18,
    website: '',
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
      useZodForm（element-plus）：无需手写 adapter；refine 错误显示在字段红字
    </p>
    <el-form v-bind="form.el" label-width="100px" style="max-width: 480px">
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.model.username" placeholder="输入 admin 看 refine 红字" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.model.email" />
      </el-form-item>
      <el-form-item label="年龄" prop="age">
        <el-input-number v-model="form.model.age" :min="1" :max="120" />
      </el-form-item>
      <el-form-item label="网站" prop="website">
        <el-input v-model="form.model.website" placeholder="可空" />
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
