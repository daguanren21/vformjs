import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export type HostId = 'element-plus' | 'element-ui' | 'naive-ui' | 'ant-design-vue'

export interface HostDefinition {
  id: string
  uiPackage?: string
  adapterPackage: string
  formFactory: string
  vueMajor?: 2 | 3
  zodEntry?: string
}

export const HOSTS: Record<HostId, HostDefinition> = {
  'element-plus': {
    id: 'element-plus',
    uiPackage: 'element-plus',
    adapterPackage: '@vformjs/element-plus',
    formFactory: 'useElForm',
    vueMajor: 3,
  },
  'element-ui': {
    id: 'element-ui',
    uiPackage: 'element-ui',
    adapterPackage: '@vformjs/element-ui',
    formFactory: 'useElForm',
    vueMajor: 2,
  },
  'naive-ui': {
    id: 'naive-ui',
    uiPackage: 'naive-ui',
    adapterPackage: '@vformjs/naive-ui',
    formFactory: 'useNaiveForm',
    vueMajor: 3,
  },
  'ant-design-vue': {
    id: 'ant-design-vue',
    uiPackage: 'ant-design-vue',
    adapterPackage: '@vformjs/ant-design-vue',
    formFactory: 'useAntdForm',
    vueMajor: 3,
  },
}

export interface FormPreset {
  adapterPackage: string
  formFactory: string
  zodEntry?: string
  /** Optional checks used by doctor; no private package detection is performed. */
  uiPackage?: string
  vueMajor?: 2 | 3
}

export interface VformConfig {
  version: 1
  host: string
  zod: boolean
  sourceDir: string
  preset?: FormPreset
}

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

export interface LoadedProject {
  root: string
  packagePath: string
  packageJson: PackageJson
  dependencies: Record<string, string>
}

export interface DetectedEnvironment {
  hosts: HostId[]
  vueMajor: number | undefined
  zod: boolean
}

export const CONFIG_FILE = '.vformjs.json'

export function isHostId(value: string): value is HostId {
  return Object.hasOwn(HOSTS, value)
}

function isPackageSpecifier(value: unknown): value is string {
  return typeof value === 'string'
    && /^[@a-zA-Z0-9][@a-zA-Z0-9._/-]*$/.test(value)
}

function isIdentifier(value: unknown): value is string {
  return typeof value === 'string'
    && /^[A-Za-z_$][\w$]*$/.test(value)
}

export function assertFormPreset(value: unknown): asserts value is FormPreset {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${CONFIG_FILE} preset must contain an object`)
  const preset = value as Partial<FormPreset>
  if (!isPackageSpecifier(preset.adapterPackage))
    throw new Error(`${CONFIG_FILE} preset must define a valid adapterPackage`)
  if (!isIdentifier(preset.formFactory))
    throw new Error(`${CONFIG_FILE} preset must define an identifier formFactory`)
  if (preset.zodEntry !== undefined && !isPackageSpecifier(preset.zodEntry))
    throw new Error(`${CONFIG_FILE} preset zodEntry must be a package specifier`)
  if (preset.uiPackage !== undefined && !isPackageSpecifier(preset.uiPackage))
    throw new Error(`${CONFIG_FILE} preset uiPackage must be a package specifier`)
  if (preset.vueMajor !== undefined && preset.vueMajor !== 2 && preset.vueMajor !== 3)
    throw new Error(`${CONFIG_FILE} preset vueMajor must be 2 or 3`)
}

export function resolveHostDefinition(config: VformConfig): HostDefinition {
  if (config.preset)
    return { id: config.host, ...config.preset }
  if (!isHostId(config.host))
    throw new Error(`${CONFIG_FILE} custom host ${config.host} requires preset`)
  return HOSTS[config.host]
}

export function loadProject(root: string): LoadedProject {
  const resolvedRoot = resolve(root)
  const packagePath = resolve(resolvedRoot, 'package.json')
  if (!existsSync(packagePath))
    throw new Error(`No package.json found in ${resolvedRoot}`)

  let packageJson: PackageJson
  try {
    packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as PackageJson
  }
  catch (error) {
    throw new Error(`Cannot parse ${packagePath}: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
  }

  return {
    root: resolvedRoot,
    packagePath,
    packageJson,
    dependencies: {
      ...packageJson.peerDependencies,
      ...packageJson.devDependencies,
      ...packageJson.dependencies,
    },
  }
}

export function detectEnvironment(project: LoadedProject): DetectedEnvironment {
  const hosts = (Object.entries(HOSTS) as Array<[HostId, HostDefinition]>)
    .filter(([, host]) =>
      host.uiPackage !== undefined
      && project.dependencies[host.uiPackage] != null,
    )
    .map(([id]) => id)
  const vueVersion = project.dependencies.vue
  const vueMajorMatch = vueVersion?.match(/(?:^|[^0-9])(\d+)(?:\.|$)/)

  return {
    hosts,
    vueMajor: vueMajorMatch ? Number(vueMajorMatch[1]) : undefined,
    zod: project.dependencies.zod != null,
  }
}

export function readVformConfig(project: LoadedProject): VformConfig | undefined {
  const path = resolve(project.root, CONFIG_FILE)
  if (!existsSync(path))
    return undefined

  let value: unknown
  try {
    value = JSON.parse(readFileSync(path, 'utf8'))
  }
  catch (error) {
    throw new Error(`Cannot parse ${path}: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
  }

  if (!value || typeof value !== 'object')
    throw new Error(`${CONFIG_FILE} must contain an object`)
  const config = value as Partial<VformConfig>
  if (config.version !== 1 || typeof config.host !== 'string' || !config.host)
    throw new Error(`${CONFIG_FILE} has an unsupported version or host`)
  if (typeof config.zod !== 'boolean' || typeof config.sourceDir !== 'string' || !config.sourceDir)
    throw new Error(`${CONFIG_FILE} must define boolean zod and sourceDir`)
  if (config.preset === undefined) {
    if (!isHostId(config.host))
      throw new Error(`${CONFIG_FILE} custom host ${config.host} requires preset`)
  }
  else {
    assertFormPreset(config.preset)
  }
  return config as VformConfig
}
