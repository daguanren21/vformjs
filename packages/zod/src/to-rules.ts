import type { FormRulesMap, RuleItem } from '@vformjs/core'
import { deepClone, getByPath } from '@vformjs/core'
import type { ZodObject, ZodType } from 'zod'

type Trigger = string | string[]

export interface ZodToRulesOptions {
  getValues: () => Record<string, unknown>
  trigger?: Trigger | ((path: string) => Trigger)
  deep?: boolean
  arrays?: boolean
}

function isZodObject(schema: ZodType): schema is ZodObject<Record<string, ZodType>> {
  return typeof (schema as { shape?: unknown }).shape === 'object'
    && (schema as { shape?: unknown }).shape != null
}

function schemaType(schema: ZodType): string {
  return String((schema as any)?.type ?? (schema as any)?._def?.type ?? '')
}

function isZodArray(schema: ZodType): boolean {
  return schemaType(unwrap(schema)) === 'array'
}

function arrayElement(schema: ZodType): ZodType | undefined {
  const core: any = unwrap(schema)
  return core.element ?? core._def?.element ?? core._def?.type
}

function unwrap(schema: ZodType): ZodType {
  let cur: any = schema
  for (let i = 0; i < 8; i++) {
    const type = cur?.type ?? cur?._def?.type
    if (
      type === 'optional'
      || type === 'nullable'
      || type === 'default'
      || type === 'catch'
      || type === 'readonly'
      || type === 'nonoptional'
    ) {
      cur = cur.unwrap?.() ?? cur._def?.innerType ?? cur
      continue
    }
    if (type === 'pipe') {
      cur = cur.in ?? cur._def?.in ?? cur
      continue
    }
    if (type === 'effects' || type === 'transform' || type === 'refine') {
      cur = cur.innerType?.() ?? cur._def?.schema ?? cur
      continue
    }
    break
  }
  return cur as ZodType
}

function isOptionalish(schema: ZodType): boolean {
  let cur: any = schema
  for (let i = 0; i < 6; i++) {
    const type = cur?.type ?? cur?._def?.type
    if (type === 'optional' || type === 'default' || type === 'catch')
      return true
    if (type === 'nullable' || type === 'readonly' || type === 'pipe' || type === 'effects') {
      cur = cur.unwrap?.()
        ?? cur.innerType?.()
        ?? cur.in
        ?? cur._def?.innerType
        ?? cur._def?.schema
        ?? cur
      continue
    }
    break
  }
  return false
}

function pathKey(path: PropertyKey[]): string {
  return path.map(String).join('.')
}

function issueMatchesField(issuePath: PropertyKey[], fieldPath: string): boolean {
  const key = pathKey(issuePath)
  if (!key)
    return false
  return key === fieldPath
    || key.startsWith(`${fieldPath}.`)
    || fieldPath.startsWith(`${key}.`)
}

function isRootIssue(issuePath: PropertyKey[]): boolean {
  return !issuePath.length
}

export function createSharedZodParser(
  schema: ZodType,
  getValues: () => Record<string, unknown>,
) {
  let wave: {
    base: Record<string, unknown>
    full: ReturnType<ZodType['safeParse']> | null
  } | null = null

  const ensureWave = () => {
    if (!wave)
      wave = { base: deepClone(getValues()) as Record<string, unknown>, full: null }
    return wave
  }

  return {
    parseField(fieldPath: string, value: unknown) {
      const w = ensureWave()
      const modelVal = getByPath(w.base, fieldPath)
      if (Object.is(modelVal, value)) {
        if (!w.full)
          w.full = schema.safeParse(w.base)
        return w.full
      }
      const draft = deepClone(w.base) as Record<string, unknown>
      setByPath(draft, fieldPath, value)
      return schema.safeParse(draft)
    },
    invalidate() {
      wave = null
    },
  }
}

export type SharedZodParser = ReturnType<typeof createSharedZodParser>

export function collectZodFieldPaths(
  schema: ZodType,
  deep: boolean,
  prefix = '',
  arrays = false,
  values?: Record<string, unknown>,
): string[] {
  if (!isZodObject(schema))
    return prefix ? [prefix] : []

  const shape = schema.shape
  const paths: string[] = []
  for (const key of Object.keys(shape)) {
    const path = prefix ? `${prefix}.${key}` : key
    const fieldSchema = shape[key]!
    const core = unwrap(fieldSchema)

    if (arrays && isZodArray(core)) {
      const el = arrayElement(core)
      if (el && isZodObject(unwrap(el))) {
        const list = values ? getByPath(values, path) : undefined
        const len = Array.isArray(list) ? list.length : 0
        for (let i = 0; i < len; i++) {
          paths.push(
            ...collectZodFieldPaths(
              unwrap(el) as ZodObject<Record<string, ZodType>>,
              deep,
              `${path}.${i}`,
              arrays,
              values,
            ),
          )
        }
        continue
      }
      paths.push(path)
      continue
    }

    if (deep && isZodObject(core)) {
      paths.push(...collectZodFieldPaths(core, deep, path, arrays, values))
    }
    else {
      paths.push(path)
    }
  }
  return paths
}

