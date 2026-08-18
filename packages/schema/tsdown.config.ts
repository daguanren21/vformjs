import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: { generator: 'oxc' },
  external: [
    'vue',
    'vue-demi',
    '@standard-schema/spec',
    '@vformjs/core',
    '@vformjs/vue',
  ],
  outExtensions({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' }
  },
})
