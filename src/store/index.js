import Vue from 'vue';
import Vuex from 'vuex';
import auth from './modules/auth';
import paysContexte from './modules/paysContexte';
import notifications from './modules/notifications';
import catalogue from './modules/catalogue';

Vue.use(Vuex);

export default new Vuex.Store({
  modules: { auth, paysContexte, notifications, catalogue },
});
