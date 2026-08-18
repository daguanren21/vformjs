import type {
  FieldPath,
  FormErrors,
  FormHostAdapter,
  HostValidateResult,
} from '@vformjs/core'

interface ElementPlusFormInstance {
  validate?: (callback?: (valid: boolean, fields?: unknown) => void) => Promise<void> | void
  validateField?: (
    props?: string | string[],
    callback?: (valid: boolean, fields?: unknown) => void,
  ) => Promise<void> | void
  clearValidate?: (props?: string | string[]) => void
  scrollToField?: (prop: string) => void
  resetFields?: (props?: string | string[]) => void
  /** Registered form items (Element Plus internal) */
  fields?: Array<{ prop?: string | string[], $el?: Element }>
}

function focusFirst(root?: Element): void {
  root?.querySelector<HTMLElement>(
    'input:not([disabled]),textarea:not([disabled]),select:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex="-1"])',
  )?.focus()
}

function fieldsToErrors(fields: unknown): FormErrors {
  if (!fields || typeof fields !== 'object')
    return {}
  const out: FormErrors = {}
  for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
    if (!Array.isArray(value))
      continue
    out[key] = value.map((item) => {
      if (item && typeof item === 'object' && 'message' in item)
        return String((item as { message: unknown }).message ?? 'Invalid')
      return String(item)
    })
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

function hostHasProp(host: ElementPlusFormInstance, path: string): boolean {
  const fields = host.fields
  // missing / non-array → unknown registry, let host decide
  if (!Array.isArray(fields))
    return true
  // empty array = zero FormItems — prop unregistered
  return fields.some((f) => {
    const prop = f?.prop
    if (Array.isArray(prop))
      return prop.map(String).join('.') === path
    return prop != null && String(prop) === path
  })
}

/** Low-level host bridge. Prefer `useElForm`. */
export function createElementPlusAdapter(): FormHostAdapter {
  let host: ElementPlusFormInstance | null = null

  const runValidate = async (paths?: FieldPath[]): Promise<HostValidateResult> => {
    if (!host) {
      return {
        valid: false,
        errors: { _form: ['Form host is not bound. Bind it with v-bind="form.host".'] },
      }
    }

    try {
      if (paths?.length && host.validateField) {
        // Skip props with no mounted FormItem — avoids hanging / false success
        const registered = paths.filter(p => hostHasProp(host!, p))
        if (!registered.length)
          return { valid: true }

        const { promise, resolve, reject } = deferred<void>()
        let settled = false
        const finish = (fn: () => void) => {
          if (settled)
            return
          settled = true
          fn()
        }
        const result = host.validateField(registered, (valid, fields) => {
          if (valid)
            finish(() => resolve())
          else
            finish(() => reject(fields))
        })
        // Element Plus returns a Promise that awaits async validators — prefer it
        if (result && typeof (result as Promise<void>).then === 'function') {
          ;(result as Promise<void>)
            .then(() => finish(() => resolve()))
            .catch(err => finish(() => reject(err)))
        }
        await promise
        return { valid: true }
      }

      if (typeof host.validate !== 'function')
        return { valid: true }

      const { promise, resolve, reject } = deferred<void>()
      let settled = false
      const finish = (fn: () => void) => {
        if (settled)
          return
        settled = true
        fn()
      }
      const result = host.validate((valid, fields) => {
        if (valid)
          finish(() => resolve())
        else
          finish(() => reject(fields))
      })
      if (result && typeof result.then === 'function') {
        result
          .then(() => finish(() => resolve()))
          .catch(err => finish(() => reject(err)))
      }
      await promise
      return { valid: true }
    }
    catch (fields) {
      return {
        valid: false,
        errors: fieldsToErrors(fields),
      }
    }
  }

  return {
    bind(instance: unknown) {
      host = (instance ?? null) as ElementPlusFormInstance | null
    },
    validate: runValidate,
    clearValidate(paths) {
      host?.clearValidate?.(paths)
    },
    scrollToField(path) {
      host?.scrollToField?.(path)
    },
    focusField(path) {
      const field = host?.fields?.find((item) => {
        if (Array.isArray(item.prop))
          return item.prop.map(String).join('.') === path
        return item.prop != null && String(item.prop) === path
      })
      focusFirst(field?.$el)
    },
    getItemProps(path, error) {
      return {
        prop: path,
        error,
        'data-vform-path': path,
      }
    },
    hostProps() {
      // Element Plus shares element-ui's `rules` watcher: with
      // `validateOnRuleChange` on, publishing rules after the first render
      // lights up every required field on a pristine form.
      return { validateOnRuleChange: false }
    },
    afterModelReset() {
      host?.clearValidate?.()
    },
  }
}
