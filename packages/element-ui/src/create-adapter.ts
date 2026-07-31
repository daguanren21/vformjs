import type {
  FieldPath,
  FormErrors,
  FormHostAdapter,
  HostValidateResult,
} from '@vformjs/core'

interface ElementUiFormInstance {
  validate?: (callback: (valid: boolean, fields?: unknown) => void) => void
  validateField?: (
    prop: string,
    callback?: (errorMessage?: string) => void,
  ) => void
  clearValidate?: (props?: string | string[]) => void
  /** Registered form items (element-ui internal) */
  fields?: Array<{ prop?: string }>
}

function fieldsToErrors(fields: unknown): FormErrors {
  if (!fields || typeof fields !== 'object')
    return {}
  const out: FormErrors = {}
  for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      out[key] = value.map((item) => {
        if (item && typeof item === 'object' && 'message' in item)
          return String((item as { message: unknown }).message ?? 'Invalid')
        return String(item)
      })
    }
    else if (typeof value === 'string') {
      out[key] = [value]
    }
  }
  return out
}

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function hostHasProp(host: ElementUiFormInstance, path: string): boolean {
  const fields = host.fields
  // missing / non-array → unknown registry, let host decide
  if (!Array.isArray(fields))
    return true
  // empty array is a real registry with zero FormItems — prop is unregistered
  return fields.some(f => f?.prop != null && String(f.prop) === path)
}

/**
 * Validate one prop. Skips unregistered props (no FormItem) so we never hang.
 * Does NOT race a microtask against async validators.
 */
function validateFieldSafe(
  host: ElementUiFormInstance,
  path: string,
): Promise<string | undefined> {
  if (!hostHasProp(host, path))
    return Promise.resolve(undefined)

  return new Promise((resolve) => {
    if (!host.validateField) {
      resolve(undefined)
      return
    }
    try {
      host.validateField(path, (errorMessage) => {
        resolve(errorMessage || undefined)
      })
    }
    catch {
      resolve(undefined)
    }
  })
}

/** Low-level host bridge. Prefer `useElForm`. */
export function createElementUiAdapter(): FormHostAdapter {
  let host: ElementUiFormInstance | null = null

  return {
    bind(instance: unknown) {
      host = (instance ?? null) as ElementUiFormInstance | null
    },
    async validate(paths?: FieldPath[]): Promise<HostValidateResult> {
      if (!host) {
        return {
          valid: false,
          errors: { _form: ['Form host is not bound. Use <el-form v-bind="form.el">.'] },
        }
      }

      if (!paths?.length) {
        if (typeof host.validate !== 'function')
          return { valid: true }
        const { promise, resolve } = deferred<HostValidateResult>()
        host.validate((valid, fields) => {
          if (valid)
            resolve({ valid: true })
          else
            resolve({ valid: false, errors: fieldsToErrors(fields) })
        })
        return await promise
      }

      const errors: FormErrors = {}
      for (const path of paths) {
        // sequential: element-ui validateField is per-prop
        // eslint-disable-next-line no-await-in-loop
        const message = await validateFieldSafe(host, path)
        if (message)
          errors[path] = [message]
      }
      const valid = Object.keys(errors).length === 0
      return valid ? { valid: true } : { valid: false, errors }
    },
    clearValidate(paths) {
      host?.clearValidate?.(paths)
    },
    afterModelReset() {
      host?.clearValidate?.()
    },
  }
}
