<script setup lang="ts">
import { computed, type PropType } from 'vue'
import type { HomeLocale } from '../../content'

const props = defineProps({
  locale: { type: String as PropType<HomeLocale>, required: true },
  anchor: { type: String, required: true },
  index: { type: String, required: true },
  capability: { type: String, required: true },
  title: { type: String, required: true },
  goal: { type: String, required: true },
  steps: {
    type: Array as PropType<string[]>,
    required: true,
    validator: (value: unknown) => Array.isArray(value) && value.length >= 2 && value.length <= 4,
  },
  expect: { type: String, required: true },
  apis: { type: Array as PropType<string[]>, required: true },
  sourceHref: { type: String, required: true },
  stateLabel: { type: String, required: true },
})

const chrome = computed(() => props.locale === 'zh'
  ? { source: '源码', expect: '预期', keyApi: '关键 API', steps: '操作步骤' }
  : { source: 'Source', expect: 'Expect', keyApi: 'Key API', steps: 'Try it' })
</script>

<template>
  <article :id="anchor" class="example-frame" :aria-labelledby="`${anchor}-title`">
    <header class="example-frame__header">
      <div class="example-frame__meta">
        <span class="example-frame__index">{{ index }}</span>
        <span class="example-frame__capability">{{ capability }}</span>
        <a
          class="example-frame__source"
          :href="sourceHref"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`${chrome.source} — ${capability}`"
        >{{ chrome.source }} ↗</a>
      </div>
      <h2 :id="`${anchor}-title`" class="example-frame__title">{{ title }}</h2>
      <p class="example-frame__goal">{{ goal }}</p>
      <ol class="example-frame__steps" :aria-label="chrome.steps">
        <li v-for="(step, i) in steps" :key="i">
          <span class="example-frame__step-no">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="example-frame__step-text">{{ step }}</span>
        </li>
      </ol>
      <p class="example-frame__expect">
        <span class="example-frame__expect-label">{{ chrome.expect }}</span>
        <span class="example-frame__expect-text">{{ expect }}</span>
      </p>
    </header>

    <div class="example-frame__body">
      <div class="example-frame__demo">
        <slot />
      </div>
      <aside v-if="$slots.state" class="example-frame__state" :aria-label="stateLabel">
        <p class="example-frame__state-label">{{ stateLabel }}</p>
        <div class="example-frame__state-body">
          <slot name="state" />
        </div>
      </aside>
    </div>

    <footer class="example-frame__footer">
      <span class="example-frame__footer-label">{{ chrome.keyApi }}</span>
      <code v-for="api in apis" :key="api" class="example-frame__api">{{ api }}</code>
    </footer>
  </article>
</template>

<style scoped>
.example-frame {
  /* Element Plus speaks the cool-minimal control language */
  --el-color-primary: var(--ph-accent);
  --el-color-danger: #dc2626;
  --el-color-error: #dc2626;
  --el-text-color-primary: var(--ph-ink);
  --el-text-color-regular: var(--ph-ink-soft);
  --el-text-color-secondary: var(--ph-ink-faint);
  --el-border-color: var(--ph-line-strong);
  --el-border-color-light: var(--ph-line);
  --el-border-color-lighter: var(--ph-line);
  --el-border-color-hover: var(--ph-ink-faint);
  --el-fill-color-blank: var(--ph-raised);
  --el-fill-color-light: var(--ph-sunken);
  --el-bg-color: var(--ph-raised);
  --el-bg-color-overlay: var(--ph-raised);
  --el-border-radius-base: 8px;
  --el-border-radius-small: 6px;

  scroll-margin-top: calc(var(--vp-nav-height, 64px) + 24px);
  overflow: hidden;
  border: 1px solid var(--ph-line);
  border-radius: var(--ph-radius-lg, 14px);
  background: var(--ph-raised);
  box-shadow: var(--ph-shadow-md, 0 16px 40px -24px rgba(15, 23, 42, 0.28));
}

/* ── header: the briefing ─────────────────────────────────── */

.example-frame__header {
  padding: clamp(22px, 4vw, 36px);
  border-bottom: 1px solid var(--ph-line);
}

.example-frame__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: center;
}

.example-frame__index {
  display: grid;
  min-width: 30px;
  height: 30px;
  padding: 0 8px;
  place-items: center;
  border-radius: var(--ph-radius-sm, 7px);
  background: var(--ph-accent);
  color: var(--ph-accent-fg, #fff);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.example-frame__capability {
  color: var(--ph-ink);
  font-size: 0.8rem;
  font-weight: 650;
  line-height: 1.4;
}

.example-frame__source {
  margin-left: auto;
  padding: 5px 11px;
  border: 1px solid var(--ph-line);
  border-radius: 999px;
  color: var(--ph-accent);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.4;
  text-decoration: none;
  transition: border-color 160ms ease, background-color 160ms ease;
}

.example-frame__source:hover {
  border-color: var(--ph-accent);
  background: var(--ph-accent-wash);
  color: var(--ph-accent-strong);
}

.example-frame__source:focus-visible {
  outline: none;
  border-color: var(--ph-accent);
  box-shadow: var(--ph-focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.35));
}

.example-frame__title {
  margin: 18px 0 0;
  padding: 0;
  border: 0;
  color: var(--ph-ink);
  font-family: var(--ph-font-display);
  font-size: clamp(1.35rem, 2.2vw, 1.8rem);
  line-height: 1.18;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

.example-frame__goal {
  max-width: 72ch;
  margin: 10px 0 0;
  color: var(--ph-ink-soft);
  font-size: 0.92rem;
  line-height: 1.65;
  text-wrap: pretty;
}

.example-frame__steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin: 22px 0 0;
  padding: 0;
  list-style: none;
}

