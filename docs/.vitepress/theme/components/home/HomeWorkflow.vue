<script setup lang="ts">
import type { HomeCopy } from '../../content'
import HomeSectionHead from './HomeSectionHead.vue'

defineProps<{
  workflow: HomeCopy['workflow']
}>()
</script>

<template>
  <section class="ph-section workflow">
    <div class="ph-inner ph-ruled">
      <HomeSectionHead
        :eyebrow="workflow.eyebrow"
        :title="workflow.title"
        :description="workflow.description"
      />
      <ol class="steps ph-reveal">
        <li v-for="step in workflow.steps" :key="step.number" class="step">
          <span class="tick" aria-hidden="true"></span>
          <span class="number">{{ step.number }}</span>
          <h3 class="step-title">{{ step.title }}</h3>
          <p class="step-desc">{{ step.description }}</p>
          <code class="step-code">{{ step.code }}</code>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
/* a ruler track: one shared line, each step hangs off its own tick */
.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(28px, 4vw, 48px);
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--ph-line-strong);
}

.step {
  position: relative;
  padding-top: 28px;
}

.tick {
  position: absolute;
  top: -1px;
  left: 0;
  width: 2px;
  height: 14px;
  background: var(--ph-accent);
}

.number {
  display: block;
  font-family: var(--ph-font-mono);
  font-size: 12px;
  letter-spacing: 0.12em;
  color: var(--ph-accent);
}

.step-title {
  margin: 14px 0 0;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.4;
}

.step-desc {
  margin: 8px 0 0;
  font-size: 0.9375rem;
  line-height: 1.65;
  color: var(--ph-ink-soft);
}

.step-code {
  display: inline-block;
  max-width: 100%;
  margin-top: 16px;
  padding: 7px 12px;
  border: 1px solid var(--ph-line);
  border-radius: var(--ph-radius);
  background: var(--ph-sunken);
  font-family: var(--ph-font-mono);
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--ph-ink-soft);
  white-space: normal;
  word-break: break-word;
  box-shadow: 3px 3px 0 color-mix(in srgb, var(--ph-ink) 12%, transparent);
}

@media (max-width: 760px) {
  .steps {
    grid-template-columns: 1fr;
    border-top: 0;
    gap: 8px;
  }

  /* on narrow screens the track turns vertical */
  .step {
    padding: 4px 0 24px 24px;
    border-left: 1px solid var(--ph-line-strong);
  }

  .tick {
    top: 6px;
    left: -1px;
    width: 14px;
    height: 2px;
  }
}
</style>
