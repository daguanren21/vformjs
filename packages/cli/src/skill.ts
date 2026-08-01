import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { commitPlans, planFiles, type FileOperation, type WriteOptions } from './scaffold'
import type { LoadedProject } from './project'

export type AgentTarget = 'agents' | 'claude'

export interface SkillInstallOptions extends WriteOptions {
  agent?: AgentTarget
  target?: string
}

function locateSkillSource(): string {
  const candidates = [
    resolve(process.cwd(), 'skills/vformjs'),
    resolve(process.cwd(), '../../skills/vformjs'),
  ]
  try {
    candidates.unshift(
      fileURLToPath(new URL('./skill', import.meta.url)),
      fileURLToPath(new URL('../../../skills/vformjs', import.meta.url)),
    )
  }
  catch {
    // Vitest can expose a non-file import.meta.url; the repository fallback remains valid.
  }
  const source = candidates.find(path => existsSync(resolve(path, 'SKILL.md')))
  if (!source)
    throw new Error('Bundled vformjs skill is missing')
  return source
}

function listFiles(root: string, current = root): string[] {
  const files: string[] = []
  for (const entry of readdirSync(current)) {
    const path = resolve(current, entry)
    if (statSync(path).isDirectory())
      files.push(...listFiles(root, path))
    else
      files.push(relative(root, path))
  }
  return files.sort()
}

export function installSkill(
  project: LoadedProject,
  options: SkillInstallOptions = {},
): FileOperation[] {
  const source = locateSkillSource()
  const destination = options.target
    ?? (options.agent === 'claude' ? '.claude/skills/vformjs' : '.agents/skills/vformjs')
  const files = listFiles(source).map(path => ({
    path: `${destination}/${path}`,
    content: readFileSync(resolve(source, path), 'utf8'),
  }))
  const { plans, operations } = planFiles(project, files, options)
  commitPlans(plans, options.dryRun)
  return operations
}
