<script setup lang="ts">
import { computed } from 'vue'
import type { HomeLocale } from '../../content'

interface ScenarioItem {
  anchor: string
  index: string
  capability: string
  goal: string
  verify: string[]
  start?: boolean
}

const props = defineProps<{
  locale: HomeLocale
}>()

const copy = computed(() => props.locale === 'zh'
  ? {
      label: '现场场景 · 4',
      order: '建议顺序 01 → 04',
      start: '从这里开始',
      verifyLabel: '验证点',
      items: [
        {
          anchor: 'dialog-crud',
          index: '01',
          capability: '弹窗 CRUD',
          goal: '一个表单实例在弹窗里贯穿新建、编辑、详情三种模式。',
          verify: ['load(mode)', 'dirty', 'changedPaths', '详情只读'],
          start: true,
        },
        {
          anchor: 'conditional-linkage',
          index: '02',
          capability: '条件与联动',
          goal: '显隐、按需校验、省市联动都写在普通 TypeScript 里。',
          verify: ['when', 'conditional rules', 'linkage'],
        },
        {
          anchor: 'zod-list',
          index: '03',
          capability: '动态数组 + Zod',
          goal: '成员行保持稳定 key，提交返回 schema 解析后的数据。',
          verify: ['form.list()', 'fieldPath()', '解析输出'],
        },
        {
          anchor: 'save-error-scroll',
          index: '04',
          capability: '保存失败定位',
          goal: '点击保存后，长表单自动滚动到第一个错误字段。',
          verify: ['submit()', 'scrollToError', '宿主字段滚动'],
        },
      ] satisfies ScenarioItem[],
      note: '每个场景持有独立表单实例，状态互不影响。只想看单个紧凑表单？首页还有一个实时实例。',
      noteLink: '去首页看看',
      noteHref: '/zh/#live-demo',
    }
  : {
      label: 'Live scenarios · 4',
      order: 'Recommended order 01 → 04',
      start: 'Start here',
      verifyLabel: 'Verify',
      items: [
        {
          anchor: 'dialog-crud',
          index: '01',
          capability: 'Dialog CRUD',
          goal: 'One form instance runs create, edit, and detail behind a dialog.',
          verify: ['load(mode)', 'dirty', 'changedPaths', 'read-only detail'],
          start: true,
        },
        {
          anchor: 'conditional-linkage',
          index: '02',
          capability: 'Conditional + linkage',
          goal: 'Visibility, active-only rules, and province→city resets stay in plain TypeScript.',
          verify: ['when', 'conditional rules', 'linkage'],
        },
        {
          anchor: 'zod-list',
          index: '03',
          capability: 'Dynamic array + Zod',
          goal: 'Member rows keep stable keys; submit returns schema-parsed data.',
          verify: ['form.list()', 'fieldPath()', 'parsed output'],
        },
        {
          anchor: 'save-error-scroll',
          index: '04',
          capability: 'Save-error navigation',
          goal: 'Saving a long form scrolls directly to its first invalid field.',
          verify: ['submit()', 'scrollToError', 'host field scroll'],
        },
      ] satisfies ScenarioItem[],
      note: 'Each scenario owns its form instance — state never leaks between them. Prefer one compact form? The home page runs a single live instance.',
      noteLink: 'Open the home demo',
      noteHref: '/#live-demo',
    })
</script>

<template>
  <nav class="vx-overview" :aria-label="copy.label">
    <div class="vx-overview__head">
      <span class="vx-overview__label">{{ copy.label }}</span>
      <span class="vx-overview__order">{{ copy.order }}</span>
    </div>

    <ol class="vx-overview__items">
      <li v-for="item in copy.items" :key="item.anchor">
        <a class="vx-overview__item" :href="`#${item.anchor}`">
          <span class="vx-overview__top">
            <span class="vx-overview__index">{{ item.index }}</span>
            <span class="vx-overview__anchor">#{{ item.anchor }}</span>
            <span class="vx-overview__jump" aria-hidden="true">↓</span>
          </span>
          <span class="vx-overview__capability">
            {{ item.capability }}
            <em v-if="item.start" class="vx-overview__start">{{ copy.start }}</em>
          </span>
          <span class="vx-overview__goal">{{ item.goal }}</span>
          <span class="vx-overview__verify">
            <span class="vx-overview__verify-label">{{ copy.verifyLabel }}</span>
            <code v-for="point in item.verify" :key="point">{{ point }}</code>
          </span>
        </a>
      </li>
    </ol>

    <p class="vx-overview__note">
      {{ copy.note }}
      <a :href="copy.noteHref">{{ copy.noteLink }} →</a>
    </p>
  </nav>
