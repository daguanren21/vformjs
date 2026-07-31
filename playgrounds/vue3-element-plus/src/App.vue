<script setup lang="ts">
import { computed, ref } from 'vue'
import { demos, type DemoId } from './demos'

const active = ref<DemoId>('basic')
const current = computed(() => demos.find(d => d.id === active.value)!)
</script>

<template>
  <div class="page">
    <header>
      <h1>vformjs playground</h1>
      <p>纯演示场景 · Vue3 + element-plus · 不绑业务</p>
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
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr;
  gap: 16px;
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  font-family: system-ui, -apple-system, sans-serif;
  background: #f5f7fa;
  color: #303133;
}
header { grid-column: 1 / -1; }
header h1 { margin: 0 0 6px; font-size: 22px; }
header p { margin: 0; color: #606266; }
.nav { display: flex; flex-direction: column; gap: 8px; }
.nav-item {
  text-align: left;
  border: 1px solid #e4e7ed;
  background: #fff;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
}
.nav-item strong { display: block; margin-bottom: 4px; }
.nav-item span { color: #909399; font-size: 12px; }
.nav-item.active {
  border-color: #409eff;
  box-shadow: 0 0 0 1px #409eff inset;
}
.main {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #ebeef5;
}
</style>
