import { NodeTypes, baseParse } from '@vue/compiler-dom'
import { parse as parseSfc } from '@vue/compiler-sfc'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, relative, resolve } from 'node:path'
import { collectSourceFiles } from './source-files'

export type FormAuditLabel =
  | 'conditional'
  | 'custom-host'
  | 'dynamic-array'
  | 'external-model'
  | 'multi-host'
  | 'options-api'
  | 'schema'
  | 'single-host'
  | 'vformjs'

export type FormMigrationDisposition = 'mechanical' | 'manual'

export interface FormAuditRecord {
  file: string
  line: number
  hosts: string[]
  labels: FormAuditLabel[]
  migration: FormMigrationDisposition
  evidence: string[]
}

export interface FormAuditReport {
  root: string
  filesScanned: number
  formsFound: number
  mechanical: number
  manual: number
  summary: Partial<Record<FormAuditLabel, number>>
  forms: FormAuditRecord[]
}

export interface FormAuditOptions {
  reportPath?: string
}

interface TemplateLocation {
  start: { offset: number }
  source: string
}

interface TemplateProp {
  type: number
  name?: string
  arg?: { content?: string }
  exp?: { content?: string }
  loc: TemplateLocation
}

interface TemplateElement {
  type: number
  tag: string
  loc: TemplateLocation
  props: TemplateProp[]
  children: unknown[]
}

interface TemplateSignal {
  source: string
  offset: number
  expression: string | undefined
}

interface TemplateAudit {
  hosts: Array<{
    tag: string
    offset: number
  }>
  conditional?: TemplateSignal
  dynamicArray?: TemplateSignal
  modelBindings: TemplateSignal[]
}

const STANDARD_HOSTS: Record<string, true> = {
  AForm: true,
  ElForm: true,
  NForm: true,
  'a-form': true,
  'el-form': true,
  'n-form': true,
}
const STANDARD_FORM_ITEMS: Record<string, true> = {
  AFormItem: true,
  ElFormItem: true,
  NFormItem: true,
  'a-form-item': true,
  'el-form-item': true,
  'n-form-item': true,
}
const CUSTOM_FORM_HOST = /^[A-Z][\w$]*Form$/
const CUSTOM_FORM_ITEM = /^[A-Z][\w$]*FormItem$/
const MANUAL_LABELS: Partial<Record<FormAuditLabel, true>> = {
  conditional: true,
  'custom-host': true,
  'dynamic-array': true,
  'external-model': true,
  'multi-host': true,
  'options-api': true,
}

function lineAt(source: string, offset: number): number {
  let line = 1
  for (let index = 0; index < offset; index += 1) {
    if (source.charCodeAt(index) === 10)
      line += 1
  }
  return line
}

function collectTemplateElements(root: unknown): TemplateElement[] {
  const elements: TemplateElement[] = []
  const seen = new Set<object>()
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object' || seen.has(node))
      return
    seen.add(node)
    const record = node as Record<string, unknown>
    if (record.type === NodeTypes.ELEMENT) {
      const element = node as TemplateElement
      elements.push(element)
    }
    for (const key of ['children', 'branches']) {
      const children = record[key]
      if (Array.isArray(children)) {
        for (const child of children)
          visit(child)
      }
    }
  }
  visit(root)
  return elements
}

