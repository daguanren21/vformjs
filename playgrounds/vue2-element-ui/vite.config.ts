import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue2'
import { defineConfig } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(root, '../..')
const require = createRequire(import.meta.url)

export default defineConfig({
  plugins: [vue()],
  base: '/',
  server: { host: '127.0.0.1', port: 5284, strictPort: true },
  preview: { host: '0.0.0.0', port: 4174 },
  resolve: {
    dedupe: ['vue', 'vue-demi'],
    alias: {
      '@vformjs/core': path.join(repo, 'packages/core/src/index.ts'),
      '@vformjs/shared': path.join(repo, 'packages/shared/src/index.ts'),
      '@vformjs/vue': path.join(repo, 'packages/vue/src/index.ts'),
      '@vformjs/element-ui': path.join(
        repo,
        'packages/element-ui/src/index.ts',
      ),
      // playground-local Vue 2.7 + matching vue-demi entry
      'vue-demi': require.resolve('vue-demi/lib/index.mjs'),
      vue: require.resolve('vue/dist/vue.runtime.esm.js'),
    },
  },
  optimizeDeps: {
    exclude: [
      '@vformjs/core',
      '@vformjs/shared',
      '@vformjs/vue',
      '@vformjs/element-ui',
    ],
  },
})