</template>

<style scoped>
.vx-overview {
  overflow: hidden;
  border: 1px solid var(--ph-line);
  border-radius: var(--ph-radius-lg, 14px);
  background: var(--ph-raised);
  box-shadow: var(--ph-shadow-sm);
}

.vx-overview__head {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  align-items: baseline;
  justify-content: space-between;
  padding: 14px clamp(16px, 3vw, 24px);
  border-bottom: 1px solid var(--ph-line);
}

.vx-overview__label {
  color: var(--ph-ink);
  font-size: 0.88rem;
  font-weight: 650;
  line-height: 1.5;
}

.vx-overview__order {
  color: var(--ph-ink-faint);
  font-size: 0.78rem;
  line-height: 1.5;
}

.vx-overview__items {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
  padding: 16px clamp(16px, 3vw, 24px);
  list-style: none;
}

.vx-overview__items li {
  min-width: 0;
  margin: 0;
}

.vx-overview__item {
  display: flex;
  height: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
  padding: 16px 18px;
  border: 1px solid var(--ph-line);
  border-radius: var(--ph-radius, 10px);
  background: var(--ph-sunken);
  color: inherit;
  text-decoration: none;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.vx-overview__item:hover {
  border-color: var(--ph-accent);
  background: var(--ph-raised);
  box-shadow: var(--ph-shadow-sm);
}

.vx-overview__item:focus-visible {
  outline: none;
  border-color: var(--ph-accent);
  box-shadow: var(--ph-focus-ring);
}

.vx-overview__top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.vx-overview__index {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: var(--ph-radius-sm, 7px);
  background: var(--ph-accent-wash);
  color: var(--ph-accent);
  font-family: var(--ph-font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.vx-overview__anchor {
  min-width: 0;
  color: var(--ph-ink-faint);
  font-family: var(--ph-font-mono);
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.vx-overview__jump {
  margin-left: auto;
  color: var(--ph-accent);
  font-size: 0.86rem;
  font-weight: 600;
  line-height: 1;
}

.vx-overview__capability {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: center;
  color: var(--ph-ink);
  font-size: 0.94rem;
  font-weight: 650;
  line-height: 1.4;
}

.vx-overview__start {
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--ph-accent);
  color: var(--ph-accent-fg, #fff);
  font-size: 0.66rem;
  font-style: normal;
  font-weight: 650;
  line-height: 1.5;
}

.vx-overview__goal {
  color: var(--ph-ink-soft);
  font-size: 0.84rem;
  line-height: 1.6;
}

.vx-overview__verify {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  align-items: center;
  margin-top: auto;
  padding-top: 4px;
}

.vx-overview__verify-label {
  color: var(--ph-ink-faint);
  font-size: 0.72rem;
  font-weight: 650;
  line-height: 1.6;
}

.vx-overview__verify code {
  padding: 2px 7px;
  border: 1px solid var(--ph-line);
  border-radius: var(--ph-radius-sm, 7px);
  background: var(--ph-raised);
  color: var(--ph-accent-strong);
  font-family: var(--ph-font-mono);
  font-size: 0.66rem;
  line-height: 1.6;
}

.vx-overview__note {
  margin: 0;
  padding: 12px clamp(16px, 3vw, 24px);
  border-top: 1px solid var(--ph-line);
  color: var(--ph-ink-faint);
  font-size: 0.8rem;
  line-height: 1.6;
}

.vx-overview__note a {
  color: var(--ph-accent);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.vx-overview__note a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.vx-overview__note a:focus-visible {
  outline: 2px solid var(--ph-accent);
  outline-offset: 3px;
}

@media (max-width: 860px) {
  .vx-overview__items {
    grid-template-columns: 1fr;
  }
}
</style>