function inspectFormSubtree(
  form: TemplateElement,
  templateOffset: number,
): Pick<TemplateAudit, 'conditional' | 'dynamicArray' | 'modelBindings'> {
  const result: Pick<TemplateAudit, 'conditional' | 'dynamicArray' | 'modelBindings'> = {
    modelBindings: [],
  }
  const visit = (element: TemplateElement, root: boolean): boolean => {
    if (
      !root
      && (STANDARD_HOSTS[element.tag] || CUSTOM_FORM_HOST.test(element.tag))
    ) {
      return false
    }

    let containsFormItem = Boolean(STANDARD_FORM_ITEMS[element.tag])
      || CUSTOM_FORM_ITEM.test(element.tag)
    for (const child of element.children) {
      if (
        !child
        || typeof child !== 'object'
        || !('type' in child)
        || child.type !== NodeTypes.ELEMENT
      ) {
        continue
      }
      const childElement = child as TemplateElement
      if (visit(childElement, false))
        containsFormItem = true
    }

    for (const prop of element.props) {
      if (prop.type !== NodeTypes.DIRECTIVE)
        continue
      const signal = {
        source: prop.loc.source,
        offset: templateOffset + prop.loc.start.offset,
        expression: prop.exp?.content,
      }
      if (
        root
        && (
          (prop.name === 'bind' && prop.arg?.content === 'model')
          || prop.name === 'model'
        )
      ) {
        result.modelBindings.push(signal)
      }
      if (!root && containsFormItem && !result.conditional && (prop.name === 'if' || prop.name === 'show'))
        result.conditional = signal
      if (!root && containsFormItem && !result.dynamicArray && prop.name === 'for')
        result.dynamicArray = signal
    }
    return containsFormItem
  }

  visit(form, true)
  return result
}

function auditTemplate(file: string, source: string): TemplateAudit {
  if (extname(file) !== '.vue') {
    const hosts = [...source.matchAll(/<(a-form|el-form|n-form|[A-Z][\w$]*Form)(?=[\s/>])/g)]
      .map(match => ({ tag: match[1]!, offset: match.index }))
    return { hosts, modelBindings: [] }
  }

  try {
    const descriptor = parseSfc(source, { filename: file }).descriptor
    const template = descriptor.template
    if (!template)
      return { hosts: [], modelBindings: [] }
    const root = baseParse(template.content)
    const elements = collectTemplateElements(root)
    const formElements = elements.filter(element =>
      STANDARD_HOSTS[element.tag] || CUSTOM_FORM_HOST.test(element.tag),
    )
    const result: TemplateAudit = {
      hosts: formElements.map(element => ({
        tag: element.tag,
        offset: template.loc.start.offset + element.loc.start.offset,
      })),
      modelBindings: [],
    }
    for (const form of formElements) {
      const formResult = inspectFormSubtree(form, template.loc.start.offset)
      if (!result.conditional && formResult.conditional)
        result.conditional = formResult.conditional
      if (!result.dynamicArray && formResult.dynamicArray)
        result.dynamicArray = formResult.dynamicArray
      result.modelBindings.push(...formResult.modelBindings)
    }
    return result
  }
  catch {
    const hosts = [...source.matchAll(/<(a-form|el-form|n-form|[A-Z][\w$]*Form)(?=[\s/>])/g)]
      .map(match => ({ tag: match[1]!, offset: match.index }))
    return { hosts, modelBindings: [] }
  }
}

