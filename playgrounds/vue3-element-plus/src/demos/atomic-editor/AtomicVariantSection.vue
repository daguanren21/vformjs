<script setup lang="ts">
import type { EditorForm, VariantList } from './types'

defineProps<{
  form: EditorForm
  variants: VariantList
}>()
</script>

<template>
  <section class="editor-section">
    <div class="section-title">
      <h3>变体配置</h3>
      <el-button type="primary" link @click="variants.append()">
        添加变体
      </el-button>
    </div>

    <el-form-item
      v-if="variants.fields.length === 0"
      v-bind="form.item('variants')"
      label="变体"
    >
      请至少添加一个变体
    </el-form-item>

    <div
      v-for="row in variants.fields"
      :key="row.key"
      class="variant-row"
    >
      <el-form-item
        label="编码"
        v-bind="form.item(`variants.${row.index}.code`)"
      >
        <el-input
          v-model="form.model.variants[row.index].code"
          placeholder="变体编码"
        />
      </el-form-item>
      <el-form-item
        label="颜色"
        v-bind="form.item(`variants.${row.index}.color`)"
      >
        <el-input
          v-model="form.model.variants[row.index].color"
          placeholder="任意一行填写后全部必填"
        />
      </el-form-item>
      <el-form-item label="备注" :prop="`variants.${row.index}.notes`">
        <el-input v-model="form.model.variants[row.index].notes" />
      </el-form-item>
      <el-button type="danger" link @click="variants.remove(row.index)">
        删除
      </el-button>
    </div>
  </section>
</template>
