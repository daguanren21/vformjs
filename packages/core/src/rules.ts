import { ruleBuilders } from './rule-builders'
import type { FormRulesInput, FormRulesMap, RuleInput, RuleItem, RulesSource } from './types'
const STATIC_STRING_RULES: Record<string, () => RuleItem> = {
  required: () => ruleBuilders.required(),
  requiredIf: () => ruleBuilders.required(),
  email: () => ruleBuilders.email(),
  url: () => ruleBuilders.url(),
  phone: () => ruleBuilders.phone(),
  idCard: () => ruleBuilders.idCard(),
  number: () => ruleBuilders.number(),
  integer: () => ruleBuilders.integer(),
  arrayRequired: () => ruleBuilders.arrayRequired(),
  trimRequired: () => ruleBuilders.trimRequired(),
}

function parseSugar(item: string): RuleItem | null {
  if (!item.includes(':')) {
    const factory = STATIC_STRING_RULES[item]
    return factory ? factory() : null
  }

  const [name, ...rest] = item.split(':')
  const arg = rest.join(':')
  switch (name) {
    case 'stringMin':
    case 'min':
      return ruleBuilders.min(Number(arg))
    case 'stringMax':
    case 'max':
      return ruleBuilders.max(Number(arg))
    case 'len':
      return ruleBuilders.len(Number(arg))
    case 'numberMin':
      return ruleBuilders.numberMin(Number(arg))
    case 'numberMax':
      return ruleBuilders.numberMax(Number(arg))
    case 'range': {
      const [a, b] = arg.split(',').map(Number)
      return ruleBuilders.range(a ?? 0, b ?? 0)
    }
    case 'numberRange': {
      const [a, b] = arg.split(',').map(Number)
      return ruleBuilders.numberRange(a ?? 0, b ?? 0)
    }
    case 'pattern':
      return ruleBuilders.pattern(new RegExp(arg))
    default:
      return null
  }
}

export function normalizeRuleInput(input: RuleInput): RuleItem[] {
  if (input == null)
    return []
  const list = Array.isArray(input) ? input : [input]
  const out: RuleItem[] = []
  for (const item of list) {
    if (typeof item === 'string') {
      const rule = parseSugar(item)
      if (!rule) {
        throw new Error(
          `[vformjs] unknown rule "${item}". `
          + `Use r.required / r.email / r.custom(...) or RuleItem objects.`,
        )
      }
      out.push(rule)
      continue
    }
    out.push(item)
  }
  return out
}

export function normalizeRulesMap(map: FormRulesInput | FormRulesMap | undefined): FormRulesMap {
  if (!map)
    return {}
  const out: FormRulesMap = {}
  for (const [key, value] of Object.entries(map))
    out[key] = normalizeRuleInput(value as RuleInput)
  return out
}

export function resolveRulesSource<T extends Record<string, unknown>>(
  source: RulesSource<T> | undefined,
  values: T,
): FormRulesMap {
  if (!source)
    return {}
  if (typeof source === 'function')
    return normalizeRulesMap(source(values))
  return normalizeRulesMap(source)
}

export function mergeFieldRules(
  base: FormRulesMap,
  overrides: Map<string, RuleItem[] | null>,
): FormRulesMap {
  const out: FormRulesMap = { ...base }
  for (const [path, rules] of overrides) {
    if (rules == null)
      delete out[path]
    else
      out[path] = rules
  }
  return out
}

export { ruleBuilders }
