import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  dts: { generator: 'oxc' },
  outputOptions: {
    codeSplitting: false,
  },
  outExtensions() {
    return { js: '.js' }
  },
})
