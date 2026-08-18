<script setup lang="ts">
import type { EditorForm } from './types'

defineProps<{
  form: EditorForm
}>()
</script>

<template>
  <section class="editor-section">
    <h3>单条配置</h3>
    <el-form-item label="条目编码" v-bind="form.item('single.code')">
      <el-input v-model="form.model.single.code" placeholder="单条模式必填" />
    </el-form-item>
  </section>
</template>
