import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(root, '../..')

export default defineConfig({
  plugins: [vue()],
  server: { host: '127.0.0.1', port: 5285, strictPort: true },
  resolve: {
    dedupe: ['vue', 'vue-demi'],
    alias: {
      '@veform/core': path.join(repo, 'packages/core/src/index.ts'),
      '@veform/shared': path.join(repo, 'packages/shared/src/index.ts'),
      '@veform/vue': path.join(repo, 'packages/vue/src/index.ts'),
      '@veform/zod': path.join(repo, 'packages/zod/src/index.ts'),
      'vue-demi': path.join(root, 'node_modules/vue-demi/lib/index.mjs'),
    },
  },
  optimizeDeps: {
    exclude: [
      '@veform/core',
      '@veform/shared',
      '@veform/vue',
      '@veform/zod',
    ],
  },
})
