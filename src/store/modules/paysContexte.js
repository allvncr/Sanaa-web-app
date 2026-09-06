import paysApi from '@/services/pays.api';

// Contexte pays actif (section 22 : sélecteur "Tous les pays" / pays spécifique,
// présent sur chaque écran) + devise d'affichage pour la consolidation globale.
export default {
  namespaced: true,
  state: () => ({
    liste: [],
    paysActifId: null, // null = "Tous les pays" (réservé aux portées globales)
    deviseAffichage: 'XOF',
    chargement: false,
  }),
  getters: {
    paysActif: (state) => state.liste.find((p) => p._id === state.paysActifId) || null,
    estVueGlobale: (state) => state.paysActifId === null,
  },
  mutations: {
    DEFINIR_LISTE(state, liste) {
      state.liste = liste;
    },
    DEFINIR_PAYS_ACTIF(state, id) {
      state.paysActifId = id;
    },
    DEFINIR_DEVISE_AFFICHAGE(state, code) {
      state.deviseAffichage = code;
    },
    DEFINIR_CHARGEMENT(state, val) {
      state.chargement = val;
    },
  },
  actions: {
    async initialiser({ commit, rootGetters }) {
      commit('DEFINIR_CHARGEMENT', true);
      try {
        const { data } = await paysApi.lister({ actif: true });
        commit('DEFINIR_LISTE', data.data);
        const porteeGlobale = rootGetters['auth/porteeGlobale'];
        if (!porteeGlobale && data.data.length > 0) {
          commit('DEFINIR_PAYS_ACTIF', data.data[0]._id);
          commit('DEFINIR_DEVISE_AFFICHAGE', data.data[0].devise_locale_id?.code || 'XOF');
        } else {
          commit('DEFINIR_PAYS_ACTIF', null);
        }
      } finally {
        commit('DEFINIR_CHARGEMENT', false);
      }
    },
    selectionnerPays({ commit, state }, id) {
      commit('DEFINIR_PAYS_ACTIF', id);
      const pays = state.liste.find((p) => p._id === id);
      if (pays?.devise_locale_id?.code) commit('DEFINIR_DEVISE_AFFICHAGE', pays.devise_locale_id.code);
    },
  },
};
