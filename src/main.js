import Vue from 'vue'
import App from './App.vue'
import Vuex from 'vuex'
import VueMoment from 'vue-moment'
import moment from 'moment-timezone'
 
import drizzleVuePlugin from '@drizzle/vue-plugin'
import drizzleOptions from './drizzleOptions'

import Buefy from 'buefy'
import 'buefy/dist/buefy.css'

Vue.use(VueMoment, {moment})
Vue.use(Buefy, {defaultUseHtml5Validation: false})

Vue.use(Vuex)
const store = new Vuex.Store({ state: {} });

console.log("main.js");

Vue.use(drizzleVuePlugin, { store, drizzleOptions })

Vue.config.productionTip = false

new Vue({store, render: h => h(App)}).$mount('#app')
