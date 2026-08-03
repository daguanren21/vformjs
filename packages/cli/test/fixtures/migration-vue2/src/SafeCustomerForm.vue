<script setup lang="ts">
import { r, useElForm } from '@vformjs/element-ui'
import { ElMessage } from 'element-ui'
import { ref } from 'vue'

const visible = ref(true)
const form = useElForm({
  defaults: { id: '42', name: '' },
  rules: { name: [r.required()] },
  onSubmit: async values => ElMessage.success(values.name),
})
</script>

<template>
  <el-dialog :visible.sync="visible" title="Edit customer">
    <el-submenu index="customer">
      <template #title>Customer</template>
      <el-input
        :value="form.model.id"
        @input="form.model.id = $event"
      />
      <el-form v-bind="form.host">
        <el-form-item label="Name" prop="name">
          <el-input v-model="form.model.name" />
        </el-form-item>
      </el-form>
    </el-submenu>
  </el-dialog>
</template>
