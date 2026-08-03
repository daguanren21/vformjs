<script lang="ts">
import { useElForm } from '@vformjs/element-ui'
import { r } from '@vformjs/vue'
import { defineComponent, ref } from 'vue'

export default defineComponent({
  name: 'BasicDemo',
  setup() {
    const log = ref('')
    const form = useElForm({
      defaults: { name: '', email: '', remark: '' },
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
    function onReset() {
      form.reset()
      log.value = ''
    }
    return { form, log, onSubmit, onReset }
  },
})
</script>

<template>
  <div>
    <p style="color:#909399;margin:0 0 12px">
      最简单：defaults + rules + form.host（Vue2.7 + element-ui）
    </p>
    <el-form v-bind="form.host" label-width="100px" style="max-width:480px">
      <el-form-item label="姓名" prop="name">
        <el-input v-model="form.model.name" />
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
        <el-button @click="onReset">
          重置
        </el-button>
      </el-form-item>
    </el-form>
    <pre style="margin-top:16px;background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;min-height:64px;white-space:pre-wrap;font-size:12px">{{ log || '提交结果' }}</pre>
  </div>
</template>
