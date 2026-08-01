import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export type HostId = 'element-plus' | 'element-ui' | 'naive-ui' | 'ant-design-vue'

export interface HostDefinition {
  id: HostId
  uiPackage: string
  adapterPackage: string
  formFactory: 'useElForm' | 'useNaiveForm' | 'useAntdForm'
  vueMajor: 2 | 3
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

export interface VformConfig {
  version: 1
  host: HostId
  zod: boolean
  sourceDir: string
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
  const hosts = Object.values(HOSTS)
    .filter(host => project.dependencies[host.uiPackage] != null)
    .map(host => host.id)
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
  if (config.version !== 1 || typeof config.host !== 'string' || !isHostId(config.host))
    throw new Error(`${CONFIG_FILE} has an unsupported version or host`)
  if (typeof config.zod !== 'boolean' || typeof config.sourceDir !== 'string' || !config.sourceDir)
    throw new Error(`${CONFIG_FILE} must define boolean zod and sourceDir`)
  return config as VformConfig
}
