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

export interface RuleMessages {
  required: string
  email: string
  url: string
  min: (min: number) => string
  max: (max: number) => string
  len: (len: number) => string
  range: (min: number, max: number) => string
  number: string
  integer: string
  numberMin: (min: number) => string
  numberMax: (max: number) => string
  numberRange: (min: number, max: number) => string
  pattern: string
  phone: string
  idCard: string
  arrayRequired: string
  equalTo: string
}

export const zhCNRuleMessages: RuleMessages = {
  required: '必填',
  email: '邮箱格式不正确',
  url: 'URL 格式不正确',
  min: min => `至少 ${min} 个字符`,
  max: max => `最多 ${max} 个字符`,
  len: len => `长度须为 ${len}`,
  range: (min, max) => `长度 ${min}-${max}`,
  number: '请输入数字',
  integer: '请输入整数',
  numberMin: min => `不能小于 ${min}`,
  numberMax: max => `不能大于 ${max}`,
  numberRange: (min, max) => `范围 ${min}-${max}`,
  pattern: '格式不正确',
  phone: '手机号格式不正确',
  idCard: '身份证格式不正确',
  arrayRequired: '请至少选择一项',
  equalTo: '两次输入不一致',
}

export const enUSRuleMessages: RuleMessages = {
  required: 'Required',
  email: 'Enter a valid email address',
  url: 'Enter a valid URL',
  min: min => `Enter at least ${min} characters`,
  max: max => `Enter no more than ${max} characters`,
  len: len => `Enter exactly ${len} characters`,
  range: (min, max) => `Enter ${min}-${max} characters`,
  number: 'Enter a number',
  integer: 'Enter an integer',
  numberMin: min => `Must be at least ${min}`,
  numberMax: max => `Must be no more than ${max}`,
  numberRange: (min, max) => `Must be between ${min} and ${max}`,
  pattern: 'Invalid format',
  phone: 'Enter a valid phone number',
  idCard: 'Enter a valid ID card number',
  arrayRequired: 'Select at least one item',
  equalTo: 'Values do not match',
}

/**
 * Create an isolated rule-builder set with app-specific messages.
 * Instances are immutable and safe for SSR.
 */
export function createRuleBuilders(
  overrides: Partial<RuleMessages> = {},
) {
  const messages: RuleMessages = {
    ...zhCNRuleMessages,
    ...overrides,
  }

  return {
    required(message: string = messages.required, trigger: Trigger = 'blur'): RuleItem {
      return withTrigger({ required: true, message }, trigger)
    },

    email(message: string = messages.email, trigger: Trigger = 'blur'): RuleItem {
      return withTrigger({ type: 'email', message }, trigger)
    },

    url(message: string = messages.url, trigger: Trigger = 'blur'): RuleItem {
      return withTrigger({ type: 'url', message }, trigger)
    },

    min(min: number, message?: string, trigger: Trigger = 'blur'): RuleItem {
      return withTrigger({
        type: 'string',
        min,
        message: message ?? messages.min(min),
      }, trigger)
    },

    max(max: number, message?: string, trigger: Trigger = 'blur'): RuleItem {
      return withTrigger({
        type: 'string',
        max,
        message: message ?? messages.max(max),
      }, trigger)
    },

    len(len: number, message?: string, trigger: Trigger = 'blur'): RuleItem {
      return withTrigger({
        type: 'string',
        len,
        message: message ?? messages.len(len),
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
        message: message ?? messages.range(min, max),
      }, trigger)
    },

    number(message: string = messages.number, trigger: Trigger = 'blur'): RuleItem {
      return withTrigger({ type: 'number', message }, trigger)
    },

    integer(message: string = messages.integer, trigger: Trigger = 'blur'): RuleItem {
      return withTrigger({ type: 'integer', message }, trigger)
    },

    numberMin(min: number, message?: string, trigger: Trigger = 'change'): RuleItem {
      return withTrigger({
        type: 'number',
        min,
        message: message ?? messages.numberMin(min),
      }, trigger)
    },

    numberMax(max: number, message?: string, trigger: Trigger = 'change'): RuleItem {
      return withTrigger({
        type: 'number',
        max,
        message: message ?? messages.numberMax(max),
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
        message: message ?? messages.numberRange(min, max),
      }, trigger)
    },

    pattern(
      pattern: RegExp,
      message: string = messages.pattern,
      trigger: Trigger = 'blur',
    ): RuleItem {
      return withTrigger({ pattern, message }, trigger)
    },

    phone(message: string = messages.phone, trigger: Trigger = 'blur'): RuleItem {
      return withTrigger({
        pattern: /^1\d{10}$/,
        message,
      }, trigger)
    },

    idCard(message: string = messages.idCard, trigger: Trigger = 'blur'): RuleItem {
      return withTrigger({
        pattern: /^\d{15}$|^\d{17}[\dXx]$/,
        message,
      }, trigger)
    },

    arrayRequired(
      message: string = messages.arrayRequired,
      trigger: Trigger = 'change',
    ): RuleItem {
      return withTrigger({
        type: 'array',
        required: true,
        min: 1,
        message,
      }, trigger)
    },

    custom(
      validator: ValidatorFn,
      trigger: Trigger = 'blur',
      message?: string,
    ): RuleItem {
      return withTrigger({
        validator: (
          rule: RuleItem,
          value: unknown,
          callback: (error?: Error) => void,
        ) => {
          let settled = false
          const done = (error?: Error) => {
            if (settled)
              return
            settled = true
            callback(error)
          }
          try {
            const result = validator(rule, value, done)
            if (result && typeof (result as Promise<void>).then === 'function') {
              ;(result as Promise<void>)
                .then(() => done())
                .catch((error: unknown) => {
                  done(error instanceof Error
                    ? error
                    : new Error(message ?? String(error)))
                })
            }
          }
          catch (error) {
            done(error instanceof Error
              ? error
              : new Error(message ?? String(error)))
          }
        },
        message,
      }, trigger)
    },

    equalTo(
      getOther: () => unknown,
      message: string = messages.equalTo,
      trigger: Trigger = 'blur',
    ): RuleItem {
      return withTrigger({
        validator: (
          _rule: RuleItem,
          value: unknown,
          callback: (error?: Error) => void,
        ) => {
          if (value === getOther())
            callback()
          else
            callback(new Error(message))
        },
      }, trigger)
    },

    trimRequired(
      message: string = messages.required,
      trigger: Trigger = 'blur',
    ): RuleItem {
      return withTrigger({
        validator: (
          _rule: RuleItem,
          value: unknown,
          callback: (error?: Error) => void,
        ) => {
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
}

export type RuleBuilders = ReturnType<typeof createRuleBuilders>

/** Default Chinese-compatible builders retained for existing applications. */
export const ruleBuilders: RuleBuilders = createRuleBuilders()
