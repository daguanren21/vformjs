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
      <div class="rows ph-reveal">
        <article v-for="item in features.items" :key="item.title" class="row">
          <span class="marker" aria-hidden="true">{{ item.marker }}</span>
          <div class="row-body">
            <h3 class="row-title">{{ item.title }}</h3>
            <p class="row-desc">{{ item.description }}</p>
            <p class="row-detail">{{ item.detail }}</p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* two-column capability list: hairline rows, no card wall */
.rows {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: clamp(32px, 5vw, 64px);
  border-top: 1px solid var(--ph-line);
}

.row {
  display: flex;
  gap: 16px;
  padding: 26px 0;
  border-bottom: 1px solid var(--ph-line);
}

.marker {
  flex: none;
  padding-top: 4px;
  font-family: var(--ph-font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--ph-accent);
}

.row-body {
  min-width: 0;
}

.row-title {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 650;
  line-height: 1.35;
  letter-spacing: -0.01em;
}

.row-desc {
  margin: 8px 0 0;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--ph-ink-soft);
}

.row-detail {
  display: inline-block;
  max-width: 100%;
  margin: 14px 0 0;
  padding: 6px 10px;
  border: 1px solid var(--ph-line);
  border-radius: var(--ph-radius-sm);
  background: var(--ph-sunken);
  font-family: var(--ph-font-mono);
  font-size: 11.5px;
  line-height: 1.55;
  color: var(--ph-ink-soft);
  overflow-wrap: anywhere;
}

@media (max-width: 760px) {
  .rows {
    grid-template-columns: 1fr;
  }
}
</style>
