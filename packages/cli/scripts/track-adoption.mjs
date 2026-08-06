#!/usr/bin/env node
/**
 * Track CLI adoption signals for milestone: "First external .vformjs.json"
 * 
 * Run: node packages/cli/scripts/track-adoption.mjs
 * 
 * Signals:
 * 1. GitHub code search for .vformjs.json (excluding daguanren21/vformjs)
 * 2. npm download ratio: vformjs CLI / @vformjs/element-plus adapter
 * 3. Integration feedback issues in repo
 */

import { execSync } from 'node:child_process'

function exec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim()
  } catch {
    return null
  }
}

function ghSearch(query) {
  const result = exec(`gh search code '${query}' --json repository,path,url --limit 50`)
  return result ? JSON.parse(result) : []
}

function ghRepoSearch(query) {
  const result = exec(`gh search repos '${query}' --json fullName,url,stargazersCount --limit 20`)
  return result ? JSON.parse(result) : []
}

async function getNpmDownloads(pkg, period = 'last-week') {
  try {
    const response = await fetch(`https://api.npmjs.org/downloads/point/${period}/${pkg}`)
    const data = await response.json()
    return data.downloads || 0
  } catch {
    return 0
  }
}

async function main() {
  console.log('=== CLI Adoption Tracking ===')
  console.log(`Date: ${new Date().toISOString().split('T')[0]}`)
  console.log()

  // Signal 1: GitHub .vformjs.json files
  console.log('### 1. GitHub Code Search')
  const vformjsFiles = ghSearch('filename:.vformjs.json')
  const external = vformjsFiles.filter(f => !f.repository.fullName.includes('daguanren21/vformjs'))
  
  console.log(`Total .vformjs.json found: ${vformjsFiles.length}`)
  console.log(`External (non-repo): ${external.length}`)
  
  if (external.length > 0) {
    console.log('\n🎉 MILESTONE REACHED: First external .vformjs.json detected!')
    for (const file of external) {
      console.log(`  - ${file.repository.fullName}/${file.path}`)
      console.log(`    ${file.url}`)
    }
  } else {
    console.log('  No external adoption detected yet.')
  }
  console.log()

  // Signal 2: Repos with vformjs topic
  console.log('### 2. Repos with vformjs Topic')
  const topicRepos = ghRepoSearch('vformjs in:topics')
  const externalTopics = topicRepos.filter(r => !r.fullName.includes('daguanren21/vformjs'))
  
  console.log(`Total repos: ${topicRepos.length}`)
  console.log(`External: ${externalTopics.length}`)
  
  if (externalTopics.length > 0) {
    for (const repo of externalTopics) {
      console.log(`  - ${repo.fullName} (⭐ ${repo.stargazersCount})`)
    }
  }
  console.log()

  // Signal 3: npm downloads
  console.log('### 3. npm Downloads (last week)')
  const cliDownloads = await getNpmDownloads('vformjs')
  const adapterDownloads = await getNpmDownloads('@vformjs/element-plus')
  const ratio = adapterDownloads > 0 ? (cliDownloads / adapterDownloads * 100).toFixed(1) : 0
  
  console.log(`CLI (vformjs):              ${cliDownloads}`)
  console.log(`Adapter (@vformjs/element-plus): ${adapterDownloads}`)
  console.log(`Ratio:                      ${ratio}% (target: ≥10%)`)
  
  if (parseFloat(ratio) >= 10) {
    console.log('✅ CLI downloads meet the ≥10% threshold!')
  }
  console.log()

  // Signal 4: Integration feedback issues
  console.log('### 4. Integration Feedback Issues')
  const issuesJson = exec('gh issue list --label "integration-feedback" --json number,title,state --limit 50 --repo daguanren21/vformjs')
  const issues = issuesJson ? JSON.parse(issuesJson) : []
  const successReports = issues.filter(i => 
    i.title.toLowerCase().includes('success') || 
    i.title.toLowerCase().includes('adopted') ||
    i.title.toLowerCase().includes('integrated')
  )
  
  console.log(`Total integration-feedback issues: ${issues.length}`)
  console.log(`Success reports: ${successReports.length} (target: ≥2)`)
  
  if (successReports.length > 0) {
    for (const issue of successReports) {
      console.log(`  - #${issue.number}: ${issue.title} [${issue.state}]`)
    }
  }
  console.log()

  // Summary
  console.log('=== Milestone Status ===')
  const milestones = [
    { name: 'External .vformjs.json', met: external.length > 0, count: external.length },
    { name: 'CLI downloads ≥10% of adapter', met: parseFloat(ratio) >= 10, count: `${ratio}%` },
    { name: 'Success reports ≥2', met: successReports.length >= 2, count: successReports.length },
  ]
  
  for (const m of milestones) {
    const status = m.met ? '✅' : '⏳'
    console.log(`${status} ${m.name}: ${m.count}`)
  }
  
  const anyMet = milestones.some(m => m.met)
  if (anyMet) {
    console.log('\n🎯 At least one adoption signal detected!')
  } else {
    console.log('\n⏳ No adoption signals yet. Continue monitoring.')
  }
}

main().catch(console.error)
