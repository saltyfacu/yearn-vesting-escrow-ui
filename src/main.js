import Vue from 'vue'
import App from './App.vue'
import Vuex from 'vuex'
import VueMoment from 'vue-moment'
import moment from 'moment-timezone'
 
import escrowList from './escrows.js'
import drizzleVuePlugin from '@drizzle/vue-plugin'
import drizzleOptions from './drizzleOptions'

import Web3 from 'web3';

import Buefy from 'buefy'
import 'buefy/dist/buefy.css'

Vue.use(VueMoment, {
  moment,
})

Vue.use(Buefy, {
  defaultUseHtml5Validation: false,
})

Vue.use(Vuex)
const store = new Vuex.Store({ state: {} });

console.log("main.js");

let web3 = new Web3(Web3.givenProvider);
let activeAccount;

Vue.use(drizzleVuePlugin, { store, drizzleOptions })

Vue.config.productionTip = false

new Vue({
  store,
  render: h => h(App),
}).$mount('#app')
