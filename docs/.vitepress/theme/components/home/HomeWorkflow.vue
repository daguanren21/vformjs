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
          <span class="badge" aria-hidden="true">{{ step.number }}</span>
          <h3 class="step-title">{{ step.title }}</h3>
          <p class="step-desc">{{ step.description }}</p>
          <code class="step-code">{{ step.code }}</code>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
/* three calm columns: number badge, plain words, one code chip each */
.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: clamp(24px, 4vw, 40px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.step {
  min-width: 0;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border-radius: var(--ph-radius);
  background: var(--ph-accent-wash);
  color: var(--ph-accent);
  font-family: var(--ph-font-mono);
  font-size: 13px;
  font-weight: 600;
}

.step-title {
  margin: 18px 0 0;
  font-size: 1.125rem;
  font-weight: 650;
  line-height: 1.35;
  letter-spacing: -0.01em;
}

.step-desc {
  margin: 8px 0 0;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--ph-ink-soft);
}

.step-code {
  display: inline-block;
  max-width: 100%;
  margin-top: 16px;
  padding: 8px 12px;
  border: 1px solid var(--ph-line);
  border-radius: var(--ph-radius-sm);
  background: var(--ph-sunken);
  font-family: var(--ph-font-mono);
  font-size: 12px;
  line-height: 1.5;
  color: var(--ph-ink-soft);
  white-space: normal;
  overflow-wrap: anywhere;
}

@media (max-width: 760px) {
  .steps {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}
</style>
