import type {
  FieldArrayApi,
  UseApplicationFormReturn,
} from '@vformjs/element-plus'

export type EntryMode = 'single' | 'matrix'

export interface VariantRow {
  code: string
  color: string
  notes: string
}

export interface EditorValues {
  summary: {
    code: string
    notes: string
    mode: EntryMode
  }
  attributes: {
    category: string
  }
  single: {
    code: string
  }
  variants: VariantRow[]
}

export interface SaveError {
  kind: 'DuplicateCode'
}

export type EditorForm = UseApplicationFormReturn<
  EditorValues,
  SaveError
>

export type VariantList = FieldArrayApi<VariantRow>
