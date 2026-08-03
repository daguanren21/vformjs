import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(root, '../..')

export default defineConfig({
  plugins: [vue()],
  // Vercel / static hosting
  base: '/',
  server: { host: '127.0.0.1', port: 5283, strictPort: true },
  preview: { host: '0.0.0.0', port: 4173 },
  resolve: {
    dedupe: ['vue', 'vue-demi'],
    alias: {
      '@vformjs/core': path.join(repo, 'packages/core/src/index.ts'),
      '@vformjs/vue': path.join(repo, 'packages/vue/src/index.ts'),
      '@vformjs/zod': path.join(repo, 'packages/zod/src/index.ts'),
      '@vformjs/element-plus/zod': path.join(
        repo,
        'packages/element-plus/src/use-zod-form.ts',
      ),
      '@vformjs/element-plus': path.join(
        repo,
        'packages/element-plus/src/index.ts',
      ),
      // pin vue-demi to this playground's vue 3
      'vue-demi': path.join(root, 'node_modules/vue-demi/lib/index.mjs'),
    },
  },
  optimizeDeps: {
    exclude: [
      '@vformjs/core',
      '@vformjs/vue',
      '@vformjs/zod',
      '@vformjs/element-plus',
      '@vformjs/element-plus/zod',
    ],
  },
})
