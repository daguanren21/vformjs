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
              <span class="mark" aria-hidden="true">+</span>
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
  gap: clamp(20px, 3vw, 32px);
  align-items: stretch;
}

.panel {
  border: 1px solid var(--ph-line);
  border-radius: var(--ph-radius);
  padding: clamp(24px, 3vw, 36px);
}

.panel-label {
  margin: 0 0 22px;
  font-family: var(--ph-font-mono);
  font-size: 11.5px;
  font-weight: 400;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ph-ink-faint);
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
  gap: 12px;
  padding: 11px 0;
  border-top: 1px solid var(--ph-line);
  font-size: 0.9375rem;
  line-height: 1.55;
  color: var(--ph-ink-soft);
}

.mark {
  flex: none;
  font-family: var(--ph-font-mono);
  font-size: 0.85em;
  color: var(--ph-ink-faint);
}

/* repeated work: hatched plate, greyed items */
.before {
  background:
    repeating-linear-gradient(
      -45deg,
      transparent 0 7px,
      var(--ph-accent-wash) 7px 8px
    ),
    var(--ph-sunken);
}

/* owned by the form instance: raised plate, accent edge */
.after {
  background: var(--ph-raised);
  border-color: var(--ph-line-strong);
  border-left: 3px solid var(--ph-accent);
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
  word-break: break-word;
}

@media (max-width: 760px) {
  .compare {
    grid-template-columns: 1fr;
  }
}
</style>
