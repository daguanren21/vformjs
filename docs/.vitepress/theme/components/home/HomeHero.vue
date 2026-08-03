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

        <figure class="proof" aria-hidden="true">
          <div class="proof-bar">
            <span class="proof-file">profile-form.ts</span>
            <span class="proof-tag">useElForm</span>
          </div>
          <pre class="proof-code"><code><span class="k">import</span> { <span class="a">useElForm</span>, <span class="a">r</span> } <span class="k">from</span> '@vformjs/element-plus'

<span class="k">const</span> form = <span class="a">useElForm</span>({
  defaults: { name: '', email: '' },
  rules: {
    name: [r.required(), r.min(2)],
    email: [r.required(), r.email()],
  },
  onSubmit: values => api.save(values),
})

form.<span class="a">load</span>('edit', record) <span class="c">// one record, a new baseline</span>
<span class="k">const</span> { ok } = <span class="k">await</span> form.<span class="a">submit</span>()</code></pre>
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
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  gap: clamp(40px, 5vw, 72px);
  align-items: center;
}

.copy {
  min-width: 0;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px;
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
  font-size: clamp(2.4rem, 5.2vw, 3.9rem);
  line-height: 1.08;
  letter-spacing: -0.025em;
  text-wrap: balance;
}

/* the accent phrase always takes its own line — the two-step stack
   is the hero composition in both locales */
.accent {
  display: block;
  font-style: normal;
  color: var(--ph-accent);
}

.lede {
  margin: 22px 0 0;
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
  margin: 34px 0 0;
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
  border-color: var(--ph-line-strong);
  color: var(--ph-ink);
  background: var(--ph-raised);
}

.secondary .arrow {
  transition: translate 0.16s var(--ph-ease);
}

.secondary:hover {
  border-color: var(--ph-ink-faint);
  background: var(--ph-sunken);
}

.secondary:hover .arrow {
  translate: 3px 0;
}

.note {
  margin: 26px 0 0;
  max-width: 56ch;
  padding-left: 14px;
  border-left: 2px solid var(--ph-line);
  font-size: 0.875rem;
  line-height: 1.65;
  color: var(--ph-ink-faint);
}

/* — the proof: the real workflow, readable at a glance — */

.proof {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  border-radius: var(--ph-radius-lg);
  background: var(--ph-band-ink);
  box-shadow: var(--ph-shadow-md);
}

.proof-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ph-band-line);
}

.proof-file {
  font-family: var(--ph-font-mono);
  font-size: 12px;
  color: var(--vx-band-muted);
}

.proof-tag {
  flex: none;
  padding: 3px 9px;
  border: 1px solid var(--ph-band-line);
  border-radius: 999px;
  font-family: var(--ph-font-mono);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--ph-accent-on-ink);
}

.proof-code {
  margin: 0;
  padding: 18px 20px 20px;
  overflow-x: auto;
  font-family: var(--ph-font-mono);
  font-size: 12.8px;
  line-height: 1.75;
  color: var(--ph-band-fg);
}

.proof-code .k,
.proof-code .a {
  color: var(--ph-accent-on-ink);
}

.proof-code .c {
  color: var(--vx-band-muted);
}

/* — signals: a quiet hairline row, not a ledger — */

.signals {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: clamp(20px, 4vw, 40px);
  margin: clamp(56px, 8vw, 88px) 0 0;
  padding: 28px 0 0;
  border-top: 1px solid var(--ph-line);
}

.signal {
  display: flex;
  flex-direction: column-reverse;
  gap: 6px;
  margin: 0;
  min-width: 0;
}

.signal-value {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 650;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.signal-label {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--ph-ink-faint);
}

@media (max-width: 960px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .proof {
    max-width: 560px;
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
