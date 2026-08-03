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
  await form.submit()
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
          v-bind="form.host"
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

  overflow: hidden;
  border: 1px solid var(--ph-line);
  border-radius: var(--ph-radius-lg);
  background: var(--ph-raised);
  box-shadow: var(--ph-shadow-md);
}

.live-demo__header {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  justify-content: space-between;
  padding: clamp(24px, 4vw, 40px);
  border-bottom: 1px solid var(--ph-line);
}

.live-demo__eyebrow-line {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}

.live-demo__eyebrow {
  margin: 0;
  color: var(--ph-accent);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.live-demo__host {
  padding: 3px 10px;
  border: 1px solid var(--ph-line);
  border-radius: 999px;
  color: var(--ph-ink-faint);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.live-demo__title {
  max-width: 700px;
  margin: 0;
  color: var(--ph-ink);
  font-family: var(--ph-font-display);
  font-weight: 650;
  font-size: clamp(1.5rem, 2.6vw, 2.1rem);
  line-height: 1.14;
  letter-spacing: -0.015em;
  text-wrap: balance;
}

.live-demo__description {
  max-width: 680px;
  margin: 12px 0 0;
  color: var(--ph-ink-soft);
  font-size: 0.9375rem;
  line-height: 1.65;
  text-wrap: pretty;
}

.live-demo__status {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  padding: 6px 12px;
  border: 1px solid var(--ph-line);
  border-radius: 999px;
  background: var(--ph-sunken);
  color: var(--ph-ink-soft);
  font-size: 12px;
  font-weight: 600;
}

.live-demo__status-dot {
  width: 7px;
  height: 7px;
  background: var(--ph-line-strong);
  border-radius: 50%;
  transition: background-color 0.16s var(--ph-ease);
}

.live-demo__status.is-dirty .live-demo__status-dot {
  background: var(--ph-accent);
}

/* mode switch: one segmented control, not a tab strip */
.live-demo__modes {
  display: flex;
  width: max-content;
  max-width: calc(100% - 2 * clamp(24px, 4vw, 40px));
  margin: 16px clamp(24px, 4vw, 40px) 0;
  padding: 3px;
  gap: 2px;
  border: 1px solid var(--ph-line);
  border-radius: var(--ph-radius);
  background: var(--ph-sunken);
}

.live-demo__mode {
  min-width: 88px;
  padding: 7px 14px;
  border: 0;
  border-radius: var(--ph-radius-sm);
  background: transparent;
  color: var(--ph-ink-soft);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.3;
  cursor: pointer;
  touch-action: manipulation;
  transition:
    background-color 0.16s var(--ph-ease),
    color 0.16s var(--ph-ease),
    box-shadow 0.16s var(--ph-ease);
}

.live-demo__mode:hover:not(.is-active) {
  color: var(--ph-ink);
}

.live-demo__mode.is-active {
  background: var(--ph-raised);
  color: var(--ph-ink);
  box-shadow: var(--ph-shadow-sm);
}

.live-demo__body {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(300px, 0.95fr);
  gap: clamp(24px, 3.5vw, 44px);
  align-items: start;
  padding: clamp(22px, 3vw, 32px) clamp(24px, 4vw, 40px) clamp(24px, 4vw, 40px);
}

.live-demo__form-shell {
  min-width: 0;
}

.live-demo__form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.live-demo__form :deep(.el-form-item__label) {
  color: var(--ph-ink);
  font-weight: 650;
}

.live-demo :deep(.el-input__wrapper) {
  background: var(--ph-sunken);
  box-shadow: 0 0 0 1px var(--ph-line-strong) inset;
}

.live-demo :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px var(--ph-accent) inset,
    var(--ph-focus-ring);
}

.live-demo :deep(.el-button) {
  min-height: 38px;
  font-weight: 600;
  touch-action: manipulation;
}

.live-demo :deep(.el-button:focus-visible) {
  outline: 2px solid var(--ph-accent);
  outline-offset: 2px;
}

.live-demo :deep(.el-button--primary) {
  --el-button-bg-color: var(--ph-accent);
  --el-button-border-color: var(--ph-accent);
  --el-button-text-color: var(--ph-accent-fg);
  --el-button-hover-bg-color: var(--ph-accent-strong);
  --el-button-hover-border-color: var(--ph-accent-strong);
  --el-button-hover-text-color: var(--ph-accent-fg);
  --el-button-active-bg-color: var(--ph-accent-strong);
  --el-button-active-border-color: var(--ph-accent-strong);
}

.live-demo__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 4px;
}

.live-demo__actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.live-demo__detail-actions {
  margin-top: 18px;
}

.live-demo__detail :deep(.el-descriptions__label) {
  background: var(--ph-sunken) !important;
  color: var(--ph-ink-soft);
}

.live-demo__detail :deep(.el-descriptions__content) {
  background: var(--ph-raised) !important;
  color: var(--ph-ink);
}

/* runtime inspector: the navy band, rounded like every other surface */
.live-demo__inspector {
  min-width: 0;
  overflow: hidden;
  border-radius: var(--ph-radius);
  background: var(--ph-band-ink);
  box-shadow: var(--ph-shadow-sm);
  color: var(--ph-band-fg);
}

.live-demo__inspector-bar {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ph-band-line);
  color: var(--vx-band-muted);
  font: 650 0.66rem/1.5 var(--ph-font-mono);
  letter-spacing: 0.08em;
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
  border-bottom: 1px solid var(--ph-band-line);
}

.live-demo__inspector dl div:last-child {
  border-bottom: 0;
}

.live-demo__inspector dt,
.live-demo__inspector dd {
  min-width: 0;
  margin: 0;
  padding: 13px 16px;
}

.live-demo__inspector dt {
  color: var(--vx-band-muted);
  font: 500 0.72rem/1.5 var(--ph-font-mono);
}

.live-demo__inspector dd {
  overflow-wrap: anywhere;
}

.live-demo__inspector code {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--vx-band-value);
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
    width: auto;
  }

  .live-demo__mode {
    flex: 1;
    min-width: 0;
  }

  .live-demo__body {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .live-demo__mode,
  .live-demo__status-dot {
    transition: none;
  }
}
</style>
