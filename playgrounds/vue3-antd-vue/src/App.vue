<script setup lang="ts">
import { computed, ref } from 'vue'
import { demos, type DemoId } from './demos'

const active = ref<DemoId>('basic')
const current = computed(() => demos.find(d => d.id === active.value)!)
</script>

<template>
  <div class="page">
    <header>
      <h1>vformjs · Ant Design Vue</h1>
      <p>
        defineAdapter 实测 ·
        <a href="https://antdv.com/components/form-cn" target="_blank" rel="noreferrer">antdv.com Form</a>
      </p>
    </header>

    <aside class="nav">
      <button
        v-for="d in demos"
        :key="d.id"
        class="nav-item"
        :class="{ active: active === d.id }"
        @click="active = d.id"
      >
        <strong>{{ d.title }}</strong>
        <span>{{ d.desc }}</span>
      </button>
    </aside>

    <main class="main">
      <component :is="current.component" :key="active" />
    </main>
  </div>
</template>

<style>
.page {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: auto 1fr;
  gap: 16px;
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  font-family: system-ui, -apple-system, sans-serif;
  background: #f5f5f5;
  color: #262626;
}
header { grid-column: 1 / -1; }
header h1 { margin: 0 0 6px; font-size: 22px; }
header p { margin: 0; color: #8c8c8c; }
header a { color: #1677ff; }
.nav { display: flex; flex-direction: column; gap: 8px; }
.nav-item {
  text-align: left;
  border: 1px solid #f0f0f0;
  background: #fff;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
}
.nav-item strong { display: block; margin-bottom: 4px; }
.nav-item span { color: #8c8c8c; font-size: 12px; }
.nav-item.active {
  border-color: #1677ff;
  box-shadow: 0 0 0 1px #1677ff inset;
}
.main {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #f0f0f0;
}
</style>
