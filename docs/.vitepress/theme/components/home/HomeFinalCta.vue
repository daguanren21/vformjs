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

/* the one full-stop moment of the page: a graphite plate */
.band {
  position: relative;
  padding: clamp(48px, 7vw, 88px) clamp(28px, 6vw, 88px);
  background: var(--ph-band-ink);
  border: 1px solid var(--ph-band-ink);
  border-radius: var(--ph-radius);
  color: var(--ph-band-fg);
}

/* inner hairline frame, like a title block border in a drawing */
.band::before {
  content: "";
  position: absolute;
  inset: 10px;
  border: 1px solid var(--ph-band-line);
  pointer-events: none;
}

/* registration crosses at two corners */
.band::after {
  content: "+";
  position: absolute;
  top: -10px;
  left: 18px;
  font-family: var(--ph-font-mono);
  font-size: 18px;
  line-height: 1;
  color: var(--ph-accent-on-ink);
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 0 22px;
  font-family: var(--ph-font-mono);
  font-size: 11.5px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--ph-band-fg) 60%, transparent);
}

.eyebrow::before {
  content: "";
  width: 32px;
  height: 1px;
  background: var(--ph-accent-on-ink);
  flex: none;
}

.title {
  margin: 0;
  max-width: 18ch;
  font-family: var(--ph-font-display);
  font-weight: 500;
  font-size: clamp(1.9rem, 4vw, 2.9rem);
  line-height: 1.12;
  letter-spacing: -0.01em;
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
  gap: 10px;
  height: 46px;
  padding: 0 22px;
  border: 1px solid transparent;
  border-radius: var(--ph-radius);
  font-family: var(--ph-font-mono);
  font-size: 12.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-decoration: none;
  white-space: nowrap;
  transition:
    translate 0.18s var(--ph-ease),
    box-shadow 0.18s var(--ph-ease),
    border-color 0.18s var(--ph-ease),
    background-color 0.18s var(--ph-ease);
}

.primary {
  background: var(--ph-band-fg);
  border-color: var(--ph-band-fg);
  color: var(--ph-band-ink);
}

.primary:hover {
  translate: -2px -2px;
  box-shadow: 4px 4px 0 var(--ph-accent-on-ink);
}

.secondary {
  border-color: var(--ph-band-line);
  color: var(--ph-band-fg);
  background: transparent;
}

.secondary .arrow {
  transition: translate 0.18s var(--ph-ease);
}

.secondary:hover {
  border-color: var(--ph-band-fg);
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
