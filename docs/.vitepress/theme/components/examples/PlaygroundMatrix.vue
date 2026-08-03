<script setup lang="ts">
import { computed } from 'vue'
import type { HomeLocale } from '../../content'

interface PlaygroundRow {
  stack: string
  run: string
  covers: string
  href: string
}

const props = defineProps<{
  locale: HomeLocale
}>()

const playgroundBase = 'https://github.com/daguanren21/vformjs/tree/main/playgrounds'

const copy = computed(() => props.locale === 'zh'
  ? {
      evalLabel: '评估流程',
      evalIntro: '启动任意一套 playground，按顺序走完这五步：',
      evalSteps: [
        '空表提交，确认宿主显示字段错误。',
        '加载编辑数据，改一个值，查看 dirty 和 changedPaths。',
        '重置，确认回到刚加载的记录。',
        '用 setErrors() 写入接口错误，再修改出错字段。',
        '切到详情模式，确认 submit 被拒绝。',
      ],
      cols: { stack: '技术栈', run: '运行', covers: '覆盖', source: '源码' },
      sourceText: '源码',
      rows: [
        {
          stack: 'Element Plus · Vue 3',
          run: 'pnpm dev:vue3',
          covers: '基础表单、CRUD 弹窗和页面、条件字段、跨字段规则、动态数组、Zod、自定义 adapter。',
          href: `${playgroundBase}/vue3-element-plus`,
        },
        {
          stack: 'element-ui · Vue 2.7',
          run: 'pnpm dev:vue2',
          covers: '同一套新建、编辑、详情、重置、提交流程，放进遗留技术栈验证。',
          href: `${playgroundBase}/vue2-element-ui`,
        },
        {
          stack: 'Naive UI · Vue 3',
          run: 'pnpm dev:naive',
          covers: '@vformjs/naive-ui — useNaiveForm、弹窗模式、宿主校验、Zod。',
          href: `${playgroundBase}/vue3-naive-ui`,
        },
        {
          stack: 'Ant Design Vue · Vue 3',
          run: 'pnpm dev:antd',
          covers: '@vformjs/ant-design-vue — 局部校验、滚动、弹窗模式、Zod。',
          href: `${playgroundBase}/vue3-antd-vue`,
        },
      ] satisfies PlaygroundRow[],
    }
  : {
      evalLabel: 'Evaluation path',
      evalIntro: 'Boot any playground, then walk these five checks in order:',
      evalSteps: [
        'Submit an empty form and inspect host errors.',
        'Load edit data, change a value, inspect dirty and changedPaths.',
        'Reset and confirm the loaded record returns.',
        'Apply API errors with setErrors(), then edit the failing field.',
        'Switch to detail and confirm submit is rejected.',
      ],
      cols: { stack: 'Stack', run: 'Run', covers: 'Covers', source: 'Source' },
      sourceText: 'Source',
      rows: [
        {
          stack: 'Element Plus · Vue 3',
          run: 'pnpm dev:vue3',
          covers: 'Basic forms, CRUD dialog + page, conditional fields, cross-field rules, dynamic arrays, Zod, custom adapter.',
          href: `${playgroundBase}/vue3-element-plus`,
        },
        {
          stack: 'element-ui · Vue 2.7',
          run: 'pnpm dev:vue2',
          covers: 'Same create / edit / detail / reset / submit lifecycle on the legacy stack.',
          href: `${playgroundBase}/vue2-element-ui`,
        },
        {
          stack: 'Naive UI · Vue 3',
          run: 'pnpm dev:naive',
          covers: '@vformjs/naive-ui — useNaiveForm, dialog modes, host validation, Zod.',
          href: `${playgroundBase}/vue3-naive-ui`,
        },
        {
          stack: 'Ant Design Vue · Vue 3',
          run: 'pnpm dev:antd',
          covers: '@vformjs/ant-design-vue — partial validation, scrolling, dialog modes, Zod.',
          href: `${playgroundBase}/vue3-antd-vue`,
        },
      ] satisfies PlaygroundRow[],
    })
</script>

