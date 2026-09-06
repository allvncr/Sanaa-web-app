import Vue from 'vue';
import ElementUI from 'element-ui';
import locale from 'element-ui/lib/locale/lang/fr';
import VueApexCharts from 'vue-apexcharts';
import App from './App.vue';
import router from './router';
import store from './store';
import i18n from './i18n';
import permissionsPlugin from './plugins/permissions';
import { formaterMontant, formaterDate, formaterDateHeure } from './utils/format';

import 'element-ui/lib/theme-chalk/index.css';
import './assets/styles/global.scss';

Vue.use(ElementUI, { locale });
Vue.use(VueApexCharts);
Vue.use(permissionsPlugin);
Vue.component('apexchart', VueApexCharts);

Vue.filter('montant', formaterMontant);
Vue.filter('dateFr', formaterDate);
Vue.filter('dateHeureFr', formaterDateHeure);

Vue.config.productionTip = false;

new Vue({
  router,
  store,
  i18n,
  render: (h) => h(App),
}).$mount('#app');
