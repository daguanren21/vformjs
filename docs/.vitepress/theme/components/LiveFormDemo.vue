<script setup lang="ts">
import { r, useElForm } from '@vformjs/element-plus'
import type { FormMode } from '@vformjs/element-plus'
import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElForm,
  ElFormItem,
  ElInput,
} from 'element-plus'
import { computed, nextTick, shallowRef } from 'vue'
import type { HomeLocale, LiveDemoCopy } from '../content'

const props = defineProps<{
  locale: HomeLocale
  copy: LiveDemoCopy
}>()

const submitted = shallowRef(false)

const form = useElForm({
  defaults: { name: '', email: '' },
  rules: {
    name: [r.required(props.locale === 'zh' ? '请填写姓名' : 'Enter your name')],
    email: [
      r.required(props.locale === 'zh' ? '请填写邮箱' : 'Enter your email'),
      r.email(props.locale === 'zh' ? '请填写有效邮箱' : 'Enter a valid email'),
    ],
  },
  onSubmit: async () => {
    submitted.value = true
  },
})

const statusLabel = computed(() => {
  if (form.readonly)
    return props.copy.status.readonly
  if (submitted.value)
    return props.copy.status.submitted
  return form.dirty ? props.copy.status.dirty : props.copy.status.clean
})

const inspectorRows = computed(() => [
  { key: 'mode', value: `'${form.mode}'` },
  { key: 'dirty', value: String(form.dirty) },
  { key: 'changedPaths', value: JSON.stringify(form.changedPaths) },
  { key: 'errors', value: JSON.stringify(form.errors) },
])

function loadMode(mode: FormMode) {
  submitted.value = false
  if (mode === 'create') {
    form.load('create')
    return
  }

  const values = props.locale === 'zh'
    ? { name: '林然', email: 'lin@example.com' }
    : { name: 'Ada Lovelace', email: 'ada@example.com' }
  form.load(mode, values)
}

async function submitDemo() {
  submitted.value = false
  const result = await form.submit()
  if (!result.ok)
    form.scrollToFirstError()
}

function resetDemo() {
  submitted.value = false
  form.reset()
}

async function loadApiError() {
  submitted.value = false
  form.setErrors({
    email: [props.locale === 'zh' ? '这个邮箱已被占用' : 'This email is already in use'],
  })
  await nextTick()
  form.scrollToFirstError()
}
</script>

