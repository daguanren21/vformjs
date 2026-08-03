<script setup lang="ts">
import type { HomeCopy } from '../../content'
import HomeSectionHead from './HomeSectionHead.vue'

defineProps<{
  problem: HomeCopy['problem']
}>()
</script>

<template>
  <section class="ph-section problem">
    <div class="ph-inner ph-ruled">
      <HomeSectionHead
        :eyebrow="problem.eyebrow"
        :title="problem.title"
        :description="problem.description"
      />
      <div class="compare ph-reveal">
        <div class="panel before">
          <h3 class="panel-label">{{ problem.beforeLabel }}</h3>
          <ul class="list">
            <li v-for="item in problem.before" :key="item" class="item">
              <span class="mark" aria-hidden="true">&times;</span>
              {{ item }}
            </li>
          </ul>
        </div>
        <div class="panel after">
          <h3 class="panel-label">{{ problem.afterLabel }}</h3>
          <ul class="list">
            <li v-for="item in problem.after" :key="item" class="item code">
              <span class="mark" aria-hidden="true">&#10003;</span>
              <code>{{ item }}</code>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(16px, 2.5vw, 24px);
  align-items: stretch;
}

.panel {
  border: 1px solid var(--ph-line);
  border-radius: var(--ph-radius-lg);
  padding: clamp(22px, 3vw, 32px);
}

/* repeated work: quiet sunken panel, muted items */
.before {
  background: var(--ph-sunken);
}

/* owned by the form instance: raised card, accent chip + checks */
.after {
  background: var(--ph-raised);
  box-shadow: var(--ph-shadow-sm);
}

.panel-label {
  display: inline-flex;
  margin: 0 0 16px;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}

.before .panel-label {
  border: 1px solid var(--ph-line);
  background: var(--ph-paper);
  color: var(--ph-ink-faint);
}

.after .panel-label {
  background: var(--ph-accent-wash);
  color: var(--ph-accent);
}

.list {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 10px 0;
  border-top: 1px solid var(--ph-line);
  font-size: 0.9375rem;
  line-height: 1.55;
  color: var(--ph-ink-soft);
}

.item:first-child {
  border-top: 0;
}

.mark {
  flex: none;
  font-size: 0.85em;
  color: var(--ph-ink-faint);
}

.after .item {
  color: var(--ph-ink);
}

.after .mark {
  color: var(--ph-accent);
  font-weight: 700;
}

.item code {
  font-family: var(--ph-font-mono);
  font-size: 0.85em;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

@media (max-width: 760px) {
  .compare {
    grid-template-columns: 1fr;
  }
}
</style>
