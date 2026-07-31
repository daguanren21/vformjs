/**
 * Schema compiler — Phase P6.
 * defineFormSchema will compile defaults + rules + linkage + field meta.
 */
export interface FormFieldSchema {
  prop: string
  label?: string
  default?: unknown
  rules?: unknown
  hidden?: boolean | ((ctx: { get: (path: string) => unknown }) => boolean)
  disabled?: boolean | ((ctx: { get: (path: string) => unknown }) => boolean)
  component?: string
  props?: Record<string, unknown>
  options?: unknown
  colSpan?: number
}

export function defineFormSchema<T extends FormFieldSchema[]>(fields: T): T {
  return fields
}