export function arrayLengthSignature(
  schema: ZodType,
  values: Record<string, unknown>,
  prefix = '',
): string {
  if (!isZodObject(schema))
    return ''
  const parts: string[] = []
  for (const key of Object.keys(schema.shape)) {
    const path = prefix ? `${prefix}.${key}` : key
    const fieldSchema = schema.shape[key]!
    const core = unwrap(fieldSchema)
    if (isZodArray(core)) {
      const list = getByPath(values, path)
      const len = Array.isArray(list) ? list.length : 0
      parts.push(`${path}:${len}`)
      const el = arrayElement(core)
      if (el && isZodObject(unwrap(el)) && Array.isArray(list)) {
        for (let i = 0; i < list.length; i++) {
          const item = list[i]
          if (item && typeof item === 'object') {
            parts.push(
              arrayLengthSignature(
                unwrap(el) as ZodObject<Record<string, ZodType>>,
                item as Record<string, unknown>,
                `${path}.${i}`,
              ),
            )
          }
        }
      }
    }
    else if (isZodObject(core)) {
      const nested = getByPath(values, path)
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        parts.push(
          arrayLengthSignature(core, nested as Record<string, unknown>, path),
        )
      }
    }
  }
  return parts.filter(Boolean).join('|')
}

function shouldDeep(schema: ZodType, deep: boolean | undefined): boolean {
  if (deep != null)
    return deep
  if (!isZodObject(schema))
    return false
  for (const key of Object.keys(schema.shape)) {
    const core = unwrap(schema.shape[key]!)
    if (isZodObject(core) || isZodArray(core))
      return true
  }
  return false
}

function resolveTrigger(
  path: string,
  fieldSchema: ZodType,
  trigger: ZodToRulesOptions['trigger'],
): Trigger {
  if (typeof trigger === 'function')
    return trigger(path)
  if (trigger)
    return trigger
  const typeName = schemaType(unwrap(fieldSchema))
  if (typeName === 'string' || typeName === 'email' || typeName === 'url' || typeName === 'pipe')
    return 'blur'
  return 'change'
}

function setByPath(target: Record<string, unknown>, path: string, value: unknown) {
  const segs = path.split('.')
  let cur: any = target
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i]!
    if (cur[seg] == null || typeof cur[seg] !== 'object')
      cur[seg] = /^\d+$/.test(segs[i + 1]!) ? [] : {}
    cur = cur[seg]
  }
  cur[segs[segs.length - 1]!] = value
}

function fieldSchemaAtPath(
  schema: ZodType,
  fieldPath: string,
): ZodType | undefined {
  if (!isZodObject(schema))
    return undefined
  const segs = fieldPath.split('.')
  let cur: ZodType = schema
  for (const seg of segs) {
    if (isZodArray(cur)) {
      const el = arrayElement(cur)
      if (!el)
        return undefined
      cur = el
      if (!/^\d+$/.test(seg))
        return undefined
      continue
    }
    if (!isZodObject(cur))
      return undefined
    const next = cur.shape[seg]
    if (!next)
      return undefined
    cur = next
  }
  return cur
}

export function zodToRules(
  schema: ZodType,
  options: ZodToRulesOptions & { parser?: SharedZodParser },
): FormRulesMap {
  if (!isZodObject(schema)) {
    throw new Error('[vformjs/zod] zodToRules expects a ZodObject schema')
  }

  const deep = shouldDeep(schema, options.deep)
  const arrays = options.arrays !== false
  const live = arrays ? options.getValues() : undefined
  const fieldPaths = collectZodFieldPaths(schema, deep, '', arrays, live)
  const rules: FormRulesMap = {}
  const parser = options.parser
  const firstFieldPath = fieldPaths[0]

  for (const fieldPath of fieldPaths) {
    const fieldSchema = fieldSchemaAtPath(schema, fieldPath) ?? schema
    const optional = isOptionalish(fieldSchema)
    const trigger = resolveTrigger(fieldPath, fieldSchema, options.trigger)

    const item: RuleItem = {
      required: !optional,
      trigger,
      validator: (_rule: RuleItem, value: unknown) => {
        try {
          const parsed = parser
            ? parser.parseField(fieldPath, value)
            : (() => {
                const base = deepClone(options.getValues()) as Record<string, unknown>
                setByPath(base, fieldPath, value)
                return schema.safeParse(base)
              })()

          if (parsed.success)
            return Promise.resolve()

          const issues = parsed.error.issues
          const match = issues.find(issue => issueMatchesField(issue.path, fieldPath))
          if (match)
            return Promise.reject(new Error(match.message))

          if (firstFieldPath === fieldPath) {
            const root = issues.find(issue => isRootIssue(issue.path))
            if (root)
              return Promise.reject(new Error(root.message))
          }

          return Promise.resolve()
        }
        catch (err) {
          return Promise.reject(err instanceof Error ? err : new Error(String(err)))
        }
      },
    }
    rules[fieldPath] = [item]
  }

  return rules
}

export function zodToRulesDeep(
  schema: ZodType,
  options: Omit<ZodToRulesOptions, 'deep'> & { getValues: () => Record<string, unknown> },
): FormRulesMap {
  return zodToRules(schema, { ...options, deep: true })
}

export function zodIssuesToFormErrors(
  error: { issues: Array<{ path: PropertyKey[], message: string }> },
  fallbackPath = '_form',
): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const path = pathKey(issue.path) || fallbackPath
    if (!out[path])
      out[path] = []
    out[path]!.push(issue.message)
  }
  return out
}
