import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import {
  CONFIG_FILE,
  HOSTS,
  assertFormPreset,
  detectEnvironment,
  isHostId,
  readVformConfig,
  resolveHostDefinition,
  type FormPreset,
  type LoadedProject,
  type VformConfig,
} from './project'

export type FileAction = 'create' | 'update' | 'unchanged' | 'would-create' | 'would-update'

export interface FileOperation {
  action: FileAction
  path: string
}

export interface WriteOptions {
  dryRun?: boolean
  force?: boolean
}

interface FilePlan {
  absolutePath: string
  content: string
  action: FileAction
}

export interface ScaffoldOptions extends WriteOptions {
  host?: string
  name?: string
  sourceDir?: string
  zod?: boolean
  adapterPackage?: string
  formFactory?: string
  zodEntry?: string
}

export function planFiles(
  project: LoadedProject,
  files: ReadonlyArray<{ path: string, content: string }>,
  options: WriteOptions = {},
): { plans: FilePlan[], operations: FileOperation[] } {
  const plans = files.map(({ path, content }) => {
    const absolutePath = resolve(project.root, path)
    if (!absolutePath.startsWith(`${project.root}/`) && absolutePath !== project.root)
      throw new Error(`Refusing to write outside the project: ${path}`)
    const exists = existsSync(absolutePath)
    if (exists) {
      const previous = readFileSync(absolutePath, 'utf8')
      if (previous === content)
        return { absolutePath, content, action: 'unchanged' as const }
      if (!options.force)
        throw new Error(`${relative(project.root, absolutePath)} already exists with different content; rerun with --force to replace it`)
      return {
        absolutePath,
        content,
        action: options.dryRun ? 'would-update' as const : 'update' as const,
      }
    }
    return {
      absolutePath,
      content,
      action: options.dryRun ? 'would-create' as const : 'create' as const,
    }
  })

  return {
    plans,
    operations: plans.map(plan => ({
      action: plan.action,
      path: relative(project.root, plan.absolutePath),
    })),
  }
}

export function commitPlans(plans: ReadonlyArray<FilePlan>, dryRun = false): void {
  if (dryRun)
    return
  for (const plan of plans) {
    if (plan.action === 'unchanged')
      continue
    mkdirSync(dirname(plan.absolutePath), { recursive: true })
    writeFileSync(plan.absolutePath, plan.content)
  }
}

function formName(raw: string): { kebab: string, pascal: string, camel: string } {
  if (!/^[a-z][a-z0-9-]*$/.test(raw))
    throw new Error(`Form name must be kebab-case: ${raw}`)
  const words = raw.split('-')
  const pascal = words.map(word => `${word[0]!.toUpperCase()}${word.slice(1)}`).join('')
  return { kebab: raw, pascal, camel: `${pascal[0]!.toLowerCase()}${pascal.slice(1)}` }
}

function selectConfig(project: LoadedProject, options: ScaffoldOptions): VformConfig {
  const current = readVformConfig(project)
  const detected = detectEnvironment(project)
  const customRequested = options.adapterPackage !== undefined
    || options.formFactory !== undefined
    || options.zodEntry !== undefined
  let host: string | undefined
  let preset: FormPreset | undefined

  if (customRequested) {
    const candidate = {
      adapterPackage: options.adapterPackage
        ?? current?.preset?.adapterPackage,
      formFactory: options.formFactory
        ?? current?.preset?.formFactory,
      ...(options.zodEntry !== undefined
        ? { zodEntry: options.zodEntry }
        : current?.preset?.zodEntry
          ? { zodEntry: current.preset.zodEntry }
          : {}),
    }
    assertFormPreset(candidate)
    preset = candidate
    host = options.host ?? current?.host ?? 'custom'
  }
  else if (options.host != null) {
    if (isHostId(options.host)) {
      host = options.host
    }
    else if (current?.host === options.host && current.preset) {
      host = current.host
      preset = current.preset
    }
    else {
      throw new Error(
        `Custom host ${options.host} requires --adapter-package and --form-factory`,
      )
    }
  }
  else if (current) {
    host = current.host
    preset = current.preset
  }
  else if (detected.hosts.length === 1) {
    host = detected.hosts[0]
  }
  else if (detected.hosts.length > 1) {
    throw new Error(`Multiple UI hosts detected (${detected.hosts.join(', ')}); pass --host explicitly`)
  }

  if (!host)
    throw new Error(`No supported UI host detected; pass --host ${Object.keys(HOSTS).join('|')}`)

  const config: VformConfig = {
    version: 1,
    host,
    zod: options.zod ?? current?.zod ?? detected.zod,
    sourceDir: options.sourceDir ?? current?.sourceDir ?? 'src/forms',
  }
  if (preset)
    config.preset = preset
  return config
}

