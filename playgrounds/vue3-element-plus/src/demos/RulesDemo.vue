<script setup lang="ts">
import { useElForm } from '@veform/element-plus'
import { r } from '@veform/vue'
import { ref } from 'vue'

const log = ref('')

const form = useElForm({
  defaults: {
    username: '',
    phone: '',
    code: '',
    price: undefined as number | undefined,
    website: '',
    bio: '',
  },
  rules: {
    username: [
      r.trimRequired('用户名必填'),
      r.pattern(/^[a-zA-Z][\w-]{2,15}$/, '字母开头，3-16 位'),
    ],
    phone: [r.required(), r.phone()],
    code: [r.required(), r.len(6, '验证码 6 位')],
    price: [
      r.required('价格必填', 'change'),
      r.numberRange(0.01, 999999, '范围 0.01-999999'),
    ],
    website: [r.url()],
    bio: [r.max(50)],
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
      自定义 rules：pattern / phone / len / numberRange / url / max / trimRequired
    </p>
    <el-form v-bind="form.el" label-width="100px" style="max-width: 520px">
      <el-form-item label="用户名" prop="username">
        <el-input v-model="form.model.username" />
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="form.model.phone" />
      </el-form-item>
      <el-form-item label="验证码" prop="code">
        <el-input v-model="form.model.code" maxlength="6" />
      </el-form-item>
      <el-form-item label="价格" prop="price">
        <el-input-number v-model="form.model.price" :min="0" :precision="2" />
      </el-form-item>
      <el-form-item label="网站" prop="website">
        <el-input v-model="form.model.website" placeholder="https://" />
      </el-form-item>
      <el-form-item label="简介" prop="bio">
        <el-input v-model="form.model.bio" type="textarea" maxlength="50" show-word-limit />
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
