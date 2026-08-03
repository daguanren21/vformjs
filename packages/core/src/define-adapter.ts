import type {
  FieldPath,
  FormErrors,
  FormItemBinding,
  FormHostAdapter,
  FormValidationContext,
  HostValidateResult,
} from './types'

export interface AdapterValidateContext extends FormValidationContext {
  /** Partial validate paths from form.validate(['a','b']). Empty = whole form. */
  paths?: FieldPath[]
}

export interface DefineAdapterOptions<THost = unknown> {
  /**
   * Adapter id for logs / debugging.
   * e.g. 'naive-ui' | 'ant-design-vue'
   */
  name?: string

  /**
   * Run host validation.
   *
   * - resolve / return void | { valid: true } → success
   * - return { valid: false, errors } → fail with those errors
   * - throw → fail; errors come from mapErrors (default smart normalize)
   *
   * You only call the UI library API here. No bind bookkeeping.
   */
  validate: (
    host: THost,
    ctx: AdapterValidateContext,
  ) => void | HostValidateResult | Promise<void | HostValidateResult>

  /** Clear host field errors (e.g. restoreValidation / clearValidate). */
  clearValidate?: (host: THost, paths?: FieldPath[]) => void

  scrollToField?: (host: THost, path: FieldPath) => void
  itemProps?: (path: FieldPath, error?: string) => FormItemBinding

  /** After form.reset / load('create'). Usually same as clearValidate. */
  afterModelReset?: (host: THost) => void

  /**
   * Turn thrown values into FormErrors.
   * Default: normalizeHostErrors (async-validator / Naive / common shapes).
   */
  mapErrors?: (err: unknown) => FormErrors

  /** Message when validate runs before bindHost. */
  unboundMessage?: string
}

export type DefineAdapterFactory<_THost = unknown> = () => FormHostAdapter & {
  /** Dev-only name */
  readonly __adapterName?: string
}

/** Success helper (optional sugar). */
export function adapterOk(): HostValidateResult {
  return { valid: true }
}

/** Failure helper when you already have path → messages. */
export function adapterFail(errors: FormErrors): HostValidateResult {
  return { valid: false, errors }
}

/**
 * Normalize common UI / async-validator error payloads into FormErrors.
 *
 * Handles:
 * - ValidateError[][]  (Naive Form reject)
 * - ValidateError[]
 * - { field|path|key, message } objects
 * - Record<path, string | string[] | { message }[]>
 * - Error / string
 */
export function normalizeHostErrors(err: unknown): FormErrors {
  if (err == null)
    return { _form: ['校验失败'] }

  if (typeof err === 'string')
    return { _form: [err] }

  if (err instanceof Error)
    return { _form: [err.message || '校验失败'] }

  const out: FormErrors = {}

  const push = (path: string, message: string) => {
    const key = path || '_form'
    if (!out[key])
      out[key] = []
    out[key]!.push(message)
  }

  const takeItem = (item: unknown) => {
    if (item == null)
      return
    if (typeof item === 'string') {
      push('_form', item)
      return
    }
    if (item instanceof Error) {
      push('_form', item.message || '校验失败')
      return
    }
    if (typeof item !== 'object') {
      push('_form', String(item))
      return
    }
    const o = item as Record<string, unknown>
    const path = String(
      o.field
      ?? o.path
      ?? o.key
      ?? (Array.isArray(o.fieldPath) ? o.fieldPath.map(String).join('.') : '')
      ?? '_form',
    )
    const message = String(o.message ?? o.msg ?? '校验失败')
    push(path === '' ? '_form' : path, message)
  }

  // Nested arrays: ValidateError[][]
  if (Array.isArray(err)) {
    for (const group of err) {
      if (Array.isArray(group)) {
        for (const item of group)
          takeItem(item)
      }
      else {
        takeItem(group)
      }
    }
    if (!Object.keys(out).length)
      out._form = ['校验失败']
    return out
  }

  // Record<path, messages>
  // Record / entity objects
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>

    // Ant Design Vue: { errorFields: [{ name, errors }] }
    if (Array.isArray(o.errorFields)) {
      for (const item of o.errorFields) {
        if (!item || typeof item !== 'object')
          continue
        const row = item as { name?: unknown, errors?: unknown }
        const path = Array.isArray(row.name)
          ? row.name.map(String).join('.')
          : String(row.name ?? '_form')
        const messages = Array.isArray(row.errors)
          ? row.errors.map(String)
          : [String(row.errors ?? '校验失败')]
        for (const message of messages)
          push(path || '_form', message)
      }
      if (Object.keys(out).length)
        return out
    }

    // Single error object with field+message
    if ('message' in o && ('field' in o || 'path' in o || 'key' in o)) {
      takeItem(o)
      return Object.keys(out).length ? out : { _form: ['校验失败'] }
    }

    for (const [key, value] of Object.entries(o)) {
      if (key === 'values' || key === 'outOfDate' || key === 'errorFields')
        continue
      if (value == null)
        continue
      if (typeof value === 'string') {
        push(key, value)
        continue
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string')
            push(key, item)
          else if (item && typeof item === 'object' && 'message' in (item as object))
            push(key, String((item as { message: unknown }).message ?? '校验失败'))
          else
            takeItem(item)
        }
        continue
      }
      if (typeof value === 'object' && 'message' in (value as object)) {
        push(key, String((value as { message: unknown }).message ?? '校验失败'))
        continue
      }
    }
    if (Object.keys(out).length)
      return out
  }

  return { _form: ['校验失败'] }
}

