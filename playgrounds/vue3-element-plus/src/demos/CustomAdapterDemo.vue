<script setup lang="ts">
/**
 * 演示：不依赖 Element 宿主 API，自己实现 FormHostAdapter。
 * 真实 Naive UI 写法见 docs/custom-adapter.md。
 */
import type {
  FieldPath,
  FormErrors,
  FormHostAdapter,
  HostValidateResult,
} from '@veform/core'
import { r, useForm } from '@veform/vue'
import { computed, reactive, ref } from 'vue'

const log = ref('')

/** 最小「假宿主」：只实现 validate + 字段错误状态，模拟非 Element 表单壳 */
interface MiniHost {
  validate: (paths?: string[]) => Promise<void>
  clear: () => void
  fieldErrors: Record<string, string>
}

function createMiniAdapter(): FormHostAdapter {
  let host: MiniHost | null = null

  return {
    bind(instance) {
      host = (instance as MiniHost | null) ?? null
    },
    async validate(paths?: FieldPath[]): Promise<HostValidateResult> {
      if (!host) {
        return {
          valid: false,
          errors: { _form: ['宿主未绑定：请先 bindHost(miniHost)'] },
        }
      }
      try {
        await host.validate(paths)
        return { valid: true }
      }
      catch (err) {
        const errors = (err as { errors?: FormErrors })?.errors ?? {
          _form: [String(err)],
        }
        return { valid: false, errors }
      }
    },
    clearValidate() {
      host?.clear()
    },
    afterModelReset() {
      host?.clear()
    },
  }
}

const form = useForm({
  defaultValues: {
    title: '',
    owner: '',
  },
  rules: {
    title: [r.required('标题必填'), r.min(2, '至少 2 个字')],
    owner: [r.required('负责人必填')],
  },
  adapter: createMiniAdapter(),
  onSubmit: async (values) => {
    log.value = `提交成功:\n${JSON.stringify(values, null, 2)}`
  },
})

/** 按 form.rules 跑一遍，错误记在 fieldErrors 上（模拟 n-form 红字） */
const miniHost = reactive<MiniHost>({
  fieldErrors: {},
  clear() {
    miniHost.fieldErrors = {}
  },
  async validate(paths?: string[]) {
    const rulesMap = form.rules as Record<string, Array<Record<string, unknown>>>
    const keys = paths?.length ? paths : Object.keys(rulesMap)
    const errors: FormErrors = {}
    const values = form.getValues() as Record<string, unknown>

    await Promise.all(keys.map(async (path) => {
      const rules = rulesMap[path] ?? []
      const value = values[path]
      for (const rule of rules) {
        const required = Boolean(rule.required)
        if (required && (value == null || value === '')) {
          errors[path] = [String(rule.message ?? '必填')]
          break
        }
        const validator = rule.validator as
          | ((r: unknown, v: unknown) => void | Promise<void>)
          | undefined
        if (typeof validator === 'function') {
          try {
            await validator(rule, value)
          }
          catch (e) {
            errors[path] = [e instanceof Error ? e.message : String(e)]
            break
          }
        }
        const min = rule.min as number | undefined
        if (typeof min === 'number' && typeof value === 'string' && value.length < min) {
          errors[path] = [String(rule.message ?? `至少 ${min} 个字`)]
          break
        }
      }
    }))

    miniHost.fieldErrors = Object.fromEntries(
      Object.entries(errors).map(([k, v]) => [k, v[0] ?? '']),
    )

    if (Object.keys(errors).length)
      throw { errors }
  },
})

form.bindHost(miniHost)

const titleError = computed(() => miniHost.fieldErrors.title || '')
const ownerError = computed(() => miniHost.fieldErrors.owner || '')

async function onSubmit() {
  const res = await form.submit()
  if (!res.ok)
    log.value = `校验失败:\n${JSON.stringify(res.errors, null, 2)}`
}

function onReset() {
  form.reset()
  miniHost.clear()
  log.value = ''
}
</script>

<template>
  <div class="demo">
    <p class="hint">
      自定义 Adapter：宿主不是 el-form，而是自己的 miniHost。
      业务侧仍用 useForm / rules / submit。Naive 完整示例见 docs/custom-adapter.md。
    </p>

    <div class="mini-form">
      <label class="field">
        <span>标题</span>
        <input v-model="form.model.title" class="input" placeholder="至少 2 字">
        <span v-if="titleError" class="err">{{ titleError }}</span>
      </label>
      <label class="field">
        <span>负责人</span>
        <input v-model="form.model.owner" class="input" placeholder="必填">
        <span v-if="ownerError" class="err">{{ ownerError }}</span>
      </label>
      <div class="actions">
        <button type="button" class="btn primary" :disabled="form.submitting" @click="onSubmit">
          {{ form.submitting ? '提交中…' : '提交' }}
        </button>
        <button type="button" class="btn" @click="onReset">
          重置
        </button>
      </div>
    </div>

    <pre class="log">{{ log || '提交结果' }}</pre>

    <details class="code">
      <summary>Adapter 核心（精简）</summary>
      <pre>function createMiniAdapter(): FormHostAdapter {
  let host = null
  return {
    bind(instance) { host = instance },
    async validate(paths) {
      if (!host) return { valid: false, errors: { _form: ['未绑定'] } }
      try {
        await host.validate(paths)
        return { valid: true }
      } catch (e) {
        return { valid: false, errors: e.errors }
      }
    },
    clearValidate() { host?.clear() },
  }
}

useForm({ defaults, rules, adapter: createMiniAdapter() })
form.bindHost(miniHost)</pre>
    </details>
  </div>
</template>

<style scoped>
.hint { color: #909399; margin: 0 0 12px; line-height: 1.5; }
.mini-form {
  max-width: 420px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  font-size: 13px;
  color: #374151;
}
.input {
  height: 32px;
  padding: 0 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}
.input:focus {
  outline: none;
  border-color: #409eff;
}
.err { color: #f56c6c; font-size: 12px; }
.actions { display: flex; gap: 8px; }
.btn {
  height: 32px;
  padding: 0 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}
.btn.primary {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
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
.code {
  margin-top: 12px;
  font-size: 13px;
  color: #606266;
}
.code pre {
  margin: 8px 0 0;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.45;
}
</style>
