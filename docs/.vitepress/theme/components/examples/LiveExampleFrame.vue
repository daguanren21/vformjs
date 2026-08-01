<script setup lang="ts">
defineProps<{
  anchor: string
  index: string
  title: string
  description: string
  code: string
}>()
</script>

<template>
  <article :id="anchor" class="example-frame" :aria-labelledby="`${anchor}-title`">
    <header class="example-frame__header">
      <span class="example-frame__index">{{ index }}</span>
      <div>
        <h2 :id="`${anchor}-title`" class="example-frame__title">{{ title }}</h2>
        <p class="example-frame__description">{{ description }}</p>
      </div>
    </header>
    <div class="example-frame__body">
      <slot />
    </div>
    <footer class="example-frame__footer">
      <code>{{ code }}</code>
    </footer>
  </article>
</template>

<style scoped>
.example-frame {
  --el-color-primary: var(--ph-accent);
  --el-color-danger: var(--ph-accent);
  --el-text-color-primary: var(--ph-ink);
  --el-text-color-regular: var(--ph-ink-soft);
  --el-text-color-secondary: var(--ph-ink-faint);
  --el-border-color: var(--ph-line-strong);
  --el-border-color-light: var(--ph-line);
  --el-border-color-lighter: var(--ph-line);
  --el-fill-color-blank: var(--ph-raised);
  --el-fill-color-light: var(--ph-sunken);
  --el-bg-color: var(--ph-raised);
  --el-bg-color-overlay: var(--ph-raised);
  --el-border-radius-base: 0;

  scroll-margin-top: calc(var(--vp-nav-height, 64px) + 24px);
  border: 1px solid var(--ph-line-strong);
  background: var(--ph-raised);
  box-shadow: 7px 7px 0 color-mix(in srgb, var(--ph-ink) 18%, transparent);
}

.example-frame__header {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 18px;
  padding: clamp(22px, 4vw, 36px);
  border-bottom: 1px solid var(--ph-line);
}

.example-frame__index {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid var(--ph-accent);
  color: var(--ph-accent);
  font: 700 0.75rem/1 var(--ph-font-mono);
}

.example-frame__title {
  margin: 0;
  border: 0;
  color: var(--ph-ink);
  font-family: var(--ph-font-display);
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  line-height: 1.15;
  text-wrap: balance;
}

.example-frame__description {
  max-width: 760px;
  margin: 9px 0 0;
  color: var(--ph-ink-soft);
  line-height: 1.65;
  text-wrap: pretty;
}

.example-frame__body {
  min-width: 0;
  padding: clamp(20px, 4vw, 36px);
}

.example-frame__footer {
  padding: 14px clamp(20px, 4vw, 36px);
  border-top: 1px solid var(--ph-line);
  background: var(--ph-sunken);
}

.example-frame__footer code {
  color: var(--ph-accent);
  font-family: var(--ph-font-mono);
  font-size: 0.76rem;
  overflow-wrap: anywhere;
}

.example-frame :deep(.el-button),
.example-frame :deep(.el-input__wrapper),
.example-frame :deep(.el-select__wrapper),
.example-frame :deep(.el-textarea__inner) {
  border-radius: 0;
}

.example-frame :deep(.el-button + .el-button) {
  margin-left: 0;
}

.example-frame :deep(.el-button) {
  min-height: 38px;
  font-family: var(--ph-font-mono);
  font-weight: 650;
  touch-action: manipulation;
}

.example-frame :deep(.el-button--primary) {
  --el-button-bg-color: var(--ph-ink);
  --el-button-border-color: var(--ph-ink);
  --el-button-text-color: var(--ph-paper);
  --el-button-hover-bg-color: var(--ph-accent);
  --el-button-hover-border-color: var(--ph-accent);
  --el-button-active-bg-color: var(--ph-accent);
  --el-button-active-border-color: var(--ph-accent);
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

@media (max-width: 640px) {
  .example-frame__header {
    grid-template-columns: 1fr;
  }
}
</style>
