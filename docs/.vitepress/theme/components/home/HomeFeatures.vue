<script setup lang="ts">
import type { HomeCopy } from '../../content'
import HomeSectionHead from './HomeSectionHead.vue'

defineProps<{
  features: HomeCopy['features']
}>()
</script>

<template>
  <section class="ph-section features">
    <div class="ph-inner ph-ruled">
      <HomeSectionHead
        :eyebrow="features.eyebrow"
        :title="features.title"
        :description="features.description"
      />
      <div class="ledger ph-reveal">
        <article v-for="item in features.items" :key="item.title" class="cell">
          <span class="marker">{{ item.marker }}</span>
          <h3 class="cell-title">{{ item.title }}</h3>
          <p class="cell-desc">{{ item.description }}</p>
          <p class="cell-detail">{{ item.detail }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* spec ledger: hairline grid, two columns */
.ledger {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  border: 1px solid var(--ph-line);
  background: var(--ph-line);
}

.cell {
  position: relative;
  padding: clamp(24px, 3vw, 36px) clamp(22px, 2.6vw, 32px)
    clamp(26px, 3vw, 38px);
  background: var(--ph-paper);
  transition: background-color 0.2s var(--ph-ease);
}

.cell:hover {
  background: var(--ph-raised);
}

.marker {
  display: inline-block;
  margin-bottom: 18px;
  font-family: var(--ph-font-mono);
  font-size: 12px;
  letter-spacing: 0.12em;
  color: var(--ph-ink-faint);
  transition: color 0.2s var(--ph-ease);
}

.marker::after {
  content: "";
  display: block;
  width: 100%;
  height: 2px;
  margin-top: 6px;
  background: var(--ph-line-strong);
  transition: background-color 0.2s var(--ph-ease), width 0.25s var(--ph-ease);
}

.cell:hover .marker {
  color: var(--ph-accent);
}

.cell:hover .marker::after {
  background: var(--ph-accent);
}

.cell-title {
  margin: 0;
  font-family: var(--ph-font-display);
  font-size: 1.3rem;
  font-weight: 500;
  line-height: 1.25;
}

.cell-desc {
  margin: 10px 0 0;
  font-size: 0.9375rem;
  line-height: 1.65;
  color: var(--ph-ink-soft);
}

.cell-detail {
  margin: 16px 0 0;
  padding-left: 12px;
  border-left: 2px solid var(--ph-line);
  font-family: var(--ph-font-mono);
  font-size: 12px;
  line-height: 1.6;
  color: var(--ph-ink-faint);
}

.cell:hover .cell-detail {
  border-left-color: var(--ph-accent);
  color: var(--ph-ink-soft);
}

@media (max-width: 760px) {
  .ledger {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cell,
  .marker,
  .marker::after {
    transition: none;
  }
}
</style>
