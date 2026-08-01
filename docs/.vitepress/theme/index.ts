import type { Theme } from 'vitepress'
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from 'element-plus'
import DefaultTheme from 'vitepress/theme'
import 'element-plus/dist/index.css'
import ProductHome from './components/ProductHome.vue'
import LiveConditionalDemo from './components/examples/LiveConditionalDemo.vue'
import LiveCrudDialogDemo from './components/examples/LiveCrudDialogDemo.vue'
import LiveZodListDemo from './components/examples/LiveZodListDemo.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.provide(ID_INJECTION_KEY, { prefix: 1024, current: 0 })
    app.provide(ZINDEX_INJECTION_KEY, { current: 0 })
    app.component('ProductHome', ProductHome)
    app.component('LiveCrudDialogDemo', LiveCrudDialogDemo)
    app.component('LiveConditionalDemo', LiveConditionalDemo)
    app.component('LiveZodListDemo', LiveZodListDemo)
  },
} satisfies Theme