.example-frame__steps li {
  display: flex;
  min-width: 0;
  margin: 0;
  padding: 12px 14px;
  gap: 10px;
  border-radius: var(--ph-radius, 10px);
  background: var(--ph-sunken);
}

.example-frame__step-no {
  flex: 0 0 auto;
  color: var(--ph-accent);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.6;
  font-variant-numeric: tabular-nums;
}

.example-frame__step-text {
  min-width: 0;
  color: var(--ph-ink-soft);
  font-size: 0.8rem;
  line-height: 1.55;
}

.example-frame__expect {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  align-items: baseline;
  margin: 16px 0 0;
  padding: 10px 14px;
  border-left: 3px solid var(--ph-accent);
  border-radius: var(--ph-radius-sm, 7px);
  background: var(--ph-accent-wash);
  font-size: 0.84rem;
  line-height: 1.55;
}

.example-frame__expect-label {
  flex: 0 0 auto;
  color: var(--ph-accent-strong);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.7;
}

.example-frame__expect-text {
  min-width: 0;
  color: var(--ph-ink-soft);
}

/* ── body: workbench + state readout ──────────────────────── */

.example-frame__body {
  display: grid;
  gap: 24px;
  padding: clamp(20px, 4vw, 36px);
}

.example-frame__demo {
  min-width: 0;
}

.example-frame__state {
  min-width: 0;
  align-self: start;
  overflow: hidden;
  border-radius: var(--ph-radius, 10px);
  background: var(--ph-band-ink);
  box-shadow: var(--ph-shadow-sm);
}

.example-frame__state-label {
  margin: 0;
  padding: 11px 14px;
  border-bottom: 1px solid var(--ph-band-line);
  color: var(--vx-band-muted);
  font: 650 0.66rem/1.5 var(--ph-font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.example-frame__state-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 10px;
  padding: 12px 14px 14px;
}

/* state cells: demos render <p><span>label</span><code>value</code></p> */
.example-frame__state-body > :deep(p) {
  display: grid;
  min-width: 0;
  margin: 0;
  gap: 3px;
  padding: 10px 12px;
  border: 1px solid var(--ph-band-line);
  border-radius: 8px;
  background: color-mix(in srgb, var(--ph-band-fg) 4%, transparent);
}

.example-frame__state-body > :deep(p span) {
  min-width: 0;
  color: var(--vx-band-muted);
  font: 600 0.64rem/1.5 var(--ph-font-mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.example-frame__state-body > :deep(p code) {
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--vx-band-value);
  font-family: var(--ph-font-mono);
  font-size: 0.74rem;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

@media (min-width: 1280px) {
  .example-frame__body {
    grid-template-columns: minmax(0, 1fr) minmax(272px, 300px);
    gap: 28px;
    align-items: start;
  }

  .example-frame__state-body {
    grid-template-columns: 1fr;
  }
}

/* ── footer: key API chips ────────────────────────────────── */

.example-frame__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
  align-items: center;
  padding: 12px clamp(20px, 4vw, 36px);
  border-top: 1px solid var(--ph-line);
  background: var(--ph-sunken);
}

.example-frame__footer-label {
  color: var(--ph-ink-faint);
  font: 700 0.66rem/1.5 var(--ph-font-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

code.example-frame__api {
  margin: 0;
  padding: 3px 9px;
  border: 1px solid var(--ph-line);
  border-radius: var(--ph-radius-sm, 7px);
  background: var(--ph-raised);
  color: var(--ph-accent-strong);
  font-family: var(--ph-font-mono);
  font-size: 0.7rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

/* ── Element Plus integration ─────────────────────────────── */

.example-frame :deep(.el-button + .el-button) {
  margin-left: 0;
}

.example-frame :deep(.el-button) {
  min-height: 38px;
  font-weight: 600;
  touch-action: manipulation;
}

.example-frame :deep(.el-button:focus-visible) {
  outline: 2px solid var(--ph-accent);
  outline-offset: 2px;
}

/* filled primary is the calm accent… */
.example-frame :deep(.el-button--primary:not(.is-link):not(.is-text)) {
  --el-button-bg-color: var(--ph-accent);
  --el-button-border-color: var(--ph-accent);
  --el-button-text-color: var(--ph-accent-fg);
  --el-button-hover-bg-color: var(--ph-accent-strong);
  --el-button-hover-border-color: var(--ph-accent-strong);
  --el-button-hover-text-color: var(--ph-accent-fg);
  --el-button-active-bg-color: var(--ph-accent-strong);
  --el-button-active-border-color: var(--ph-accent-strong);
}

/* …while link/text primary stays a plainly readable blue action */
.example-frame :deep(.el-button--primary.is-link),
.example-frame :deep(.el-button--primary.is-text) {
  --el-button-text-color: var(--ph-accent);
  --el-button-hover-text-color: var(--ph-accent-strong);
  --el-button-active-text-color: var(--ph-accent-strong);
}

.example-frame :deep(.el-form-item__label) {
  color: var(--ph-ink);
  font-weight: 650;
}

.example-frame :deep(.el-input__wrapper),
.example-frame :deep(.el-select__wrapper),
.example-frame :deep(.el-textarea__inner) {
  background: var(--ph-sunken);
  box-shadow: 0 0 0 1px var(--ph-line-strong) inset;
}
</style>
