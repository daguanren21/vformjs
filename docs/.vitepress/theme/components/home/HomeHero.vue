<script setup lang="ts">
import type { HomeLink, HomeSignal } from '../../content'

defineProps<{
  eyebrow: string
  title: string
  titleAccent: string
  description: string
  primaryAction: HomeLink
  secondaryAction: HomeLink
  heroNote: string
  signals: HomeSignal[]
}>()
</script>

<template>
  <section class="ph-section hero" aria-labelledby="ph-hero-title">
    <div class="ph-inner">
      <div class="grid">
        <div class="copy">
          <p class="eyebrow">{{ eyebrow }}</p>
          <h1 id="ph-hero-title" class="title">
            {{ title }}
            <em class="accent">{{ titleAccent }}</em>
          </h1>
          <p class="lede">{{ description }}</p>
          <p class="actions">
            <a class="btn primary" :href="primaryAction.href">{{ primaryAction.label }}</a>
            <a class="btn secondary" :href="secondaryAction.href">
              {{ secondaryAction.label }}
              <span class="arrow" aria-hidden="true">&rarr;</span>
            </a>
          </p>
          <p class="note">{{ heroNote }}</p>
        </div>

        <figure class="plate" aria-hidden="true">
          <div class="plate-frame">
            <div class="wire">
              <span class="row"></span>
              <span class="row short"></span>
              <span class="row"></span>
              <span class="status"></span>
              <span class="kbd"></span>
            </div>
            <span class="stamp"></span>
          </div>
        </figure>
      </div>

      <dl class="signals">
        <div v-for="signal in signals" :key="signal.label" class="signal">
          <dt class="signal-label">{{ signal.label }}</dt>
          <dd class="signal-value">{{ signal.value }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding-top: clamp(48px, 9vh, 104px);
}

.grid {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  gap: clamp(40px, 6vw, 80px);
  align-items: center;
}

/* faint column guides behind the composition */
.grid::before {
  content: "";
  position: absolute;
  inset: -32px 0;
  background-image: linear-gradient(
    90deg,
    var(--ph-line) 1px,
    transparent 1px
  );
  background-size: 25% 100%;
  opacity: 0.45;
  pointer-events: none;
}

.copy {
  position: relative;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 0 24px;
  font-family: var(--ph-font-mono);
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ph-ink-faint);
}

.eyebrow::before {
  content: "";
  width: 36px;
  height: 1px;
  background: var(--ph-accent);
  flex: none;
}

.title {
  margin: 0;
  font-family: var(--ph-font-display);
  font-weight: 500;
  font-size: clamp(2.55rem, 5.6vw, 4.4rem);
  line-height: 1.06;
  letter-spacing: -0.015em;
  text-wrap: balance;
}

/* the accent phrase always takes its own line — the two-step stack
   is the hero composition in both locales */
.accent {
  display: block;
  font-style: italic;
  color: var(--ph-accent);
}

.accent:lang(zh) {
  font-style: normal;
}

.lede {
  margin: 24px 0 0;
  max-width: 54ch;
  font-size: clamp(1rem, 1.4vw, 1.125rem);
  line-height: 1.72;
  color: var(--ph-ink-soft);
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
    background-color 0.18s var(--ph-ease),
    border-color 0.18s var(--ph-ease);
}

.primary {
  background: var(--ph-accent);
  border-color: var(--ph-accent);
  color: var(--ph-accent-fg);
}

.primary:hover {
  background: var(--ph-accent-strong);
  border-color: var(--ph-accent-strong);
  translate: -2px -2px;
  box-shadow: 4px 4px 0 color-mix(in srgb, var(--ph-ink) 45%, transparent);
}

.secondary {
  border-color: var(--ph-line-strong);
  color: var(--ph-ink);
  background: transparent;
}

.secondary .arrow {
  transition: translate 0.18s var(--ph-ease);
}

.secondary:hover {
  border-color: var(--ph-ink);
  background: var(--ph-raised);
}

.secondary:hover .arrow {
  translate: 3px 0;
}

.note {
  margin: 28px 0 0;
  max-width: 56ch;
  padding-left: 14px;
  border-left: 2px solid var(--ph-line-strong);
  font-family: var(--ph-font-mono);
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ph-ink-faint);
}

/* — decorative drafting plate — */

.plate {
  position: relative;
  margin: 0;
}

.plate-frame {
  position: relative;
  aspect-ratio: 5 / 4;
  border: 1px solid var(--ph-line-strong);
  background: var(--ph-raised);
}

/* ruler ticks along the top edge */
.plate-frame::before {
  content: "";
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 10px;
  background-image: repeating-linear-gradient(
    90deg,
    var(--ph-line-strong) 0 1px,
    transparent 1px 12.5%
  );
  opacity: 0.7;
}

/* inner wireframe of a form: three fields, an accent status row, a submit key */
.wire {
  position: absolute;
  inset: 18% 14%;
  display: grid;
  grid-template-rows: repeat(3, 1fr) 0.8fr;
  gap: 12%;
  align-content: start;
}

.row {
  display: block;
  border: 1px solid var(--ph-line);
  background:
    linear-gradient(var(--ph-line-strong), var(--ph-line-strong)) 12px 50% /
    32% 2px no-repeat;
}

.row.short {
  margin-right: 22%;
}

.status {
  display: block;
  border: 1px solid var(--ph-accent);
  background:
    linear-gradient(var(--ph-accent), var(--ph-accent)) 12px 50% / 10px 10px
    no-repeat;
}

.kbd {
  position: absolute;
  right: 0;
  bottom: -4px;
  width: 34%;
  height: 16%;
  background: var(--ph-accent);
}

/* rotated vermilion stamp on the plate corner */
.stamp {
  position: absolute;
  top: -14px;
  right: -14px;
  width: 28px;
  height: 28px;
  background: var(--ph-accent);
  rotate: 45deg;
}

/* — signals band — */

.signals {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  margin: clamp(56px, 8vw, 88px) 0 0;
  padding: 0;
  border: 1px solid var(--ph-line);
  background: var(--ph-line);
}

.signal {
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  margin: 0;
  padding: 20px 24px 22px;
  background: var(--ph-paper);
}

.signal-value {
  margin: 0;
  font-family: var(--ph-font-mono);
  font-size: 1.45rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.signal-label {
  margin: 0;
  font-family: var(--ph-font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ph-ink-faint);
}

@media (max-width: 960px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .plate {
    display: none;
  }
}

@media (max-width: 640px) {
  .signals {
    grid-template-columns: 1fr 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn,
  .secondary .arrow {
    transition: none;
  }
}
</style>
