<script setup lang="ts">
import type { HomeCopy } from '../../content'
import HomeSectionHead from './HomeSectionHead.vue'

defineProps<{
  decision: HomeCopy['decision']
}>()
</script>

<template>
  <section class="ph-section decision">
    <div class="ph-inner ph-ruled">
      <HomeSectionHead
        :eyebrow="decision.eyebrow"
        :title="decision.title"
        :description="decision.description"
      />
      <div
        class="table-wrap ph-reveal"
        tabindex="0"
        role="region"
        :aria-label="decision.title"
      >
        <table class="table">
          <thead>
            <tr>
              <th scope="col" class="col-name">{{ decision.columns.name }}</th>
              <th scope="col">{{ decision.columns.approach }}</th>
              <th scope="col">{{ decision.columns.lifecycle }}</th>
              <th scope="col">{{ decision.columns.fit }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in decision.rows"
              :key="row.name"
              :class="{ owner: row.name === 'vformjs' }"
            >
              <th scope="row" class="name">{{ row.name }}</th>
              <td>{{ row.approach }}</td>
              <td>{{ row.lifecycle }}</td>
              <td>{{ row.fit }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="note ph-reveal">{{ decision.note }}</p>
    </div>
  </section>
</template>

<style scoped>
.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--ph-line-strong);
  border-radius: var(--ph-radius);
  background: var(--ph-raised);
}

.table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  font-size: 0.9rem;
  line-height: 1.55;
  text-align: left;
}

.table th,
.table td {
  padding: 14px 18px;
  border-bottom: 1px solid var(--ph-line);
  vertical-align: top;
}

.table thead th {
  padding-top: 16px;
  font-family: var(--ph-font-mono);
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ph-ink-faint);
  border-bottom: 1px solid var(--ph-line-strong);
  white-space: nowrap;
}

.table tbody tr:last-child th,
.table tbody tr:last-child td {
  border-bottom: 0;
}

.table tbody tr {
  transition: background-color 0.15s var(--ph-ease);
}

.table tbody tr:hover {
  background: var(--ph-accent-wash);
}

.name {
  font-weight: 600;
  white-space: nowrap;
}

.table td {
  color: var(--ph-ink-soft);
}

/* the vformjs row: the answer, marked like a spec callout */
.owner .name {
  color: var(--ph-accent);
  box-shadow: inset 3px 0 0 var(--ph-accent);
}

.owner td {
  color: var(--ph-ink);
}

.note {
  margin: 20px 0 0;
  padding-left: 14px;
  border-left: 2px solid var(--ph-accent);
  font-family: var(--ph-font-mono);
  font-size: 12px;
  line-height: 1.65;
  color: var(--ph-ink-faint);
}
</style>
