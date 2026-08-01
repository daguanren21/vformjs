import { parse as parseScript } from '@babel/parser'
import { NodeTypes, baseParse } from '@vue/compiler-dom'
import { parse as parseSfc } from '@vue/compiler-sfc'
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, extname, relative, resolve } from 'node:path'
import MagicString from 'magic-string'

const SOURCE_EXTENSIONS: Record<string, true> = {
  '.cjs': true,
  '.js': true,
  '.jsx': true,
  '.mjs': true,
  '.ts': true,
  '.tsx': true,
  '.vue': true,
}

const SKIP_DIRECTORIES: Record<string, true> = {
  '.git': true,
  '.turbo': true,
  '.vitepress': true,
  coverage: true,
  dist: true,
  node_modules: true,
}

const IMPORT_REPLACEMENTS: Record<string, string> = {
  '@vformjs/element-ui': '@vformjs/element-plus',
  'element-ui': 'element-plus',
  'element-ui/lib/theme-chalk/index.css': 'element-plus/dist/index.css',
  '@vitejs/plugin-vue2': '@vitejs/plugin-vue',
}

const MANUAL_PATTERNS: ReadonlyArray<{
  code: string
  message: string
  pattern: RegExp
}> = [
  {
    code: 'vue-bootstrap',
    message: 'Rewrite Vue 2 bootstrap/plugin registration with createApp() and app.use().',
    pattern: /\b(?:new\s+Vue|Vue\.use)\s*\(/g,
  },
  {
    code: 'remaining-sync',
    message: 'Replace this .sync contract with the component-specific Vue 3 v-model argument.',
    pattern: /(?:v-bind:|:)[\w-]+\.sync\b/g,
  },
  {
    code: 'native-event',
    message: 'Review .native listeners against the child component emitted events.',
    pattern: /@[\w-]+\.native\b/g,
  },
  {
    code: 'legacy-slot',
    message: 'Convert slot-scope/scopedSlots usage to Vue 3 slot syntax.',
    pattern: /\b(?:slot-scope|\$scopedSlots)\b/g,
  },
  {
    code: 'listeners-merge',
    message: 'Vue 3 merges listeners into $attrs; review $listeners forwarding manually.',
    pattern: /\$listeners\b/g,
  },
  {
    code: 'global-instance-api',
    message: 'Replace Element UI prototype services with Element Plus imports or app.config.globalProperties.',
    pattern: /this\.\$(?:alert|confirm|message|msgbox|notify|prompt)\b/g,
  },
  {
    code: 'legacy-icon',
    message: 'Element Plus icons are components; map this el-icon-* class explicitly.',
    pattern: /\bel-icon-[\w-]+\b/g,
  },
  {
    code: 'element-ui-subpath',
    message: 'Review this Element UI subpath import against the Element Plus export map.',
    pattern: /(['"])element-ui\/(?!lib\/theme-chalk\/index\.css)[^'"]+\1/g,
  },
  {
    code: 'legacy-build-chain',
    message: 'Review the Vue 2 loader/compiler build configuration before switching the Vue major.',
    pattern: /\b(?:vue-loader@?1[0-6]|vue-template-compiler)\b/g,
  },
  {
    code: 'render-contract',
    message: 'Render functions and functional components need a semantic Vue 3 review.',
    pattern: /\b(?:functional\s*:|render\s*\()/g,
  },
]

interface TemplateLocation {
  start: { offset: number }
  end: { offset: number }
  source: string
}

interface TemplateProp {
  type: number
  name?: string
  arg?: { isStatic?: boolean, content?: string }
  loc: TemplateLocation
}

interface TemplateElement {
  type: number
  tag: string
  loc: TemplateLocation
  props: TemplateProp[]
  children: unknown[]
}

export interface MigrationIssue {
  file: string
  line: number
  code: string
  message: string
  evidence: string
}

export interface MigrationEdit {
  file: string
  changes: string[]
}

export interface MigrationReport {
  root: string
  dryRun: boolean
  filesScanned: number
  filesChanged: number
  edits: MigrationEdit[]
  issues: MigrationIssue[]
}

export interface MigrationOptions {
  dryRun?: boolean
  reportPath?: string
}

function lineAt(source: string, offset: number): number {
  let line = 1
  for (let index = 0; index < offset; index += 1) {
    if (source.charCodeAt(index) === 10)
      line += 1
  }
  return line
}

function errorMessage(error: unknown): string {
  if (error instanceof Error)
    return error.message
  if (typeof error === 'string')
    return error
  return String(error)
}

function rewriteScriptImports(
  source: string,
  offset: number,
  file: string,
  magic: MagicString,
  changes: string[],
  issues: MigrationIssue[],
): void {
  let ast: ReturnType<typeof parseScript>
  try {
    ast = parseScript(source, {
      errorRecovery: false,
      plugins: ['typescript', 'jsx', 'decorators-legacy'],
      sourceType: 'unambiguous',
    })
  }
  catch (error) {
    const location = (error as { loc?: { line?: number } }).loc
    issues.push({
      file,
      line: location?.line ?? 1,
      code: 'script-parse-failed',
      message: 'Script parsing failed; no import rewrite was attempted.',
      evidence: errorMessage(error),
    })
    return
  }

  for (const statement of ast.program.body) {
    const declaration = statement as unknown as {
      source?: { value?: unknown, start?: number | null, end?: number | null }
    }
    const value = declaration.source?.value
    if (typeof value !== 'string')
      continue
    const replacement = IMPORT_REPLACEMENTS[value]
    const start = declaration.source?.start
    const end = declaration.source?.end
    if (!replacement || start == null || end == null)
      continue
    const raw = source.slice(start, end)
    const quote = raw.startsWith('"') ? '"' : '\''
    magic.overwrite(offset + start, offset + end, `${quote}${replacement}${quote}`)
    changes.push(`import ${value} → ${replacement}`)
  }
}

function rewriteTemplate(
  source: string,
  templateOffset: number,
  file: string,
  magic: MagicString,
  changes: string[],
  issues: MigrationIssue[],
): void {
  let root: unknown
  try {
    root = baseParse(source)
  }
  catch (error) {
    issues.push({
      file,
      line: 1,
      code: 'template-parse-failed',
      message: 'Template parsing failed; no template rewrite was attempted.',
      evidence: errorMessage(error),
    })
    return
  }

  const seen = new Set<object>()
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object' || seen.has(node))
      return
    seen.add(node)
    const record = node as Record<string, unknown>

    if (record.type === NodeTypes.ELEMENT) {
      const element = node as TemplateElement
      if (element.tag === 'el-submenu') {
        const localSource = element.loc.source
        const open = localSource.indexOf('<el-submenu')
        const close = localSource.lastIndexOf('</el-submenu')
        if (open >= 0)
          magic.overwrite(templateOffset + element.loc.start.offset + open + 1, templateOffset + element.loc.start.offset + open + 11, 'el-sub-menu')
        if (close >= 0)
          magic.overwrite(templateOffset + element.loc.start.offset + close + 2, templateOffset + element.loc.start.offset + close + 12, 'el-sub-menu')
        changes.push('tag el-submenu → el-sub-menu')
      }

      const hasExplicitValue = element.props.some(prop => /^:(?:value)|^v-bind:value/.test(prop.loc.source))
      for (const prop of element.props) {
        const raw = prop.loc.source
        let replacement: string | undefined
        if (element.tag === 'el-dialog' && /^(?::visible\.sync|v-bind:visible\.sync)=/.test(raw))
          replacement = raw.replace(/^(?::visible\.sync|v-bind:visible\.sync)/, 'v-model')
        else if (element.tag === 'el-input' && /^(?::value|v-bind:value)=/.test(raw))
          replacement = raw.replace(/^(?::value|v-bind:value)/, ':model-value')
        else if (element.tag === 'el-input' && hasExplicitValue && /^(?:@input|v-on:input)=/.test(raw))
          replacement = raw.replace(/^(?:@input|v-on:input)/, '@update:model-value')

        if (!replacement || replacement === raw)
          continue
        magic.overwrite(
          templateOffset + prop.loc.start.offset,
          templateOffset + prop.loc.end.offset,
          replacement,
        )
        changes.push(`template ${raw.split('=')[0]} → ${replacement.split('=')[0]}`)
      }
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
}

function scanManualIssues(file: string, source: string, issues: MigrationIssue[]): void {
  const seen = new Set<string>()
  for (const rule of MANUAL_PATTERNS) {
    for (const match of source.matchAll(rule.pattern)) {
      const offset = match.index ?? 0
      const line = lineAt(source, offset)
      const key = `${rule.code}:${line}`
      if (seen.has(key))
        continue
      seen.add(key)
      issues.push({
        file,
        line,
        code: rule.code,
        message: rule.message,
        evidence: match[0],
      })
    }
  }
}

function transformSource(file: string, source: string): { source: string, changes: string[], issues: MigrationIssue[] } {
  const magic = new MagicString(source)
  const changes: string[] = []
  const issues: MigrationIssue[] = []

  if (extname(file) === '.vue') {
    const parsed = parseSfc(source, { filename: file })
    if (parsed.errors.length) {
      for (const error of parsed.errors) {
        issues.push({
          file,
          line: 1,
          code: 'sfc-parse-failed',
          message: 'Vue SFC parsing failed; no rewrite was attempted.',
          evidence: errorMessage(error),
        })
      }
      scanManualIssues(file, source, issues)
      return { source, changes, issues }
    }

    for (const block of [parsed.descriptor.script, parsed.descriptor.scriptSetup]) {
      if (block)
        rewriteScriptImports(block.content, block.loc.start.offset, file, magic, changes, issues)
    }
    const template = parsed.descriptor.template
    if (template)
      rewriteTemplate(template.content, template.loc.start.offset, file, magic, changes, issues)
  }
  else {
    rewriteScriptImports(source, 0, file, magic, changes, issues)
  }

  const output = magic.toString()
  scanManualIssues(file, output, issues)
  return { source: output, changes, issues }
}

function moveDependency(
  section: Record<string, string>,
  from: string,
  to: string,
  version: string | undefined,
  changes: string[],
): void {
  const current = section[from]
  if (current == null)
    return
  delete section[from]
  section[to] = version ?? current
  changes.push(`dependency ${from} → ${to}`)
}

function transformPackage(file: string, source: string): { source: string, changes: string[], issues: MigrationIssue[] } {
  const changes: string[] = []
  const issues: MigrationIssue[] = []
  let manifest: Record<string, unknown>
  try {
    manifest = JSON.parse(source) as Record<string, unknown>
  }
  catch (error) {
    issues.push({
      file,
      line: 1,
      code: 'package-parse-failed',
      message: 'package.json is not valid JSON; dependency migration was skipped.',
      evidence: errorMessage(error),
    })
    return { source, changes, issues }
  }

  for (const key of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const section = manifest[key]
    if (!section || typeof section !== 'object' || Array.isArray(section))
      continue
    const dependencies = section as Record<string, string>
    moveDependency(dependencies, '@vformjs/element-ui', '@vformjs/element-plus', undefined, changes)
    moveDependency(dependencies, 'element-ui', 'element-plus', '^2.14.3', changes)
    moveDependency(dependencies, '@vitejs/plugin-vue2', '@vitejs/plugin-vue', '^6.0.0', changes)
    if (dependencies.vue && /(?:^|[^0-9])2\./.test(dependencies.vue)) {
      dependencies.vue = '^3.5.0'
      changes.push('dependency vue 2 → ^3.5.0')
    }
    if (dependencies['vue-template-compiler']) {
      delete dependencies['vue-template-compiler']
      dependencies['@vue/compiler-sfc'] = '^3.5.40'
      changes.push('dependency vue-template-compiler → @vue/compiler-sfc')
    }
  }

  const output = changes.length ? `${JSON.stringify(manifest, null, 2)}\n` : source
  scanManualIssues(file, output, issues)
  return { source: output, changes, issues }
}

function collectMigrationFiles(root: string, current = root, files: string[] = []): string[] {
  for (const entry of readdirSync(current).sort()) {
    const path = resolve(current, entry)
    const stats = statSync(path)
    if (stats.isDirectory()) {
      if (!SKIP_DIRECTORIES[entry])
        collectMigrationFiles(root, path, files)
      continue
    }
    if (entry === 'package.json' || SOURCE_EXTENSIONS[extname(entry)])
      files.push(path)
  }
  return files
}

export function migrateVue2ToVue3(root: string, options: MigrationOptions = {}): MigrationReport {
  const resolvedRoot = resolve(root)
  const files = collectMigrationFiles(resolvedRoot)
  const edits: MigrationEdit[] = []
  const issues: MigrationIssue[] = []

  for (const absolutePath of files) {
    const file = relative(resolvedRoot, absolutePath)
    const source = readFileSync(absolutePath, 'utf8')
    const result = file.endsWith('package.json')
      ? transformPackage(file, source)
      : transformSource(file, source)
    issues.push(...result.issues)
    if (!result.changes.length || result.source === source)
      continue
    edits.push({ file, changes: [...new Set(result.changes)] })
    if (!options.dryRun)
      writeFileSync(absolutePath, result.source)
  }

  const report: MigrationReport = {
    root: resolvedRoot,
    dryRun: options.dryRun ?? false,
    filesScanned: files.length,
    filesChanged: edits.length,
    edits,
    issues,
  }

  if (options.reportPath && !options.dryRun) {
    const reportPath = resolve(resolvedRoot, options.reportPath)
    mkdirSync(dirname(reportPath), { recursive: true })
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  }

  return report
}
