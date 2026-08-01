import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(root, '../..')

export default defineConfig({
  plugins: [vue()],
  server: { host: '127.0.0.1', port: 5286, strictPort: true },
  resolve: {
    dedupe: ['vue', 'vue-demi'],
    alias: {
      '@vformjs/core': path.join(repo, 'packages/core/src/index.ts'),
      '@vformjs/shared': path.join(repo, 'packages/shared/src/index.ts'),
      '@vformjs/vue': path.join(repo, 'packages/vue/src/index.ts'),
      '@vformjs/zod': path.join(repo, 'packages/zod/src/index.ts'),
      '@vformjs/ant-design-vue/zod': path.join(repo, 'packages/ant-design-vue/src/use-zod-form.ts'),
      '@vformjs/ant-design-vue': path.join(repo, 'packages/ant-design-vue/src/index.ts'),
      'vue-demi': path.join(root, 'node_modules/vue-demi/lib/index.mjs'),
    },
  },
  optimizeDeps: {
    exclude: [
      '@vformjs/core',
      '@vformjs/shared',
      '@vformjs/vue',
      '@vformjs/zod',
      '@vformjs/ant-design-vue',
      '@vformjs/ant-design-vue/zod',
    ],
  },
})
