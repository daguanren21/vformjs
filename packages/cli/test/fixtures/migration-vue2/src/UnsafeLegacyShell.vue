<script lang="ts">
import ElementUI from 'element-ui'
import Vue from 'vue'

Vue.use(ElementUI)

export default Vue.extend({
  data: () => ({ open: true }),
  mounted() {
    this.$message('mounted')
  },
})
</script>

<template>
  <legacy-panel :open.sync="open">
    <i class="el-icon-edit" />
  </legacy-panel>
</template>
