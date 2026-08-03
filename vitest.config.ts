import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@vformjs/core': path.join(root, 'packages/core/src/index.ts'),
      '@vformjs/vue': path.join(root, 'packages/vue/src/index.ts'),
      '@vformjs/zod': path.join(root, 'packages/zod/src/index.ts'),
      '@vformjs/element-plus': path.join(
        root,
        'packages/element-plus/src/index.ts',
      ),
      // vue-demi in node tests resolves to vue 3
      'vue-demi': path.join(root, 'node_modules/vue-demi/lib/index.mjs'),
    },
  },
  test: {
    include: [
      'packages/*/test/**/*.test.ts',
      'packages/*/test/**/*.test.tsx',
    ],
    environment: 'happy-dom',
  },
})
