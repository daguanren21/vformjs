#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { doctorProject, type DoctorReport } from './doctor'
import { migrateVue2ToVue3, type MigrationOptions, type MigrationReport } from './migrate'
import { loadProject } from './project'
import {
  addForm,
  initProject,
  type FileOperation,
  type ScaffoldOptions,
} from './scaffold'
import { installSkill, type AgentTarget, type SkillInstallOptions } from './skill'

export interface CliIo {
  out: (message: string) => void
  error: (message: string) => void
}

interface ParsedArgs {
  positionals: string[]
  values: Record<string, string>
  flags: Set<string>
}

const VALUE_FLAGS: Record<string, true> = {
  cwd: true,
  host: true,
  name: true,
  'source-dir': true,
  agent: true,
  target: true,
  report: true,
}

const BOOLEAN_FLAGS: Record<string, true> = {
  'dry-run': true,
  force: true,
  json: true,
  zod: true,
  'no-zod': true,
  help: true,
  version: true,
}

const HELP = `vformjs — deterministic form scaffolding for coding agents

Usage:
  vformjs init [--host <host>] [--name <form>] [--zod]
  vformjs add form <name>
  vformjs doctor
  vformjs migrate vue2-to-vue3 [--report <file>]
  vformjs skill install [--agent agents|claude] [--target <dir>]

Shared options:
  --cwd <dir>       Project root (default: current directory)
  --dry-run         Print writes without changing files
  --force           Replace generated files that differ
  --json            Emit machine-readable output

Hosts: element-plus, element-ui, naive-ui, ant-design-vue
`

function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = { positionals: [], values: {}, flags: new Set() }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!
    if (!arg.startsWith('--')) {
      parsed.positionals.push(arg)
      continue
    }

    const [rawName, inlineValue] = arg.slice(2).split('=', 2)
    if (VALUE_FLAGS[rawName!]) {
      const value = inlineValue ?? args[++index]
      if (!value || value.startsWith('--'))
        throw new Error(`--${rawName} requires a value`)
      parsed.values[rawName!] = value
      continue
    }
    if (!BOOLEAN_FLAGS[rawName!])
      throw new Error(`Unknown option --${rawName}`)
    if (inlineValue != null)
      throw new Error(`--${rawName} does not accept a value`)
    parsed.flags.add(rawName!)
  }
  if (parsed.flags.has('zod') && parsed.flags.has('no-zod'))
    throw new Error('Use only one of --zod and --no-zod')
  return parsed
}

function packageVersion(): string {
  const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
  return packageJson.version
}

function printOperations(io: CliIo, operations: FileOperation[]): void {
  for (const operation of operations)
    io.out(`${operation.action.toUpperCase().replace('-', '_')} ${operation.path}`)
}

export async function runCli(
  args = process.argv.slice(2),
  baseCwd = process.cwd(),
  io: CliIo = { out: console.log, error: console.error },
): Promise<number> {
  try {
    const parsed = parseArgs(args)
    if (parsed.flags.has('help') || parsed.positionals.length === 0) {
      io.out(HELP)
      return 0
    }
    if (parsed.flags.has('version')) {
      io.out(packageVersion())
      return 0
    }

    const cwd = resolve(baseCwd, parsed.values.cwd ?? '.')
    const project = loadProject(cwd)
    const writeOptions = {
      dryRun: parsed.flags.has('dry-run'),
      force: parsed.flags.has('force'),
    }
    const command = parsed.positionals[0]
    let result: FileOperation[] | DoctorReport | MigrationReport

    if (command === 'init' && parsed.positionals.length === 1) {
      const options: ScaffoldOptions = { ...writeOptions }
      if (parsed.values.host)
        options.host = parsed.values.host
      if (parsed.values.name)
        options.name = parsed.values.name
      if (parsed.values['source-dir'])
        options.sourceDir = parsed.values['source-dir']
      if (parsed.flags.has('zod'))
        options.zod = true
      else if (parsed.flags.has('no-zod'))
        options.zod = false
      result = initProject(project, options)
    }
    else if (command === 'add' && parsed.positionals[1] === 'form' && parsed.positionals.length === 3) {
      result = addForm(project, {
        ...writeOptions,
        name: parsed.positionals[2]!,
      })
    }
    else if (command === 'doctor' && parsed.positionals.length === 1) {
      result = doctorProject(project)
    }
    else if (command === 'migrate' && parsed.positionals[1] === 'vue2-to-vue3' && parsed.positionals.length === 2) {
      const options: MigrationOptions = {
        dryRun: parsed.flags.has('dry-run'),
      }
      if (parsed.values.report)
        options.reportPath = parsed.values.report
      result = migrateVue2ToVue3(project.root, options)
    }
    else if (command === 'skill' && parsed.positionals[1] === 'install' && parsed.positionals.length === 2) {
      const agent = parsed.values.agent
      if (agent && agent !== 'agents' && agent !== 'claude')
        throw new Error('--agent must be agents or claude')
      const options: SkillInstallOptions = { ...writeOptions }
      if (agent)
        options.agent = agent as AgentTarget
      if (parsed.values.target)
        options.target = parsed.values.target
      result = installSkill(project, options)
    }
    else {
      throw new Error(`Unknown command.\n\n${HELP}`)
    }

    if (parsed.flags.has('json')) {
      io.out(JSON.stringify({ command, result }, null, 2))
    }
    else if (Array.isArray(result)) {
      printOperations(io, result)
    }
    else if ('checks' in result) {
      for (const check of result.checks)
        io.out(`[${check.level.toUpperCase()}] ${check.message}`)
      if (!result.ok)
        return 1
    }
    else {
      io.out(`Scanned ${result.filesScanned} files; ${result.filesChanged} would change.`)
      for (const edit of result.edits)
        io.out(`[MIGRATE] ${edit.file}: ${edit.changes.join(', ')}`)
      for (const issue of result.issues)
        io.out(`[MANUAL ${issue.code}] ${issue.file}:${issue.line} ${issue.message}`)
    }
    if (!Array.isArray(result) && 'issues' in result && result.issues.length)
      return 2
    return 0
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (args.includes('--json'))
      io.out(JSON.stringify({ ok: false, error: message }, null, 2))
    else
      io.error(`vformjs: ${message}`)
    return 1
  }
}

const entry = process.argv[1]
if (entry && pathToFileURL(resolve(entry)).href === import.meta.url)
  process.exitCode = await runCli()
export {
  migrateVue2ToVue3,
  type MigrationEdit,
  type MigrationIssue,
  type MigrationOptions,
  type MigrationReport,
} from './migrate'
export { doctorProject, type DoctorCheck, type DoctorReport } from './doctor'
export {
  CONFIG_FILE,
  HOSTS,
  detectEnvironment,
  loadProject,
  readVformConfig,
  type DetectedEnvironment,
  type HostDefinition,
  type HostId,
  type LoadedProject,
  type VformConfig,
} from './project'
export {
  addForm,
  initProject,
  renderForm,
  type FileAction,
  type FileOperation,
  type ScaffoldOptions,
} from './scaffold'
export { installSkill, type AgentTarget, type SkillInstallOptions } from './skill'
