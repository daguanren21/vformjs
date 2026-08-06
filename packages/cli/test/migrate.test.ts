import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { compileScript, compileTemplate, parse } from '@vue/compiler-sfc'
import { afterEach, describe, expect, it } from 'vitest'
import { runCli } from '../src/cli'
import { migrateVue2ToVue3 } from '../src/migrate'
const fixture = resolve(import.meta.dirname, 'fixtures/migration-vue2')
const temporaryRoots: string[] = []

function copyMigrationFixture(): string {
  const root = mkdtempSync(resolve(import.meta.dirname, '.tmp-migration-'))
  temporaryRoots.push(root)
  cpSync(fixture, root, { recursive: true })
  return root
}

function expectCompilableSfc(path: string): void {
  const source = readFileSync(path, 'utf8')
  const parsed = parse(source, { filename: path })
  expect(parsed.errors).toEqual([])
  if (parsed.descriptor.scriptSetup)
    expect(() => compileScript(parsed.descriptor, { id: 'migration-fixture' })).not.toThrow()
  const template = parsed.descriptor.template
  expect(template).toBeTruthy()
  const compiled = compileTemplate({
    filename: path,
    id: 'migration-fixture',
    source: template!.content,
  })
  expect(compiled.errors).toEqual([])
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0))
    rmSync(root, { force: true, recursive: true })
})

describe('Vue 2.7 to Vue 3 migration', () => {
  it('plans, applies, reports, and remains idempotent', () => {
    const root = copyMigrationFixture()
    const safePath = resolve(root, 'src/SafeCustomerForm.vue')
    const original = readFileSync(safePath, 'utf8')

    const dryRun = migrateVue2ToVue3(root, { dryRun: true })
    expect(dryRun.filesChanged).toBeGreaterThan(0)
    expect(dryRun.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'global-instance-api',
      'legacy-icon',
      'remaining-sync',
      'vue-bootstrap',
    ]))
    expect(readFileSync(safePath, 'utf8')).toBe(original)

    const applied = migrateVue2ToVue3(root, { reportPath: 'migration-report.json' })
    expect(applied.filesChanged).toBe(dryRun.filesChanged)
    const safe = readFileSync(safePath, 'utf8')
    expect(safe).toContain("from '@vformjs/element-plus'")
    expect(safe).toContain("from 'element-plus'")
    expect(safe).toContain('<el-dialog v-model="visible"')
    expect(safe).toContain('<el-sub-menu')
    expect(safe).toContain(':model-value="form.model.id"')
    expect(safe).toContain('@update:model-value="form.model.id = $event"')
    expectCompilableSfc(safePath)

    const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
      devDependencies: Record<string, string>
    }
    expect(manifest.dependencies).toMatchObject({
      '@vformjs/element-plus': '^0.1.1',
      'element-plus': '^2.14.3',
      'vue': '^3.5.0',
    })
    expect(manifest.devDependencies).toMatchObject({
      '@vitejs/plugin-vue': '^6.0.0',
      '@vue/compiler-sfc': '^3.5.40',
    })
    expect(readFileSync(resolve(root, 'migration-report.json'), 'utf8')).toContain('remaining-sync')

    const second = migrateVue2ToVue3(root)
    expect(second.filesChanged).toBe(0)
    expect(second.issues.length).toBeGreaterThan(0)
  })

  it('returns a manual-review exit code with JSON dry-run output', async () => {
    const root = copyMigrationFixture()
    const output: string[] = []
    const errors: string[] = []
    const exitCode = await runCli(
      ['migrate', 'vue2-to-vue3', '--cwd', root, '--dry-run', '--json'],
      root,
      {
        out: message => output.push(message),
        error: message => errors.push(message),
      },
    )
    expect(exitCode).toBe(2)
    expect(errors).toEqual([])
    const result = JSON.parse(output.join('\n')) as { result: { dryRun: boolean, issues: unknown[] } }
    expect(result.result.dryRun).toBe(true)
    expect(result.result.issues.length).toBeGreaterThan(0)
  })

  it('emits exactly one sfc-parse-failed per malformed SFC, never duplicates', () => {
    const root = mkdtempSync(resolve(import.meta.dirname, '.tmp-parsefail-'))
    temporaryRoots.push(root)
    mkdirSync(resolve(root, 'src'), { recursive: true })
    writeFileSync(resolve(root, 'package.json'), JSON.stringify({
      name: 'test',
      dependencies: { vue: '~2.7.14', 'element-ui': '^2.15.14' },
    }))
    // Broken SFC: Vue parser cascades multiple errors from one malformed attribute
    writeFileSync(resolve(root, 'src/Broken.vue'), '<template>\n  <div :x="[1, 2 :y="z">{{ )( }}</div>\n</template>')

    const report = migrateVue2ToVue3(root, { dryRun: true })
    const parseFailures = report.issues.filter(i => i.code === 'sfc-parse-failed')
    expect(parseFailures).toHaveLength(1)
  })

  it('skips minified vendor bundles and emits no issues for them', () => {
    const root = mkdtempSync(resolve(import.meta.dirname, '.tmp-minified-'))
    temporaryRoots.push(root)
    mkdirSync(resolve(root, 'lib'), { recursive: true })
    writeFileSync(resolve(root, 'package.json'), JSON.stringify({
      name: 'test',
      dependencies: { vue: '~2.7.14' },
    }))
    writeFileSync(
      resolve(root, 'lib/vendor.min.js'),
      'Vue.use(Router);var x=function(){return this.$message("ok")}',
    )

    const report = migrateVue2ToVue3(root, { dryRun: true })
    const minifiedIssues = report.issues.filter(i => i.file.includes('min.js'))
    expect(minifiedIssues).toHaveLength(0)
  })
})
