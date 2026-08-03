<script setup lang="ts">
import type { HomeCopy } from '../../content'

defineProps<{
  cta: HomeCopy['finalCta']
}>()
</script>

<template>
  <section class="ph-section cta">
    <div class="ph-inner ph-ruled">
      <div class="band ph-reveal">
        <p class="eyebrow">{{ cta.eyebrow }}</p>
        <h2 class="title">{{ cta.title }}</h2>
        <p class="description">{{ cta.description }}</p>
        <p class="actions">
          <a class="btn primary" :href="cta.primaryAction.href">
            {{ cta.primaryAction.label }}
          </a>
          <a class="btn secondary" :href="cta.secondaryAction.href">
            {{ cta.secondaryAction.label }}
            <span class="arrow" aria-hidden="true">&rarr;</span>
          </a>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cta {
  padding-bottom: clamp(88px, 12vw, 144px);
}

/* the one full-stop moment of the page: the navy band */
.band {
  padding: clamp(48px, 7vw, 88px) clamp(28px, 6vw, 88px);
  border-radius: var(--ph-radius-lg);
  background: var(--ph-band-ink);
  box-shadow: var(--ph-shadow-md);
  color: var(--ph-band-fg);
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--ph-accent-on-ink);
}

.eyebrow::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ph-accent-on-ink);
  flex: none;
}

.title {
  margin: 0;
  max-width: 20ch;
  font-family: var(--ph-font-display);
  font-weight: 650;
  font-size: clamp(1.9rem, 4vw, 2.9rem);
  line-height: 1.12;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.description {
  margin: 18px 0 0;
  max-width: 58ch;
  font-size: 1.0625rem;
  line-height: 1.7;
  color: color-mix(in srgb, var(--ph-band-fg) 72%, transparent);
  text-wrap: pretty;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 36px 0 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 20px;
  border: 1px solid transparent;
  border-radius: var(--ph-radius);
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition:
    background-color 0.16s var(--ph-ease),
    border-color 0.16s var(--ph-ease),
    box-shadow 0.16s var(--ph-ease);
}

.primary {
  background: var(--ph-accent);
  color: var(--ph-accent-fg);
}

.primary:hover {
  background: var(--ph-accent-strong);
  box-shadow: var(--ph-shadow-sm);
}

.secondary {
  border-color: var(--ph-band-line);
  color: var(--ph-band-fg);
  background: transparent;
}

.secondary .arrow {
  transition: translate 0.16s var(--ph-ease);
}

.secondary:hover {
  border-color: color-mix(in srgb, var(--ph-band-fg) 45%, transparent);
  background: color-mix(in srgb, var(--ph-band-fg) 6%, transparent);
}

.secondary:hover .arrow {
  translate: 3px 0;
}

.btn:focus-visible {
  outline-color: var(--ph-accent-on-ink);
}

@media (prefers-reduced-motion: reduce) {
  .btn,
  .secondary .arrow {
    transition: none;
  }
}
</style>
