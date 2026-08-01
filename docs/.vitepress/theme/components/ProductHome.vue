<script setup lang="ts">
import { computed } from 'vue'
import { homeCopy } from '../content'
import type { HomeLocale } from '../content'
import LiveFormDemo from './LiveFormDemo.vue'
import HomeHero from './home/HomeHero.vue'
import HomeProblem from './home/HomeProblem.vue'
import HomeFeatures from './home/HomeFeatures.vue'
import HomeWorkflow from './home/HomeWorkflow.vue'
import HomeDecision from './home/HomeDecision.vue'
import HomeFinalCta from './home/HomeFinalCta.vue'

const props = defineProps<{
  locale: HomeLocale
}>()

const copy = computed(() => homeCopy[props.locale])
</script>

<template>
  <div class="ph" :lang="locale === 'zh' ? 'zh-CN' : 'en'">
    <HomeHero
      :eyebrow="copy.eyebrow"
      :title="copy.title"
      :title-accent="copy.titleAccent"
      :description="copy.description"
      :primary-action="copy.primaryAction"
      :secondary-action="copy.secondaryAction"
      :hero-note="copy.heroNote"
      :signals="copy.signals"
    />
    <HomeProblem :problem="copy.problem" />
    <section id="live-demo" class="ph-section ph-anchor">
      <div class="ph-inner ph-ruled">
        <LiveFormDemo :copy="copy.demo" :locale="locale" />
      </div>
    </section>
    <HomeFeatures :features="copy.features" />
    <HomeWorkflow :workflow="copy.workflow" />
    <HomeDecision :decision="copy.decision" />
    <HomeFinalCta :cta="copy.finalCta" />
  </div>
</template>
