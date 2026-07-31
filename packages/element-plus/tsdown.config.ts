import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/use-zod-form.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  external: [
    'vue',
    'vue-demi',
    'zod',
    'element-plus',
    '@vformjs/core',
    '@vformjs/vue',
    '@vformjs/zod',
  ],
  outExtensions({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' }
  },
})
