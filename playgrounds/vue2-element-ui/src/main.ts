import ElementUI from 'element-ui'
import Vue from 'vue'
import App from './App.vue'
import 'element-ui/lib/theme-chalk/index.css'

Vue.use(ElementUI)

new Vue({
  render: h => h(App),
}).$mount('#app')
