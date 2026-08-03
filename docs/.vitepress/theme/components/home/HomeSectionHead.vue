<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  description?: string
}>()
</script>

<template>
  <header class="ph-reveal head">
    <p class="eyebrow">{{ eyebrow }}</p>
    <h2 class="title">{{ title }}</h2>
    <p v-if="description" class="description">{{ description }}</p>
  </header>
</template>

<style scoped>
.head {
  max-width: 720px;
  margin-bottom: clamp(40px, 6vw, 64px);
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--ph-accent);
}

.eyebrow::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ph-accent);
  flex: none;
}

.title {
  margin: 0;
  font-family: var(--ph-font-display);
  font-weight: 650;
  font-size: clamp(1.75rem, 3.2vw, 2.4rem);
  line-height: 1.16;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.description {
  margin: 16px 0 0;
  max-width: 62ch;
  font-size: 1.0625rem;
  line-height: 1.7;
  color: var(--ph-ink-soft);
  text-wrap: pretty;
}
</style>
