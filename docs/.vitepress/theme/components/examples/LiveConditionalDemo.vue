<script setup lang="ts">
import { r, useElForm } from '@vformjs/element-plus'
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElSwitch,
} from 'element-plus'
import { computed, ref } from 'vue'
import type { HomeLocale } from '../../content'
import LiveExampleFrame from './LiveExampleFrame.vue'

const props = defineProps<{
  locale: HomeLocale
}>()

const copy = computed(() => props.locale === 'zh'
  ? {
      title: '条件字段与联动：状态仍在普通 TypeScript 里',
      description: 'when 控制显隐，whenRules 只在字段生效时挂规则；省份变化通过 linkage 清空城市并清除旧校验。',
      invoice: '需要发票',
      invoiceTitle: '发票抬头',
      payType: '支付方式',
      bank: '银行',
      alipay: '支付宝',
      bankAccount: '银行账号',
      alipayAccount: '支付宝邮箱',
      province: '省份',
      city: '城市',
      submit: '提交',
      reset: '重置',
      result: '提交结果',
      failed: '请先修正字段错误',
      chooseProvince: '选择省份',
      chooseCity: '选择城市',
    }
  : {
      title: 'Conditional fields and linkage stay in plain TypeScript',
      description: 'when controls visibility, whenRules attaches validation only while a field is active, and linkage clears the city when its province changes.',
      invoice: 'Need invoice',
      invoiceTitle: 'Invoice title',
      payType: 'Payment method',
      bank: 'Bank',
      alipay: 'Alipay',
      bankAccount: 'Bank account',
      alipayAccount: 'Alipay email',
      province: 'Province',
      city: 'City',
      submit: 'Submit',
      reset: 'Reset',
      result: 'Submit result',
      failed: 'Fix the field errors first',
      chooseProvince: 'Choose a province',
      chooseCity: 'Choose a city',
    })

const result = ref('')

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
    invoiceTitle: values => values.needInvoice,
    bankAccount: values => values.payType === 'bank',
    alipayAccount: values => values.payType === 'alipay',
    city: values => Boolean(values.province),
  },
  whenRules: {
    invoiceTitle: values => values.needInvoice ? [r.required()] : null,
    bankAccount: values => values.payType === 'bank' ? [r.required(), r.min(8)] : null,
    alipayAccount: values => values.payType === 'alipay' ? [r.required(), r.email()] : null,
    city: values => values.province ? [r.required()] : null,
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
    result.value = JSON.stringify(values, null, 2)
  },
})

const hideInvoice = form.hidden('invoiceTitle')
const hideBank = form.hidden('bankAccount')
const hideAlipay = form.hidden('alipayAccount')
const hideCity = form.hidden('city')

const cityOptions = computed(() => {
  const chinese = props.locale === 'zh'
  const cities: Record<string, Array<{ label: string, value: string }>> = {
    zhejiang: [
      { label: chinese ? '杭州' : 'Hangzhou', value: 'hangzhou' },
      { label: chinese ? '宁波' : 'Ningbo', value: 'ningbo' },
    ],
    jiangsu: [
      { label: chinese ? '南京' : 'Nanjing', value: 'nanjing' },
      { label: chinese ? '苏州' : 'Suzhou', value: 'suzhou' },
    ],
  }
  return cities[form.model.province] ?? []
})

const activeFields = computed(() => [
  form.model.needInvoice ? 'invoiceTitle' : null,
  form.model.payType === 'bank' ? 'bankAccount' : 'alipayAccount',
  form.model.province ? 'city' : null,
].filter(Boolean))

async function submit() {
  result.value = ''
  const response = await form.submit()
  if (!response.ok) {
    result.value = `${copy.value.failed}: ${Object.keys(response.errors).join(', ')}`
    form.scrollToFirstError()
  }
}

function reset() {
  form.reset()
  result.value = ''
}
</script>

