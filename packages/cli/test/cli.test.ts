import {
  writeFileSync,
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { runCli, type CliIo } from '../src/cli'

const fixtureRoot = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const repositoryRoot = resolve(fixtureRoot, '../../../..')
const tsc = resolve(repositoryRoot, 'node_modules/.bin/tsc')
const temporaryRoots: string[] = []

function copyFixture(name: string): string {
  const root = mkdtempSync(resolve(fixtureRoot, `.tmp-${name}-`))
  temporaryRoots.push(root)
  cpSync(resolve(fixtureRoot, name), root, { recursive: true })
  return root
}

function captureIo(): { io: CliIo, output: string[], errors: string[] } {
  const output: string[] = []
  const errors: string[] = []
  return {
    output,
    errors,
    io: {
      out: message => output.push(message),
      error: message => errors.push(message),
    },
  }
}

function expectValidTypeScript(path: string): void {
  const projectRoot = resolve(dirname(path), '../..')
  const tsconfig = resolve(projectRoot, 'tsconfig.generated.json')
  const repositoryPrefix = relative(projectRoot, repositoryRoot).replaceAll('\\', '/')
  writeFileSync(tsconfig, `${JSON.stringify({
    compilerOptions: {
      module: 'ESNext',
      moduleResolution: 'Bundler',
      noEmit: true,
      paths: {
        '@vformjs/core': [`${repositoryPrefix}/packages/core/src/index.ts`],
        '@vformjs/vue': [`${repositoryPrefix}/packages/vue/src/index.ts`],
        '@vformjs/zod': [`${repositoryPrefix}/packages/zod/src/index.ts`],
        '@vformjs/element-plus': [`${repositoryPrefix}/packages/element-plus/src/index.ts`],
        '@vformjs/element-plus/zod': [`${repositoryPrefix}/packages/element-plus/src/use-zod-form.ts`],
        '@vformjs/element-ui': [`${repositoryPrefix}/packages/element-ui/src/index.ts`],
        '@vformjs/element-ui/zod': [`${repositoryPrefix}/packages/element-ui/src/use-zod-form.ts`],
        '@vformjs/naive-ui': [`${repositoryPrefix}/packages/naive-ui/src/index.ts`],
        '@vformjs/naive-ui/zod': [`${repositoryPrefix}/packages/naive-ui/src/use-zod-form.ts`],
        '@vformjs/ant-design-vue': [`${repositoryPrefix}/packages/ant-design-vue/src/index.ts`],
        '@vformjs/ant-design-vue/zod': [`${repositoryPrefix}/packages/ant-design-vue/src/use-zod-form.ts`],
        zod: [`${repositoryPrefix}/node_modules/zod`],
      },
      skipLibCheck: true,
      strict: true,
      target: 'ES2022',
    },
    files: [path],
  }, null, 2)}\n`)
  try {
    execFileSync(tsc, ['-p', tsconfig], {
      cwd: repositoryRoot,
      stdio: 'pipe',
    })
  }
  catch (error) {
    const failure = error as { stdout?: Buffer | string, stderr?: Buffer | string }
    throw new Error([
      failure.stdout?.toString(),
      failure.stderr?.toString(),
    ].filter(Boolean).join('\n'), { cause: error })
  }
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0))
    rmSync(root, { force: true, recursive: true })
})

