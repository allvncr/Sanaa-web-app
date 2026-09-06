import store from '@/store';

// Directive v-can="'commandes:creer'" pour masquer un élément selon les
// permissions de l'utilisateur courant (section 4.2) — complète les gardes de
// route, qui ne couvrent que la navigation entre écrans.
export default {
  install(Vue) {
    Vue.directive('can', {
      inserted(el, binding) {
        if (!store.getters['auth/aPermission'](binding.value)) {
          el.parentNode && el.parentNode.removeChild(el);
        }
      },
    });
    Vue.prototype.$can = (permission) => store.getters['auth/aPermission'](permission);
  },
};