function auditSource(file: string, source: string): FormAuditRecord | undefined {
  const template = auditTemplate(file, source)
  const vformjs = /(?:@vformjs\/|\buseFormGroup\s*\()/.exec(source) ?? undefined
  const formFactory = /\buse(?:AntdForm|ElForm|Form|NaiveForm|ZodForm)\s*\(/.exec(source) ?? undefined
  const legacyValidate = /(?:\$refs\.[\w$]+|[\w$]+(?:Ref)?\.value)\.(?:validate|validateForm)\s*\(/.exec(source) ?? undefined
  const candidateOffset = template.hosts[0]?.offset
    ?? (vformjs && formFactory ? formFactory.index : undefined)
  if (candidateOffset == null)
    return undefined

  const labels: FormAuditLabel[] = []
  const evidence = new Set<string>()
  const add = (label: FormAuditLabel, signal?: string) => {
    if (!labels.includes(label))
      labels.push(label)
    if (signal)
      evidence.add(signal)
  }

  const uniqueHosts = [...new Set(template.hosts.map(host => host.tag))]
  if (template.hosts.length === 1)
    add('single-host', `<${template.hosts[0]!.tag}`)
  else if (template.hosts.length > 1)
    add('multi-host', `<${template.hosts[0]!.tag}`)

  const customHost = template.hosts.find(host => !STANDARD_HOSTS[host.tag])
  if (customHost)
    add('custom-host', `<${customHost.tag}`)

  if (vformjs)
    add('vformjs', vformjs[0])

  const schema = /(?:\buseZodForm\s*\(|\bz\.object\s*\()/.exec(source) ?? undefined
  if (schema)
    add('schema', schema[0])

  const declarativeConditional = /(?:\bwhenRules\s*:|\bwhen\s*:)/.exec(source) ?? undefined
  if (template.conditional)
    add('conditional', template.conditional.source)
  else if (declarativeConditional)
    add('conditional', declarativeConditional[0])

  const formArray = /(?:\.fieldArray\s*\(|\.list\s*\()/.exec(source) ?? undefined
  if (template.dynamicArray)
    add('dynamic-array', template.dynamicArray.source)
  else if (formArray)
    add('dynamic-array', formArray[0])

  const defineModelNames = new Set<string>()
  for (const match of source.matchAll(/\b(?:const|let)\s+([\w$]+)\s*=\s*defineModel(?:<[^>]*>)?\s*\(/g))
    defineModelNames.add(match[1]!)
  for (const binding of template.modelBindings) {
    const expression = binding.expression?.trim() ?? ''
    const rootName = /^[\w$]+/.exec(expression)?.[0]
    if (
      /^(?:props|\$props)\./.test(expression)
      || (rootName != null && defineModelNames.has(rootName))
      || (
        rootName === 'modelValue'
        && /\b(?:props\s*:\s*\{[\s\S]*?\bmodelValue\s*:|defineProps\b)/.test(source)
      )
    ) {
      add('external-model', binding.source)
      break
    }
  }

  const optionsApi = /\bexport\s+default\s*\{/.test(source)
    && /(?:\bdata\s*\(|\bmethods\s*:)/.test(source)
  if (optionsApi)
    add('options-api', /\bexport\s+default\s*\{/.exec(source)?.[0])

  if (formFactory && vformjs)
    evidence.add(formFactory[0])
  if (legacyValidate)
    evidence.add(legacyValidate[0])

  labels.sort()
  const migration = labels.some(label => MANUAL_LABELS[label])
    ? 'manual'
    : 'mechanical'

  return {
    file,
    line: lineAt(source, candidateOffset),
    hosts: uniqueHosts,
    labels,
    migration,
    evidence: [...evidence],
  }
}

/** Inventory form surfaces without modifying project files. */
export function auditForms(
  root: string,
  options: FormAuditOptions = {},
): FormAuditReport {
  const resolvedRoot = resolve(root)
  const files = collectSourceFiles(resolvedRoot)
  const forms: FormAuditRecord[] = []

  for (const absolutePath of files) {
    const file = relative(resolvedRoot, absolutePath)
    const record = auditSource(file, readFileSync(absolutePath, 'utf8'))
    if (record)
      forms.push(record)
  }

  const summary: Partial<Record<FormAuditLabel, number>> = {}
  for (const form of forms) {
    for (const label of form.labels)
      summary[label] = (summary[label] ?? 0) + 1
  }

  const report: FormAuditReport = {
    root: resolvedRoot,
    filesScanned: files.length,
    formsFound: forms.length,
    mechanical: forms.filter(form => form.migration === 'mechanical').length,
    manual: forms.filter(form => form.migration === 'manual').length,
    summary,
    forms,
  }

  if (options.reportPath) {
    const reportPath = resolve(resolvedRoot, options.reportPath)
    mkdirSync(dirname(reportPath), { recursive: true })
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  }

  return report
}