<template>
  <div class="live-demo">
    <header class="live-demo__header">
      <div>
        <div class="live-demo__eyebrow-line">
          <p class="live-demo__eyebrow">{{ copy.eyebrow }}</p>
          <span class="live-demo__host">Element Plus</span>
        </div>
        <h2 class="live-demo__title">{{ copy.title }}</h2>
        <p class="live-demo__description">{{ copy.description }}</p>
      </div>
      <span
        class="live-demo__status"
        :class="{ 'is-dirty': form.dirty }"
        aria-live="polite"
      >
        <span class="live-demo__status-dot" aria-hidden="true" />
        {{ statusLabel }}
      </span>
    </header>

    <div
      class="live-demo__modes"
      role="group"
      :aria-label="locale === 'zh' ? '表单模式' : 'Form mode'"
    >
      <button
        v-for="mode in (['create', 'edit', 'detail'] as const)"
        :key="mode"
        class="live-demo__mode"
        :class="{ 'is-active': form.mode === mode }"
        type="button"
        :aria-pressed="form.mode === mode"
        @click="loadMode(mode)"
      >
        {{ copy.modes[mode] }}
      </button>
    </div>

    <div class="live-demo__body">
      <div class="live-demo__form-shell">
        <ElForm
          v-if="form.editable"
          v-bind="form.el"
          class="live-demo__form"
          label-position="top"
          @submit.prevent
        >
          <ElFormItem
            :label="copy.fields.name"
            prop="name"
            :error="form.errors.name?.[0]"
          >
            <ElInput
              id="demo-name"
              v-model="form.model.name"
              name="name"
              autocomplete="off"
              :placeholder="copy.placeholders.name"
            />
          </ElFormItem>

          <ElFormItem
            :label="copy.fields.email"
            prop="email"
            :error="form.errors.email?.[0]"
          >
            <ElInput
              id="demo-email"
              v-model="form.model.email"
              type="email"
              name="email"
              autocomplete="off"
              :placeholder="copy.placeholders.email"
            />
          </ElFormItem>

          <div class="live-demo__actions">
            <ElButton type="primary" :loading="form.submitting" @click="submitDemo">
              {{ copy.actions.submit }}
            </ElButton>
            <ElButton @click="resetDemo">
              {{ copy.actions.reset }}
            </ElButton>
            <ElButton @click="loadApiError">
              {{ copy.actions.loadError }}
            </ElButton>
          </div>
        </ElForm>

        <template v-else>
          <ElDescriptions class="live-demo__detail" :column="1" border>
            <ElDescriptionsItem :label="copy.fields.name">
              {{ form.model.name }}
            </ElDescriptionsItem>
            <ElDescriptionsItem :label="copy.fields.email">
              {{ form.model.email }}
            </ElDescriptionsItem>
          </ElDescriptions>
          <div class="live-demo__actions live-demo__detail-actions">
            <ElButton @click="resetDemo">
              {{ copy.actions.reset }}
            </ElButton>
          </div>
        </template>
      </div>

      <aside
        class="live-demo__inspector"
        :aria-label="locale === 'zh' ? '表单状态检查器' : 'Form state inspector'"
      >
        <div class="live-demo__inspector-bar">
          <span>form.state</span>
          <span>live</span>
        </div>
        <dl>
          <div v-for="row in inspectorRows" :key="row.key">
            <dt>{{ row.key }}</dt>
            <dd><code>{{ row.value }}</code></dd>
          </div>
        </dl>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.live-demo {
  --vf-line-strong: var(--ph-line-strong);
  --vf-line: var(--ph-line);
  --vf-surface: var(--ph-raised);
  --vf-shadow-solid: var(--ph-ink);
  --vf-accent: var(--ph-accent);
  --vf-on-accent: var(--ph-accent-fg);
  --vf-signal: var(--ph-accent);
  --vf-ink: var(--ph-ink);
  --vf-ink-muted: var(--ph-ink-soft);
  --vf-canvas: var(--ph-sunken);
  --vf-font-mono: var(--ph-font-mono);
  --vf-focus: var(--ph-accent-wash);
  --vf-code-bg: var(--ph-band-ink);
  --vf-code-ink: var(--ph-band-fg);
  --vf-code-line: var(--ph-band-line);
  --vf-code-muted: #b7ad99;
  --vf-code-accent: var(--ph-accent-on-ink);
  --el-color-primary: var(--vf-accent);
  --el-color-danger: var(--vf-accent);
  --el-text-color-primary: var(--vf-ink);
  --el-text-color-regular: var(--vf-ink-muted);
  --el-border-color: var(--vf-line);
  --el-border-color-light: var(--vf-line);
  --el-fill-color-blank: var(--vf-canvas);
  --el-bg-color: var(--vf-surface);
  --el-border-radius-base: 0;

  border: 1px solid var(--vf-line-strong);
  background: var(--vf-surface);
  box-shadow: 8px 8px 0 var(--vf-shadow-solid);
}

.live-demo__header {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  justify-content: space-between;
  padding: clamp(24px, 4vw, 48px);
  border-bottom: 1px solid var(--vf-line);
}