<template>
  <div class="vx-matrix">
    <div class="vx-matrix__eval">
      <p class="vx-matrix__eval-head">
        <span class="vx-matrix__eval-label">{{ copy.evalLabel }}</span>
        <span class="vx-matrix__eval-intro">{{ copy.evalIntro }}</span>
      </p>
      <ol class="vx-matrix__eval-steps" :aria-label="copy.evalLabel">
        <li v-for="(step, i) in copy.evalSteps" :key="i">
          <span class="vx-matrix__eval-no">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="vx-matrix__eval-text">{{ step }}</span>
        </li>
      </ol>
    </div>

    <div class="vx-matrix__head" aria-hidden="true">
      <span>{{ copy.cols.stack }}</span>
      <span>{{ copy.cols.run }}</span>
      <span>{{ copy.cols.covers }}</span>
      <span>{{ copy.cols.source }}</span>
    </div>

    <ul class="vx-matrix__rows">
      <li v-for="row in copy.rows" :key="row.run" class="vx-matrix__row">
        <span class="vx-matrix__stack">{{ row.stack }}</span>
        <code class="vx-matrix__run">{{ row.run }}</code>
        <span class="vx-matrix__covers">{{ row.covers }}</span>
        <a
          class="vx-matrix__source"
          :href="row.href"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`${copy.sourceText}: ${row.stack}`"
        >{{ copy.sourceText }} ↗</a>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.vx-matrix {
  overflow: hidden;
  border: 1px solid var(--ph-line);
  border-radius: var(--ph-radius-lg, 14px);
  background: var(--ph-raised);
  box-shadow: var(--ph-shadow-sm);
}

/* ── evaluation path ──────────────────────────────────────── */

.vx-matrix__eval {
  padding: 18px clamp(16px, 3vw, 24px) 20px;
  border-bottom: 1px solid var(--ph-line);
}

.vx-matrix__eval-head {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: baseline;
  margin: 0;
}

.vx-matrix__eval-label {
  flex: 0 0 auto;
  color: var(--ph-ink);
  font-size: 0.88rem;
  font-weight: 650;
  line-height: 1.5;
}

.vx-matrix__eval-intro {
  min-width: 0;
  color: var(--ph-ink-soft);
  font-size: 0.84rem;
  line-height: 1.55;
}

.vx-matrix__eval-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
}

.vx-matrix__eval-steps li {
  display: flex;
  min-width: 0;
  margin: 0;
  padding: 12px 14px;
  gap: 10px;
  border-radius: var(--ph-radius, 10px);
  background: var(--ph-sunken);
}

.vx-matrix__eval-no {
  flex: 0 0 auto;
  color: var(--ph-accent);
  font-family: var(--ph-font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.6;
  font-variant-numeric: tabular-nums;
}

.vx-matrix__eval-text {
  min-width: 0;
  color: var(--ph-ink-soft);
  font-size: 0.78rem;
  line-height: 1.55;
}

/* ── run matrix ───────────────────────────────────────────── */

.vx-matrix__head {
  display: grid;
  grid-template-columns: minmax(150px, 0.8fr) minmax(120px, 0.6fr) minmax(0, 1.9fr) minmax(64px, auto);
  gap: 8px 16px;
  padding: 10px clamp(16px, 3vw, 24px);
  border-bottom: 1px solid var(--ph-line);
  background: var(--ph-sunken);
  color: var(--ph-ink-faint);
  font-size: 0.74rem;
  font-weight: 650;
  line-height: 1.5;
}

.vx-matrix__rows {
  margin: 0;
  padding: 0;
  list-style: none;
}

.vx-matrix__row {
  display: grid;
  grid-template-columns: minmax(150px, 0.8fr) minmax(120px, 0.6fr) minmax(0, 1.9fr) minmax(64px, auto);
  gap: 6px 16px;
  align-items: center;
  margin: 0;
  padding: 14px clamp(16px, 3vw, 24px);
}

.vx-matrix__row + .vx-matrix__row {
  border-top: 1px solid var(--ph-line);
}

.vx-matrix__stack {
  min-width: 0;
  color: var(--ph-ink);
  font-size: 0.88rem;
  font-weight: 650;
  line-height: 1.5;
}

code.vx-matrix__run {
  justify-self: start;
  min-width: 0;
  padding: 3px 9px;
  border: 1px solid var(--ph-line);
  border-radius: var(--ph-radius-sm, 7px);
  background: var(--ph-sunken);
  color: var(--ph-accent-strong);
  font-family: var(--ph-font-mono);
  font-size: 0.72rem;
  line-height: 1.55;
  white-space: nowrap;
}

.vx-matrix__covers {
  min-width: 0;
  color: var(--ph-ink-soft);
  font-size: 0.8rem;
  line-height: 1.6;
}

.vx-matrix__source {
  justify-self: end;
  color: var(--ph-accent);
  font-size: 0.78rem;
  font-weight: 650;
  line-height: 1.6;
  text-decoration: none;
  white-space: nowrap;
}

.vx-matrix__source:hover {
  color: var(--ph-accent-strong);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.vx-matrix__source:focus-visible {
  outline: 2px solid var(--ph-accent);
  outline-offset: 3px;
}

@media (max-width: 720px) {
  .vx-matrix__head {
    display: none;
  }

  .vx-matrix__row {
    grid-template-columns: 1fr auto;
  }

  .vx-matrix__covers {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
</style>
