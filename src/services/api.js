import axios from 'axios';
import store from '@/store';
import router from '@/router';

// Client Axios unique avec intercepteur JWT + pays actif (section 2.1) : injecte
// le jeton d'accès et le pays sélectionné, et gère le rafraîchissement de session
// ainsi que les erreurs 401/403 de façon centralisée.
const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  const token = store.state.auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let rafraichissementEnCours = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response && response.status === 401 && !config._retry && config.url !== '/auth/refresh') {
      config._retry = true;
      try {
        if (!rafraichissementEnCours) {
          rafraichissementEnCours = store.dispatch('auth/rafraichirSession');
        }
        const nouveauToken = await rafraichissementEnCours;
        rafraichissementEnCours = null;
        config.headers.Authorization = `Bearer ${nouveauToken}`;
        return api(config);
      } catch (err) {
        rafraichissementEnCours = null;
        store.dispatch('auth/deconnexionLocale');
        router.push({ name: 'connexion' });
        return Promise.reject(error);
      }
    }
    if (response && response.status === 403) {
      store.dispatch('notifications/avertir', {
        message: response.data?.error?.message || "Vous n'avez pas accès à cette ressource.",
        type: 'warning',
      });
    }
    return Promise.reject(error);
  }
);

export default api;