<template>
  <LiveExampleFrame
    anchor="conditional-linkage"
    index="02"
    :title="copy.title"
    :description="copy.description"
    code="when + whenRules + linkage[{ deps, run }]"
  >
    <div class="conditional-layout">
      <ElForm
        v-bind="form.el"
        class="conditional-form"
        label-position="top"
        @submit.prevent
      >
        <ElFormItem :label="copy.invoice" prop="needInvoice">
          <ElSwitch v-model="form.model.needInvoice" />
        </ElFormItem>

        <ElFormItem
          v-if="!hideInvoice"
          :label="copy.invoiceTitle"
          prop="invoiceTitle"
          :error="form.errors.invoiceTitle?.[0]"
        >
          <ElInput v-model="form.model.invoiceTitle" name="invoiceTitle" autocomplete="off" />
        </ElFormItem>

        <ElFormItem :label="copy.payType" prop="payType">
          <ElRadioGroup v-model="form.model.payType">
            <ElRadio value="bank">{{ copy.bank }}</ElRadio>
            <ElRadio value="alipay">{{ copy.alipay }}</ElRadio>
          </ElRadioGroup>
        </ElFormItem>

        <ElFormItem
          v-if="!hideBank"
          :label="copy.bankAccount"
          prop="bankAccount"
          :error="form.errors.bankAccount?.[0]"
        >
          <ElInput v-model="form.model.bankAccount" name="bankAccount" autocomplete="off" />
        </ElFormItem>

        <ElFormItem
          v-if="!hideAlipay"
          :label="copy.alipayAccount"
          prop="alipayAccount"
          :error="form.errors.alipayAccount?.[0]"
        >
          <ElInput
            v-model="form.model.alipayAccount"
            name="alipayAccount"
            type="email"
            autocomplete="off"
          />
        </ElFormItem>

        <div class="conditional-selects">
          <ElFormItem :label="copy.province" prop="province">
            <ElSelect
              v-model="form.model.province"
              clearable
              :placeholder="copy.chooseProvince"
              style="width: 100%"
            >
              <ElOption :label="locale === 'zh' ? '浙江' : 'Zhejiang'" value="zhejiang" />
              <ElOption :label="locale === 'zh' ? '江苏' : 'Jiangsu'" value="jiangsu" />
            </ElSelect>
          </ElFormItem>

          <ElFormItem
            v-if="!hideCity"
            :label="copy.city"
            prop="city"
            :error="form.errors.city?.[0]"
          >
            <ElSelect
              v-model="form.model.city"
              clearable
              :placeholder="copy.chooseCity"
              style="width: 100%"
            >
              <ElOption
                v-for="city in cityOptions"
                :key="city.value"
                :label="city.label"
                :value="city.value"
              />
            </ElSelect>
          </ElFormItem>
        </div>

        <div class="conditional-actions">
          <ElButton type="primary" :loading="form.submitting" @click="submit">
            {{ copy.submit }}
          </ElButton>
          <ElButton @click="reset">
            {{ copy.reset }}
          </ElButton>
        </div>
      </ElForm>

      <aside class="conditional-state" aria-live="polite">
        <p><span>activeFields</span><code>{{ JSON.stringify(activeFields) }}</code></p>
        <p><span>dirty</span><code>{{ form.dirty }}</code></p>
        <p><span>changedPaths</span><code>{{ JSON.stringify(form.changedPaths) }}</code></p>
        <p><span>{{ copy.result }}</span><code>{{ result || '—' }}</code></p>
      </aside>
    </div>
  </LiveExampleFrame>
</template>

<style scoped>
.conditional-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.72fr);
  gap: clamp(24px, 4vw, 44px);
}

.conditional-selects {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.conditional-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.conditional-state {
  align-self: start;
  border: 1px solid var(--ph-band-line);
  background: var(--ph-band-ink);
  color: var(--ph-band-fg);
}

.conditional-state p {
  display: grid;
  grid-template-columns: 112px 1fr;
  margin: 0;
  border-bottom: 1px solid var(--ph-band-line);
}

.conditional-state p:last-child {
  border-bottom: 0;
}

.conditional-state span,
.conditional-state code {
  min-width: 0;
  padding: 12px 14px;
  overflow-wrap: anywhere;
}

.conditional-state span {
  color: #b7ad99;
  font: 600 0.7rem/1.5 var(--ph-font-mono);
}

.conditional-state code {
  border-left: 1px solid var(--ph-band-line);
  color: var(--ph-accent-on-ink);
  font-size: 0.72rem;
  white-space: pre-wrap;
}

@media (max-width: 760px) {
  .conditional-layout,
  .conditional-selects {
    grid-template-columns: 1fr;
  }
}
</style>
