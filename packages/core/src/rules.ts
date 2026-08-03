import { ruleBuilders } from './rule-builders'
import type {
  FormRulesInput,
  FormRulesMap,
  RuleInput,
  RuleItem,
  RulePatternContext,
  RulesSource,
} from './types'
import { getByPath, isObjectLike } from './vendor/shared'
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

/** Expand `members.*.name` against the current model. */
export function expandPathPattern(values: unknown, pattern: string): string[] {
  if (!pattern.includes('*'))
    return [pattern]

  const segments = pattern.split('.')
  const paths: string[] = []

  const visit = (
    current: unknown,
    segmentIndex: number,
    concrete: string[],
  ) => {
    const segment = segments[segmentIndex]!
    const last = segmentIndex === segments.length - 1

    if (segment === '*') {
      if (!isObjectLike(current))
        return
      if (Array.isArray(current)) {
        for (let index = 0; index < current.length; index++) {
          const key = String(index)
          const nextPath = [...concrete, key]
          if (last)
            paths.push(nextPath.join('.'))
          else
            visit(current[index], segmentIndex + 1, nextPath)
        }
        return
      }
      for (const key of Object.keys(current)) {
        const nextPath = [...concrete, key]
        if (last)
          paths.push(nextPath.join('.'))
        else
          visit(current[key], segmentIndex + 1, nextPath)
      }
      return
    }

    const nextPath = [...concrete, segment]
    if (last) {
      paths.push(nextPath.join('.'))
      return
    }
    const next = isObjectLike(current)
      ? current[segment]
      : undefined
    visit(next, segmentIndex + 1, nextPath)
  }

  visit(values, 0, [])
  return paths
}

export function createRulePatternContext<T extends object>(
  values: T,
  pattern: string,
  path: string,
): RulePatternContext<T> {
  const patternSegments = pattern.split('.')
  const pathSegments = path.split('.')
  const wildcardPositions: number[] = []
  const wildcards: string[] = []
  for (let index = 0; index < patternSegments.length; index++) {
    if (patternSegments[index] !== '*')
      continue
    wildcardPositions.push(index)
    wildcards.push(pathSegments[index] ?? '')
  }

  const lastWildcard = wildcardPositions.at(-1)
  const lastMatch = wildcards.at(-1)
  const numericIndex = lastMatch !== undefined && /^\d+$/.test(lastMatch)
    ? Number(lastMatch)
    : undefined
  const itemPath = lastWildcard === undefined
    ? undefined
    : pathSegments.slice(0, lastWildcard + 1).join('.')

  return {
    values,
    pattern,
    path,
    wildcards,
    index: numericIndex,
    item: itemPath === undefined ? undefined : getByPath(values, itemPath),
    value: getByPath(values, path),
  }
}

/** Materialize wildcard authoring rules into concrete host paths. */
export function materializeRulesMap(
  map: FormRulesMap,
  values: unknown,
): FormRulesMap {
  const entries = Object.entries(map)
    .map(([pattern, rules], order) => ({
      pattern,
      rules,
      order,
      wildcardCount: pattern.split('*').length - 1,
    }))
    // General patterns first; more specific rules overwrite them.
    .sort((left, right) =>
      right.wildcardCount - left.wildcardCount
      || left.order - right.order,
    )
  const out: FormRulesMap = {}
  for (const { pattern, rules } of entries) {
    for (const path of expandPathPattern(values, pattern))
      out[path] = rules
  }
  return out
}

export function resolveRulesSource<T extends object>(
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
  values?: unknown,
): FormRulesMap {
  const out: FormRulesMap = { ...base }
  for (const [pattern, rules] of overrides) {
    const paths = values === undefined
      ? [pattern]
      : expandPathPattern(values, pattern)
    for (const path of paths) {
      if (rules == null)
        delete out[path]
      else
        out[path] = rules
    }
  }
  return out
}

export { ruleBuilders }
