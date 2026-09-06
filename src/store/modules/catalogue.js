import catalogueApi from '@/services/catalogue.api';
import referentielsApi from '@/services/referentiels.api';

// Cache léger des listes de référence peu volatiles (section 2.1 : "données mises
// en cache — catalogue, listes de référence") pour éviter de les recharger à
// chaque navigation entre écrans. Le catalogue produits peut cependant être
// modifié depuis un autre écran (Catalogue global, Prix par pays) qui n'utilise
// pas ce module ; une durée de vie courte évite d'afficher un catalogue périmé
// sans pour autant perdre le bénéfice du cache lors d'allers-retours rapides.
const DUREE_CACHE_MS = 15000;

export default {
  namespaced: true,
  state: () => ({
    categories: [],
    produits: [],
    devises: [],
    chargeLe: null,
  }),
  mutations: {
    DEFINIR_CATEGORIES(state, v) { state.categories = v; },
    DEFINIR_PRODUITS(state, v) { state.produits = v; },
    DEFINIR_DEVISES(state, v) { state.devises = v; },
    DEFINIR_CHARGE_LE(state, v) { state.chargeLe = v; },
  },
  actions: {
    async charger({ commit, state }, { forcer = false } = {}) {
      if (state.chargeLe && !forcer && Date.now() - state.chargeLe < DUREE_CACHE_MS) return;
      const [categories, produits, devises] = await Promise.all([
        catalogueApi.listerCategories(),
        catalogueApi.listerProduits({ statut: 'actif' }),
        referentielsApi.listerDevises(),
      ]);
      commit('DEFINIR_CATEGORIES', categories.data.data);
      commit('DEFINIR_PRODUITS', produits.data.data);
      commit('DEFINIR_DEVISES', devises.data.data);
      commit('DEFINIR_CHARGE_LE', Date.now());
    },
  },
};
