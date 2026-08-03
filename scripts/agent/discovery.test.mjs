import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import test from 'node:test'
import {
  buildRunnerInvocation,
  collectSignals,
  extractStructuredReport,
  executeInvocation,
  parseCliArgs,
  validateOpportunityReport,
} from './discovery.mjs'

function validReport(runId, signalIds) {
  return {
    schemaVersion: 1,
    runId,
    summary: 'One evidence-backed opportunity.',
    signalIdsReviewed: signalIds,
    opportunities: [
      {
        id: 'OPP-20260803-reset-contract',
        title: 'Make reset baseline behavior observable',
        hypothesis: 'CRUD users need explicit save-and-rebase behavior.',
        productBoundary: 'inside',
        evidence: [{ sourceId: signalIds[0], claim: 'The collected source identifies reset behavior.' }],
        alternativeExplanations: ['The gap may only require a documentation example.'],
        confidence: 0.72,
        scores: {
          pain: 4,
          reach: 3,
          productFit: 5,
          differentiation: 4,
          timing: 3,
          complexity: 2,
          compatibilityRisk: 2,
        },
        risk: 'R1',
        experiment: {
          type: 'docs-smoke',
          question: 'Can a new user save and rebase without guessing?',
          procedure: ['Run the edit-and-save scenario with the current guide.'],
          successCriteria: ['The user selects rebaseDefaults without correction.'],
          killCriteria: ['The current guide already produces the correct behavior.'],
        },
        recommendation: 'experiment',
        humanAttention: 'none',
        rationale: 'The experiment is isolated and stays within the lifecycle boundary.',
      },
    ],
    horizonRisks: [],
    discardedSignals: [],
  }
}

test('parses discovery CLI options and rejects unknown options', () => {
  assert.deepEqual(parseCliArgs(['run', '--runner', 'codex', '--dry-run']), {
    command: 'run',
    flags: new Set(['dry-run']),
    values: { runner: 'codex' },
  })
  assert.throws(() => parseCliArgs(['run', '--unknown']), /Unknown option/)
})

test('builds read-only invocations for all three runners', () => {
  const options = {
    prompt: 'Analyze signals.json',
    signalsText: '{"schemaVersion":1}',
    rawOutputPath: '/tmp/raw.json',
    root: '/repo',
    schemaPath: '/repo/schema.json',
    schemaText: '{"type":"object"}',
  }

  const codex = buildRunnerInvocation('codex', options)
  assert.equal(codex.command, process.env.DISCOVERY_CODEX_BIN ?? 'codex')
  assert.ok(codex.args.includes('read-only'))
  assert.ok(!codex.args.includes('workspace-write'))
  assert.match(codex.stdin, /^\$product-discovery/)

  process.env.DISCOVERY_CODEX_IGNORE_USER_CONFIG = '1'
  assert.ok(buildRunnerInvocation('codex', options).args.includes('--ignore-user-config'))
  delete process.env.DISCOVERY_CODEX_IGNORE_USER_CONFIG

  const omp = buildRunnerInvocation('omp', options)
  assert.equal(omp.command, process.env.DISCOVERY_OMP_BIN ?? 'omp')
  assert.equal(omp.args[omp.args.indexOf('--tools') + 1], 'read,grep,glob')
  assert.ok(!omp.args.some(argument => argument.includes('edit,') || argument.includes('bash,')))
  assert.match(omp.args.at(-1), /^\/skill:product-discovery/)
  assert.match(omp.args.at(-1), /<untrusted-signal-bundle>/)

  const claude = buildRunnerInvocation('claude', options)
  assert.equal(claude.command, process.env.DISCOVERY_CLAUDE_BIN ?? 'claude')
  assert.equal(claude.args[claude.args.indexOf('--allowedTools') + 1], 'Read,Grep,Glob')
  assert.match(claude.stdin, /^\/product-discovery/)
})

test('extracts structured reports from Codex, OMP, and Claude output', () => {
  const report = validReport('run-1', ['signal-1'])
  assert.deepEqual(extractStructuredReport(JSON.stringify(report), 'codex'), report)
  assert.deepEqual(extractStructuredReport(`result\n\`\`\`json\n${JSON.stringify(report)}\n\`\`\``, 'omp'), report)
  assert.deepEqual(extractStructuredReport(JSON.stringify({ structured_output: report }), 'claude'), report)
})

test('validates evidence coverage and human-attention invariants', () => {
  const bundle = { runId: 'run-1', signals: [{ id: 'signal-1' }] }
  const report = validReport(bundle.runId, ['signal-1'])
  assert.deepEqual(validateOpportunityReport(report, bundle), [])


  report.opportunities[0].risk = 'R2'
  assert.ok(validateOpportunityReport(report, bundle).some(error => error.includes('humanAttention none')))

  report.opportunities[0].humanAttention = 'action_required'
  report.opportunities[0].evidence[0].sourceId = 'missing'
  assert.ok(validateOpportunityReport(report, bundle).some(error => error.includes('unknown signal missing')))
})
test('preserves partial runner output when a process times out', async () => {
  const result = await executeInvocation({
    command: process.execPath,
    args: ['-e', 'process.stdout.write("partial"); setTimeout(() => {}, 10_000)'],
  }, process.cwd(), 250)
  assert.equal(result.code, 124)
  assert.equal(result.stdout, 'partial')
  assert.match(result.stderr, /exceeded 250ms/)
})

test('collects a normalized repository signal without live network access', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'vformjs-discovery-'))
  try {
    const configDirectory = resolve(root, '.agent-engineering')
    await mkdir(configDirectory, { recursive: true })
    await writeFile(resolve(configDirectory, 'config.json'), JSON.stringify({
      schemaVersion: 1,
      product: { name: 'vformjs', boundaries: ['Keep the host Form.'] },
      collection: {
        lookbackDays: 30,
        maxItemsPerSource: 5,
        ownRepository: 'daguanren21/vformjs',
        npmPackages: ['vformjs'],
        upstreamRepositories: [],
        githubIssueQueries: [],
      },
    }))

    const fakeFetch = async (input) => {
      const url = String(input)
      if (url.includes('api.npmjs.org')) {
        return new Response(JSON.stringify({ error: 'package vformjs not found' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404,
          statusText: 'Not Found',
        })
      }
      const payload = url.includes('/issues?')
        ? []
        : {
            html_url: 'https://github.com/daguanren21/vformjs',
            description: 'Typed CRUD lifecycle',
            updated_at: '2026-08-03T00:00:00.000Z',
            forks_count: 0,
            open_issues_count: 0,
            stargazers_count: 0,
            subscribers_count: 0,
          }
      return new Response(JSON.stringify(payload), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const outputPath = resolve(root, 'signals.json')
    const result = await collectSignals({
      configPath: '.agent-engineering/config.json',
      env: {},
      fetchImpl: fakeFetch,
      now: new Date('2026-08-03T00:00:00.000Z'),
      outputPath,
      root,
    })
    assert.equal(result.bundle.signals.length, 2)
    assert.ok(result.bundle.signals.some(signal => signal.kind === 'repository'))
    assert.ok(result.bundle.signals.some(signal => signal.kind === 'npm-package-state'))
    assert.equal(result.bundle.sourceSummary.find(source => source.id === 'npm:vformjs').status, 'ok')
    assert.equal(result.bundle.sourceSummary.find(source => source.id === 'own-discussions').status, 'skipped')
    assert.equal(JSON.parse(await readFile(outputPath, 'utf8')).runId, result.bundle.runId)
  }
  finally {
    await rm(root, { force: true, recursive: true })
  }
})
