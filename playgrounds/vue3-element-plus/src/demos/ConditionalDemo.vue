<script setup lang="ts">
import { useElForm } from '@vformjs/element-plus'
import { r } from '@vformjs/vue'
import { computed, ref } from 'vue'

const log = ref('')

const form = useElForm({
  defaults: {
    needInvoice: false,
    invoiceTitle: '',
    payType: 'bank' as 'bank' | 'alipay',
    bankAccount: '',
    alipayAccount: '',
    province: '',
    city: '',
  },
  when: {
    invoiceTitle: m => m.needInvoice,
    bankAccount: m => m.payType === 'bank',
    alipayAccount: m => m.payType === 'alipay',
    city: m => Boolean(m.province),
  },
  whenRules: {
    invoiceTitle: m => (m.needInvoice ? [r.required()] : null),
    bankAccount: m => (m.payType === 'bank' ? [r.required(), r.min(8)] : null),
    alipayAccount: m => (m.payType === 'alipay' ? [r.required(), r.email()] : null),
    city: m => (m.province ? [r.required('请选择城市', 'change')] : null),
  },
  linkage: [
    {
      deps: ['province'],
      run: ({ set, clearValidate }) => {
        set('city', '')
        clearValidate('city')
      },
    },
  ],
  onSubmit: async (values) => {
    log.value = JSON.stringify(values, null, 2)
  },
})

const hideInvoice = form.hidden('invoiceTitle')
const hideBank = form.hidden('bankAccount')
const hideAlipay = form.hidden('alipayAccount')
const hideCity = form.hidden('city')

const cityMap: Record<string, Array<{ label: string, value: string }>> = {
  zhejiang: [
    { label: '杭州', value: 'hangzhou' },
    { label: '宁波', value: 'ningbo' },
  ],
  jiangsu: [
    { label: '南京', value: 'nanjing' },
    { label: '苏州', value: 'suzhou' },
  ],
}
const cityOptions = computed(() => cityMap[form.model.province] ?? [])

async function onSubmit() {
  const res = await form.submit()
  if (!res.ok)
    log.value = `校验失败:\n${JSON.stringify(res.errors, null, 2)}`
}
</script>

<template>
  <div class="demo">
    <p class="hint">
      when / whenRules 条件显隐；省变更清空市（linkage deps 精确触发）
    </p>
    <el-form v-bind="form.el" label-width="110px" style="max-width: 520px">
      <el-form-item label="需要发票" prop="needInvoice">
        <el-switch v-model="form.model.needInvoice" />
      </el-form-item>
      <el-form-item v-if="!hideInvoice" label="发票抬头" prop="invoiceTitle">
        <el-input v-model="form.model.invoiceTitle" />
      </el-form-item>
      <el-form-item label="支付方式" prop="payType">
        <el-radio-group v-model="form.model.payType">
          <el-radio value="bank">
            银行
          </el-radio>
          <el-radio value="alipay">
            支付宝
          </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="!hideBank" label="银行账号" prop="bankAccount">
        <el-input v-model="form.model.bankAccount" />
      </el-form-item>
      <el-form-item v-if="!hideAlipay" label="支付宝" prop="alipayAccount">
        <el-input v-model="form.model.alipayAccount" />
      </el-form-item>
      <el-form-item label="省份" prop="province">
        <el-select v-model="form.model.province" clearable style="width: 100%">
          <el-option label="浙江" value="zhejiang" />
          <el-option label="江苏" value="jiangsu" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="!hideCity" label="城市" prop="city">
        <el-select v-model="form.model.city" clearable style="width: 100%">
          <el-option
            v-for="c in cityOptions"
            :key="c.value"
            :label="c.label"
            :value="c.value"
          />
        </el-select>
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