/**
 * Plugin-style host adapter factory (similar mental model to vite plugins:
 * declare name + a few hooks, framework handles lifecycle).
 *
 * ```ts
 * export const createNaiveAdapter = defineAdapter<FormInst>({
 *   name: 'naive-ui',
 *   async validate(host, { paths }) {
 *     if (paths?.length) {
 *       const set = new Set(paths)
 *       await host.validate(undefined, rule => {
 *         const f = String(rule.key ?? rule.field ?? '')
 *         return !f || set.has(f)
 *       })
 *     } else {
 *       await host.validate()
 *     }
 *   },
 *   clearValidate(host) { host.restoreValidation() },
 *   afterModelReset(host) { host.restoreValidation() },
 * })
 *
 * // usage
 * const form = useForm({ adapter: createNaiveAdapter(), defaultValues, rules })
 * // <n-form v-bind="form.host">...</n-form>
 * // <n-form-item v-bind="form.item('name')">...</n-form-item>
 */
export function defineAdapter<THost = unknown>(
  options: DefineAdapterOptions<THost>,
): DefineAdapterFactory<THost> {
  const mapErrors = options.mapErrors ?? normalizeHostErrors
  const unboundMessage = options.unboundMessage
    ?? (options.name
      ? `[${options.name}] form host is not bound. Bind it with v-bind="form.host".`
      : 'Form host is not bound. Bind it with v-bind="form.host".')

  return function createAdapter() {
    let host: THost | null = null

    const adapter: FormHostAdapter & { __adapterName?: string } = {
      bind(instance: unknown) {
        host = (instance as THost | null) ?? null
      },

      async validate(
        paths?: FieldPath[],
        validation?: FormValidationContext,
      ): Promise<HostValidateResult> {
        if (host == null) {
          return {
            valid: false,
            errors: { _form: [unboundMessage] },
            unbound: true,
          }
        }

        try {
          const ctx: AdapterValidateContext = {
            signal: validation?.signal ?? new AbortController().signal,
            validationId: validation?.validationId ?? 0,
          }
          if (paths?.length)
            ctx.paths = paths
          const result = await options.validate(host, ctx)
          if (result && typeof result === 'object' && 'valid' in result)
            return result
          return { valid: true }
        }
        catch (err) {
          return {
            valid: false,
            errors: mapErrors(err),
          }
        }
      },

      clearValidate(paths?: FieldPath[]) {
        if (host == null || !options.clearValidate)
          return
        options.clearValidate(host, paths)
      },

      scrollToField(path: FieldPath) {
        if (host == null || !options.scrollToField)
          return
        options.scrollToField(host, path)
      },

      getItemProps(path, error) {
        return options.itemProps?.(path, error)
          ?? { 'data-vform-path': path }
      },

      afterModelReset() {
        if (host == null)
          return
        if (options.afterModelReset)
          options.afterModelReset(host)
        else if (options.clearValidate)
          options.clearValidate(host)
      },
    }

    if (options.name != null)
      adapter.__adapterName = options.name

    return adapter
  }
}
