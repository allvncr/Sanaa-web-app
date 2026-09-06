import authApi from '@/services/auth.api';

const ACCESS_KEY = 'sanaa_access_token';
const REFRESH_KEY = 'sanaa_refresh_token';

function chargerAccessToken() {
  try { return localStorage.getItem(ACCESS_KEY) || null; } catch (e) { return null; }
}
function chargerRefreshToken() {
  try { return localStorage.getItem(REFRESH_KEY) || null; } catch (e) { return null; }
}

export default {
  namespaced: true,
  state: () => ({
    accessToken: chargerAccessToken(),
    refreshToken: chargerRefreshToken(),
    utilisateur: null,
  }),
  getters: {
    estConnecte: (state) => !!state.accessToken,
    permissions: (state) => (state.utilisateur ? state.utilisateur.permissions : []),
    porteeGlobale: (state) => (state.utilisateur ? state.utilisateur.role.portee === 'global' : false),
    paysAutorises: (state) => (state.utilisateur ? state.utilisateur.pays_autorises : []),
    aPermission: (state, getters) => (permission) =>
      getters.porteeGlobale || getters.permissions.includes(permission),
  },
  mutations: {
    DEFINIR_TOKENS(state, { accessToken, refreshToken }) {
      state.accessToken = accessToken;
      state.refreshToken = refreshToken ?? state.refreshToken;
      try {
        if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
        if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
      } catch (e) { /* stockage indisponible (navigation privée) — session en mémoire seulement */ }
    },
    DEFINIR_UTILISATEUR(state, utilisateur) {
      state.utilisateur = utilisateur;
    },
    EFFACER_SESSION(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.utilisateur = null;
      try {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
      } catch (e) { /* ignore */ }
    },
  },
  actions: {
    async connexion({ commit, dispatch }, { email, mot_de_passe }) {
      const { data } = await authApi.login(email, mot_de_passe);
      commit('DEFINIR_TOKENS', { accessToken: data.data.accessToken, refreshToken: data.data.refreshToken });
      commit('DEFINIR_UTILISATEUR', data.data.utilisateur);
      await dispatch('paysContexte/initialiser', null, { root: true });
      return data.data.utilisateur;
    },
    async chargerProfil({ commit, state }) {
      if (!state.accessToken) return null;
      try {
        const { data } = await authApi.me();
        commit('DEFINIR_UTILISATEUR', data.data);
        return data.data;
      } catch (err) {
        commit('EFFACER_SESSION');
        return null;
      }
    },
    async rafraichirSession({ commit, state }) {
      const { data } = await authApi.refresh(state.refreshToken);
      commit('DEFINIR_TOKENS', { accessToken: data.data.accessToken });
      return data.data.accessToken;
    },
    async deconnexion({ commit }) {
      try { await authApi.logout(); } catch (e) { /* ignore */ }
      commit('EFFACER_SESSION');
    },
    deconnexionLocale({ commit }) {
      commit('EFFACER_SESSION');
    },
  },
};
