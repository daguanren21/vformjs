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
  gap: 14px;
  margin: 0 0 20px;
  font-family: var(--ph-font-mono);
  font-size: 11.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--ph-ink-faint);
}

.eyebrow::before {
  content: "";
  width: 32px;
  height: 1px;
  background: var(--ph-accent);
  flex: none;
}

.title {
  margin: 0;
  font-family: var(--ph-font-display);
  font-weight: 500;
  font-size: clamp(1.8rem, 3.4vw, 2.6rem);
  line-height: 1.14;
  letter-spacing: -0.005em;
  text-wrap: balance;
}

.description {
  margin: 18px 0 0;
  max-width: 62ch;
  font-size: 1.0625rem;
  line-height: 1.7;
  color: var(--ph-ink-soft);
  text-wrap: pretty;
}
</style>
