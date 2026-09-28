import axios from 'axios';
import store from '@/store';
import router from '@/router';

// Client Axios unique avec intercepteur JWT + pays actif (section 2.1) : injecte
// le jeton d'accès et le pays sélectionné, et gère le rafraîchissement de session
// ainsi que les erreurs 401/403 de façon centralisée.
//
// En développement (`npm run dev`, import.meta.env.DEV), l'URL relative
// "/api/v1" passe par le proxy Vite vers le backend local (voir vite.config.js)
// — c'était cassé jusqu'au 28/09/2026 : sans VITE_API_BASE_URL, ça retombait
// silencieusement sur l'API Render de PRODUCTION même en local (découvert en
// testant le rôle Livreur : le "backend local" affichait de vraies commandes).
// En build de production, VITE_API_BASE_URL (ex. un .env.production.local non
// commité) permet de pointer ailleurs — utilisé sur le VPS (deploy/) où
// frontend et backend sont sur le même domaine : VITE_API_BASE_URL=/api/v1
// (Nginx fait le proxy). Sans cette variable, on retombe sur l'URL Render
// actuelle (Netlify) pour ne rien casser.
const baseURL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api/v1' : 'https://sanaa-api.onrender.com/api/v1');
const api = axios.create({ baseURL });

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
