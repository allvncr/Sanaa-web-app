import Vue from 'vue';
import './plugins/element';
import App from './App.vue';
import router from './router';
import store from './store';
import i18n from './i18n';
import permissionsPlugin from './plugins/permissions';
import { formaterMontant, formaterDate, formaterDateHeure } from './utils/format';
import { initialiserTheme } from './utils/theme';

import 'element-ui/lib/theme-chalk/index.css';
import './assets/styles/global.scss';

Vue.use(permissionsPlugin);
// Graphiques : la bibliothèque (~500 Ko) n'est téléchargée que lorsqu'un écran
// affiche un <apexchart>, pas au démarrage de l'application.
Vue.component('apexchart', () => import('vue-apexcharts').then((m) => m.default || m));

Vue.filter('montant', formaterMontant);
Vue.filter('dateFr', formaterDate);
Vue.filter('dateHeureFr', formaterDateHeure);

Vue.config.productionTip = false;

initialiserTheme();

new Vue({
  router,
  store,
  i18n,
  render: (h) => h(App),
}).$mount('#app');
