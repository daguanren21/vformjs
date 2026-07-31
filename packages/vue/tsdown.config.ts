import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  external: ['vue', 'vue-demi', '@veform/core'],
  outExtensions({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' }
  },
})