describe('vformjs CLI fixtures', () => {
  it.each([
    { fixture: 'element-plus', host: 'element-plus', adapter: '@vformjs/element-plus', zod: false },
    { fixture: 'element-ui', host: 'element-ui', adapter: '@vformjs/element-ui', zod: false },
    { fixture: 'naive-ui', host: 'naive-ui', adapter: '@vformjs/naive-ui/zod', zod: true },
    { fixture: 'ant-design-vue', host: 'ant-design-vue', adapter: '@vformjs/ant-design-vue', zod: false },
  ])('detects and initializes $fixture idempotently', async ({ fixture, host, adapter, zod }) => {
    const root = copyFixture(fixture)
    const first = captureIo()
    expect(await runCli(['init', '--cwd', root], root, first.io)).toBe(0)
    expect(first.errors).toEqual([])
    expect(first.output.some(line => line === 'CREATE .vformjs.json')).toBe(true)

    const config = JSON.parse(readFileSync(resolve(root, '.vformjs.json'), 'utf8')) as {
      host: string
      zod: boolean
    }
    expect(config).toMatchObject({ host, zod })

    const formPath = resolve(root, 'src/forms/use-example-form.ts')
    const formSource = readFileSync(formPath, 'utf8')
    expect(formSource).toContain(`from '${adapter}'`)
    expect(formSource).toContain('createFieldPath')
    expect(formSource).toContain('SubmitHandlerResult<TError>')
    expect(formSource).toContain('v-bind="form.host"')
    expect(formSource).toContain('form.item(')
    expect(formSource).not.toContain('scrollToFirstError')
    if (zod) {
      expect(adapter.endsWith('/zod')).toBe(true)
      expect(formSource).toContain('z.input<')
      expect(formSource).toContain('z.output<')
    }
    else {
      expect(formSource).toContain('createRuleBuilders')
      expect(formSource).toContain('enUSRuleMessages')
      expect(formSource).not.toContain('useZodForm')
    }
    expectValidTypeScript(formPath)

    const second = captureIo()
    expect(await runCli(['init', '--cwd', root], root, second.io)).toBe(0)
    expect(second.output).toEqual([
      'UNCHANGED .vformjs.json',
      'UNCHANGED src/forms/use-example-form.ts',
    ])

    const doctor = captureIo()
    expect(await runCli(['doctor', '--cwd', root], root, doctor.io)).toBe(0)
    expect(doctor.output.some(line => line.includes('[PASS]') && line.includes(host))).toBe(true)

    const add = captureIo()
    expect(await runCli(['add', 'form', 'profile', '--cwd', root], root, add.io)).toBe(0)
    const addedPath = resolve(root, 'src/forms/use-profile-form.ts')
    expect(existsSync(addedPath)).toBe(true)
    expectValidTypeScript(addedPath)
  })

  it('keeps dry-run side-effect free and reports machine-readable actions', async () => {
    const root = copyFixture('element-plus')
    const capture = captureIo()
    expect(await runCli(['init', '--cwd', root, '--dry-run', '--json'], root, capture.io)).toBe(0)
    expect(existsSync(resolve(root, '.vformjs.json'))).toBe(false)
    expect(capture.output.join('\n')).toContain('would-create')
  })

  it('generates forms from an explicit custom preset', async () => {
    const root = copyFixture('element-plus')
    const capture = captureIo()
    expect(await runCli([
      'init',
      '--cwd',
      root,
      '--host',
      'company',
      '--adapter-package',
      '@vformjs/element-plus',
      '--form-factory',
      'useElForm',
    ], root, capture.io), capture.errors.join('\n')).toBe(0)

    const config = JSON.parse(
      readFileSync(resolve(root, '.vformjs.json'), 'utf8'),
    ) as {
      host: string
      preset: {
        adapterPackage: string
        formFactory: string
      }
    }
    expect(config).toMatchObject({
      host: 'company',
      preset: {
        adapterPackage: '@vformjs/element-plus',
        formFactory: 'useElForm',
      },
    })

    const formPath = resolve(root, 'src/forms/use-example-form.ts')
    expect(readFileSync(formPath, 'utf8')).toContain(
      `from '@vformjs/element-plus'`,
    )
    expectValidTypeScript(formPath)

    const doctor = captureIo()
    expect(await runCli(['doctor', '--cwd', root], root, doctor.io)).toBe(0)
    expect(doctor.output).toContain('[PASS] Configured host: company')
  })

  it('audits simple and complex forms without modifying sources', async () => {
    const root = copyFixture('element-plus')
    const sourceRoot = resolve(root, 'src')
    mkdirSync(sourceRoot, { recursive: true })
    writeFileSync(resolve(sourceRoot, 'SimpleForm.vue'), `
<script setup lang="ts">
import { useElForm } from '@vformjs/element-plus'
const form = useElForm({ defaults: { name: '' } })
</script>
<template><el-form v-bind="form.host" /></template>
`)
    writeFileSync(resolve(sourceRoot, 'ComplexForm.vue'), `
<script>
export default {
  props: { modelValue: Object },
  data() { return { rows: [] } },
  methods: { validate() { return this.$refs.form.validate() } },
}
</script>
<template>
  <CustomForm v-if="modelValue" ref="form">
    <div v-for="(row, index) in rows" :key="index" />
  </CustomForm>
</template>
`)

    const capture = captureIo()
    expect(await runCli([
      'audit',
      'forms',
      '--cwd',
      root,
      '--report',
      'reports/forms.json',
      '--json',
    ], root, capture.io), capture.errors.join('\n')).toBe(0)

    const output = JSON.parse(capture.output.join('\n')) as {
      result: {
        formsFound: number
        mechanical: number
        manual: number
        forms: Array<{
          file: string
          labels: string[]
          migration: string
        }>
      }
    }
    expect(output.result).toMatchObject({
      formsFound: 2,
      mechanical: 1,
      manual: 1,
    })
    expect(output.result.forms).toContainEqual(expect.objectContaining({
      file: 'src/SimpleForm.vue',
      migration: 'mechanical',
    }))
    expect(output.result.forms).toContainEqual(expect.objectContaining({
      file: 'src/ComplexForm.vue',
      migration: 'manual',
      labels: expect.arrayContaining([
        'conditional',
        'custom-host',
        'dynamic-array',
        'external-model',
        'options-api',
      ]),
    }))
    expect(existsSync(resolve(root, 'reports/forms.json'))).toBe(true)
  })

  it('installs the canonical coding-agent skill idempotently', async () => {
    const root = copyFixture('element-plus')
    const first = captureIo()
    expect(await runCli(['skill', 'install', '--cwd', root], root, first.io), first.errors.join('\n')).toBe(0)
    expect(existsSync(resolve(root, '.agents/skills/vformjs/SKILL.md'))).toBe(true)

    const second = captureIo()
    expect(await runCli(['skill', 'install', '--cwd', root], root, second.io), second.errors.join('\n')).toBe(0)
    expect(second.output.every(line => line.startsWith('UNCHANGED '))).toBe(true)
  })
})
