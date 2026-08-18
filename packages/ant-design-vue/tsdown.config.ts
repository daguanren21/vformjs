import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/use-zod-form.ts', 'src/use-schema-form.ts'],
  format: ['esm', 'cjs'],
  dts: { generator: 'oxc' },
  external: [
    'vue',
    'vue-demi',
    'zod',
    'ant-design-vue',
    '@vformjs/core',
    '@vformjs/vue',
    '@vformjs/zod',
  ],
  outExtensions({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' }
  },
})