.live-demo__eyebrow-line {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.live-demo__eyebrow {
  margin: 0;
  color: var(--vf-accent);
  font: 700 0.72rem/1.2 var(--vf-font-mono);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.live-demo__host {
  padding: 4px 7px;
  border: 1px solid var(--vf-line);
  color: var(--vf-ink-muted);
  font: 650 0.65rem/1 var(--vf-font-mono);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.live-demo__title {
  max-width: 700px;
  margin: 0;
  color: var(--vf-ink);
  font-size: clamp(1.65rem, 3vw, 2.65rem);
  line-height: 1.08;
  text-wrap: balance;
}

.live-demo__description {
  max-width: 680px;
  margin: 14px 0 0;
  color: var(--vf-ink-muted);
  text-wrap: pretty;
}

.live-demo__status {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  padding: 8px 11px;
  border: 1px solid var(--vf-line);
  color: var(--vf-ink-muted);
  font: 650 0.7rem/1 var(--vf-font-mono);
  letter-spacing: 0.04em;
}

.live-demo__status-dot {
  width: 7px;
  height: 7px;
  background: var(--vf-accent);
  border-radius: 50%;
}

.live-demo__status.is-dirty .live-demo__status-dot {
  background: var(--vf-signal);
}

.live-demo__modes {
  display: flex;
  padding: 0 clamp(24px, 4vw, 48px);
  border-bottom: 1px solid var(--vf-line);
}

.live-demo__mode {
  min-width: 96px;
  padding: 14px 18px;
  border: 0;
  border-right: 1px solid var(--vf-line);
  background: transparent;
  color: var(--vf-ink-muted);
  font: 650 0.76rem/1 var(--vf-font-mono);
  cursor: pointer;
  touch-action: manipulation;
  transition: background-color 160ms ease, color 160ms ease;
}

.live-demo__mode:first-child {
  border-left: 1px solid var(--vf-line);
}

.live-demo__mode:hover:not(.is-active) {
  background: var(--vf-canvas);
  color: var(--vf-ink);
}

.live-demo__mode.is-active {
  background: var(--vf-accent);
  color: var(--vf-on-accent);
}

.live-demo__body {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
}

.live-demo__form-shell {
  min-width: 0;
  padding: clamp(24px, 4vw, 48px);
}

.live-demo__form :deep(.el-form-item) {
  margin-bottom: 22px;
}

.live-demo__form :deep(.el-form-item__label) {
  color: var(--vf-ink);
  font-weight: 700;
}

.live-demo :deep(.el-input__wrapper) {
  border-radius: 0;
  background: var(--vf-canvas);
  box-shadow: 0 0 0 1px var(--vf-line-strong) inset;
}

.live-demo :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--vf-accent) inset, 0 0 0 3px var(--vf-focus);
}

.live-demo :deep(.el-button) {
  min-height: 42px;
  border-radius: 0;
  font-family: var(--vf-font-mono);
  font-weight: 700;
  touch-action: manipulation;
}

.live-demo :deep(.el-button--primary) {
  --el-button-bg-color: var(--vf-ink);
  --el-button-border-color: var(--vf-ink);
  --el-button-text-color: var(--vf-canvas);
  --el-button-hover-bg-color: var(--vf-accent);
  --el-button-hover-border-color: var(--vf-accent);
  --el-button-active-bg-color: var(--vf-accent);
  --el-button-active-border-color: var(--vf-accent);
}

.live-demo__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 6px;
}

.live-demo__actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.live-demo__detail-actions {
  margin-top: 18px;
}

.live-demo__detail :deep(.el-descriptions__label),
.live-demo__detail :deep(.el-descriptions__content) {
  background: var(--vf-surface) !important;
  color: var(--vf-ink);
}

.live-demo__inspector {
  min-width: 0;
  border-left: 1px solid var(--vf-line-strong);
  background: var(--vf-code-bg);
  color: var(--vf-code-ink);
}

.live-demo__inspector-bar {
  display: flex;
  justify-content: space-between;
  padding: 13px 18px;
  border-bottom: 1px solid var(--vf-code-line);
  color: var(--vf-code-muted);
  font: 650 0.7rem/1 var(--vf-font-mono);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.live-demo__inspector dl {
  display: grid;
  gap: 0;
  margin: 0;
}

.live-demo__inspector dl div {
  display: grid;
  grid-template-columns: minmax(112px, 0.42fr) 1fr;
  border-bottom: 1px solid var(--vf-code-line);
}

.live-demo__inspector dt,
.live-demo__inspector dd {
  min-width: 0;
  margin: 0;
  padding: 14px 18px;
}

.live-demo__inspector dt {
  color: var(--vf-code-muted);
  font: 500 0.72rem/1.45 var(--vf-font-mono);
}

.live-demo__inspector dd {
  border-left: 1px solid var(--vf-code-line);
  overflow-wrap: anywhere;
}

.live-demo__inspector code {
  color: var(--vf-code-accent);
  font-size: 0.76rem;
}

@media (max-width: 760px) {
  .live-demo__header {
    display: grid;
  }

  .live-demo__status {
    justify-self: start;
  }

  .live-demo__modes {
    padding: 0;
  }

  .live-demo__mode {
    flex: 1;
    min-width: 0;
  }

  .live-demo__body {
    grid-template-columns: 1fr;
  }

  .live-demo__inspector {
    border-top: 1px solid var(--vf-line-strong);
    border-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .live-demo__mode {
    transition: none;
  }
}
</style>
