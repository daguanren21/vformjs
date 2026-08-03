import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
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

const STANDARD_HOSTS = new Set([
  'AForm',
  'ElForm',
  'NForm',
  'a-form',
  'el-form',
  'n-form',
])
const MANUAL_LABELS = new Set<FormAuditLabel>([
  'conditional',
  'custom-host',
  'dynamic-array',
  'external-model',
  'multi-host',
  'options-api',
])

function lineAt(source: string, offset: number): number {
  let line = 1
  for (let index = 0; index < offset; index += 1) {
    if (source.charCodeAt(index) === 10)
      line += 1
  }
  return line
}

function firstMatch(source: string, pattern: RegExp): RegExpExecArray | undefined {
  return pattern.exec(source) ?? undefined
}

function auditSource(file: string, source: string): FormAuditRecord | undefined {
  const hostMatches = [
    ...source.matchAll(/<((?:a-form|el-form|n-form|[A-Z][\w]*Form))\b/g),
  ]
  const formFactory = firstMatch(
    source,
    /\buse(?:AntdForm|ElForm|Form|NaiveForm|ZodForm)\s*\(/,
  )
  const legacyValidate = firstMatch(
    source,
    /(?:\$refs\.[\w$]+|[\w$]+(?:Ref)?\.value)\.(?:validate|validateForm)\s*\(/,
  )
  const candidate = hostMatches[0] ?? formFactory ?? legacyValidate
  if (!candidate)
    return undefined

  const labels: FormAuditLabel[] = []
  const evidence = new Set<string>()
  const add = (label: FormAuditLabel, match?: RegExpExecArray) => {
    if (!labels.includes(label))
      labels.push(label)
    if (match?.[0])
      evidence.add(match[0])
  }

  const hosts = hostMatches.map(match => match[1]!)
  const uniqueHosts = [...new Set(hosts)]
  if (hosts.length === 1)
    add('single-host', hostMatches[0])
  else if (hosts.length > 1)
    add('multi-host', hostMatches[0])

  const customHost = hostMatches.find(match => !STANDARD_HOSTS.has(match[1]!))
  if (customHost)
    add('custom-host', customHost)

  const vformjs = firstMatch(source, /(?:@vformjs\/|\buseFormGroup\s*\()/)
  if (vformjs)
    add('vformjs', vformjs)

  const schema = firstMatch(source, /(?:\buseZodForm\s*\(|\bz\.object\s*\()/)
  if (schema)
    add('schema', schema)

  const conditional = firstMatch(
    source,
    /(?:\bv-(?:if|show)\s*=|\bwhenRules\s*:|\bwhen\s*:)/,
  )
  if (conditional)
    add('conditional', conditional)

  const dynamicArray = firstMatch(
    source,
    /(?:\bv-for\s*=|\$\{\s*(?:index|i)\s*\}|\.fieldArray\s*\(|\.list\s*\(|\.(?:push|splice)\s*\()/,
  )
  if (dynamicArray)
    add('dynamic-array', dynamicArray)

  const externalModel = firstMatch(
    source,
    /(?:\bmodelValue\b|\bdefineModel\s*\(|\bprops\.[\w$]+)/,
  )
  if (externalModel)
    add('external-model', externalModel)

  const optionsApi = /\bexport\s+default\s*\{/.test(source)
    && /(?:\bdata\s*\(|\bmethods\s*:)/.test(source)
  if (optionsApi) {
    add(
      'options-api',
      firstMatch(source, /\bexport\s+default\s*\{/),
    )
  }

  if (formFactory)
    evidence.add(formFactory[0])
  if (legacyValidate)
    evidence.add(legacyValidate[0])

  labels.sort()
  const migration = labels.some(label => MANUAL_LABELS.has(label))
    ? 'manual'
    : 'mechanical'

  return {
    file,
    line: lineAt(source, candidate.index),
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
