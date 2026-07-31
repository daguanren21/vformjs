import type { RuleItem } from './types'

type Trigger = string | string[]

function withTrigger(rule: RuleItem, trigger: Trigger = 'blur'): RuleItem {
  return { trigger, ...rule }
}

export type ValidatorFn = (
  rule: RuleItem,
  value: unknown,
  callback: (error?: Error) => void,
) => void | Promise<void>

/** Fluent / callable rule builders used by `r.*` and string sugar. */
export const ruleBuilders = {
  required(message = '必填', trigger: Trigger = 'blur'): RuleItem {
    return withTrigger({ required: true, message }, trigger)
  },

  email(message = '邮箱格式不正确', trigger: Trigger = 'blur'): RuleItem {
    return withTrigger({ type: 'email', message }, trigger)
  },

  url(message = 'URL 格式不正确', trigger: Trigger = 'blur'): RuleItem {
    return withTrigger({ type: 'url', message }, trigger)
  },

  min(min: number, message?: string, trigger: Trigger = 'blur'): RuleItem {
    return withTrigger({
      type: 'string',
      min,
      message: message ?? `至少 ${min} 个字符`,
    }, trigger)
  },

  max(max: number, message?: string, trigger: Trigger = 'blur'): RuleItem {
    return withTrigger({
      type: 'string',
      max,
      message: message ?? `最多 ${max} 个字符`,
    }, trigger)
  },

  len(len: number, message?: string, trigger: Trigger = 'blur'): RuleItem {
    return withTrigger({
      type: 'string',
      len,
      message: message ?? `长度须为 ${len}`,
    }, trigger)
  },

  range(
    min: number,
    max: number,
    message?: string,
    trigger: Trigger = 'blur',
  ): RuleItem {
    return withTrigger({
      type: 'string',
      min,
      max,
      message: message ?? `长度 ${min}-${max}`,
    }, trigger)
  },

  number(message = '请输入数字', trigger: Trigger = 'blur'): RuleItem {
    return withTrigger({ type: 'number', message }, trigger)
  },

  integer(message = '请输入整数', trigger: Trigger = 'blur'): RuleItem {
    return withTrigger({ type: 'integer', message }, trigger)
  },

  numberMin(min: number, message?: string, trigger: Trigger = 'change'): RuleItem {
    return withTrigger({
      type: 'number',
      min,
      message: message ?? `不能小于 ${min}`,
    }, trigger)
  },

  numberMax(max: number, message?: string, trigger: Trigger = 'change'): RuleItem {
    return withTrigger({
      type: 'number',
      max,
      message: message ?? `不能大于 ${max}`,
    }, trigger)
  },

  numberRange(
    min: number,
    max: number,
    message?: string,
    trigger: Trigger = 'change',
  ): RuleItem {
    return withTrigger({
      type: 'number',
      min,
      max,
      message: message ?? `范围 ${min}-${max}`,
    }, trigger)
  },

  pattern(
    pattern: RegExp,
    message = '格式不正确',
    trigger: Trigger = 'blur',
  ): RuleItem {
    return withTrigger({ pattern, message }, trigger)
  },

  phone(message = '手机号格式不正确', trigger: Trigger = 'blur'): RuleItem {
    return withTrigger({
      pattern: /^1\d{10}$/,
      message,
    }, trigger)
  },

  idCard(message = '身份证格式不正确', trigger: Trigger = 'blur'): RuleItem {
    return withTrigger({
      pattern: /^\d{15}$|^\d{17}[\dXx]$/,
      message,
    }, trigger)
  },

  /** Array / multi-select not empty */
  arrayRequired(message = '请至少选择一项', trigger: Trigger = 'change'): RuleItem {
    return withTrigger({
      type: 'array',
      required: true,
      min: 1,
      message,
    }, trigger)
  },

  /** Custom sync/async validator (async-validator style) */
  custom(
    validator: ValidatorFn,
    trigger: Trigger = 'blur',
    message?: string,
  ): RuleItem {
    return withTrigger({
      validator: (rule: RuleItem, value: unknown, callback: (error?: Error) => void) => {
        try {
          const result = validator(rule, value, callback)
          if (result && typeof (result as Promise<void>).then === 'function') {
            ;(result as Promise<void>)
              .then(() => callback())
              .catch((err: unknown) => {
                callback(err instanceof Error ? err : new Error(message ?? String(err)))
              })
          }
        }
        catch (err) {
          callback(err instanceof Error ? err : new Error(message ?? String(err)))
        }
      },
      message,
    }, trigger)
  },

  /** Cross-field equal (password confirm etc.) */
  equalTo(
    getOther: () => unknown,
    message = '两次输入不一致',
    trigger: Trigger = 'blur',
  ): RuleItem {
    return withTrigger({
      validator: (_rule: RuleItem, value: unknown, callback: (error?: Error) => void) => {
        if (value === getOther())
          callback()
        else
          callback(new Error(message))
      },
    }, trigger)
  },

  /** Reject if empty string after trim */
  trimRequired(message = '必填', trigger: Trigger = 'blur'): RuleItem {
    return withTrigger({
      validator: (_rule: RuleItem, value: unknown, callback: (error?: Error) => void) => {
        if (typeof value === 'string' && value.trim() === '')
          callback(new Error(message))
        else if (value == null || value === '')
          callback(new Error(message))
        else
          callback()
      },
    }, trigger)
  },
}

export type RuleBuilders = typeof ruleBuilders