export function renderForm(config: VformConfig, rawName: string): string {
  const name = formName(rawName)
  const host = resolveHostDefinition(config)
  const usage = `/** Vue template: v-bind="form.host"; v-bind="form.item(${name.camel}FormPath('email'))". */`

  if (config.zod) {
    return `/** Generated by vformjs. Safe to edit after creation. */
import { createFieldPath, type SubmitHandlerResult } from '${host.adapterPackage}'
import { useZodForm } from '${host.zodEntry ?? `${host.adapterPackage}/zod`}'
import { z } from 'zod'

export const ${name.camel}FormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Enter a valid email'),
})

export type ${name.pascal}FormInput = z.input<typeof ${name.camel}FormSchema>
export type ${name.pascal}FormValues = z.output<typeof ${name.camel}FormSchema>
export type ${name.pascal}FormSubmit<TError = never> = (
  values: ${name.pascal}FormValues,
) => SubmitHandlerResult<TError>

export const ${name.camel}FormPath = createFieldPath<${name.pascal}FormInput>()

${usage}
export function use${name.pascal}Form<TError = never>(
  onSubmit: ${name.pascal}FormSubmit<TError>,
) {
  return useZodForm<typeof ${name.camel}FormSchema, TError>({
    schema: ${name.camel}FormSchema,
    defaults: { name: '', email: '' },
    onSubmit,
  })
}
`
  }

  return `/** Generated by vformjs. Safe to edit after creation. */
import {
  createFieldPath,
  createRuleBuilders,
  enUSRuleMessages,
  ${host.formFactory},
  type SubmitHandlerResult,
} from '${host.adapterPackage}'

export type ${name.pascal}FormValues = {
  name: string
  email: string
}

export type ${name.pascal}FormSubmit<TError = never> = (
  values: ${name.pascal}FormValues,
) => SubmitHandlerResult<TError>

const r = createRuleBuilders(enUSRuleMessages)
export const ${name.camel}FormPath = createFieldPath<${name.pascal}FormValues>()

${usage}
export function use${name.pascal}Form<TError = never>(
  onSubmit: ${name.pascal}FormSubmit<TError>,
) {
  return ${host.formFactory}<${name.pascal}FormValues, TError>({
    defaults: { name: '', email: '' },
    rules: {
      name: [r.required()],
      email: [r.required(), r.email()],
    },
    onSubmit,
  })
}
`
}

export function initProject(project: LoadedProject, options: ScaffoldOptions = {}): FileOperation[] {
  const config = selectConfig(project, options)
  const name = options.name ?? 'example'
  const files = [
    { path: CONFIG_FILE, content: `${JSON.stringify(config, null, 2)}\n` },
    { path: `${config.sourceDir}/use-${formName(name).kebab}-form.ts`, content: renderForm(config, name) },
  ]
  const { plans, operations } = planFiles(project, files, options)
  commitPlans(plans, options.dryRun)
  return operations
}

export function addForm(project: LoadedProject, options: ScaffoldOptions = {}): FileOperation[] {
  const config = readVformConfig(project)
  if (!config)
    throw new Error(`Run vformjs init before adding a form`)
  const name = options.name
  if (!name)
    throw new Error(`vformjs add form requires a name`)
  const files = [{
    path: `${config.sourceDir}/use-${formName(name).kebab}-form.ts`,
    content: renderForm(config, name),
  }]
  const { plans, operations } = planFiles(project, files, options)
  commitPlans(plans, options.dryRun)
  return operations
}
