<script setup lang="ts">
import type { EditorForm } from './types'

defineProps<{
  form: EditorForm
}>()
</script>

<template>
  <section class="editor-section">
    <h3>概要</h3>
    <el-form-item label="编码" v-bind="form.item('summary.code')">
      <el-input v-model="form.model.summary.code" placeholder="唯一编码" />
    </el-form-item>
    <el-form-item label="模式" prop="summary.mode">
      <el-radio-group v-model="form.model.summary.mode">
        <el-radio value="single">
          单条
        </el-radio>
        <el-radio value="matrix">
          多条
        </el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="公共备注" prop="summary.notes">
      <el-input
        v-model="form.model.summary.notes"
        type="textarea"
        placeholder="修改后同步到每个变体"
      />
    </el-form-item>
  </section>
</template>
