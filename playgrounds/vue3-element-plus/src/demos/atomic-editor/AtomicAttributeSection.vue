<script setup lang="ts">
import type { EditorForm } from './types'

defineProps<{
  form: EditorForm
}>()
</script>

<template>
  <section class="editor-section">
    <h3>动态属性</h3>
    <el-form-item label="分类" prop="attributes.category">
      <el-select
        v-model="form.model.attributes.category"
        placeholder="选择分类"
        style="width: 100%"
      >
        <el-option label="标准" value="standard" />
        <el-option label="扩展" value="extended" />
      </el-select>
    </el-form-item>
  </section>
</template>
