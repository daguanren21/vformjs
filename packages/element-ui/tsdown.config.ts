import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/use-zod-form.ts'],
  format: ['esm', 'cjs'],
  dts: { generator: 'oxc' },
  external: [
    'vue',
    'vue-demi',
    'zod',
    'element-ui',
    '@vformjs/core',
    '@vformjs/vue',
    '@vformjs/zod',
  ],
  outExtensions({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' }
  },
})
