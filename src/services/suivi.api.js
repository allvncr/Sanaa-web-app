import api from './api';

// Public, sans jeton — l'intercepteur d'api.js n'ajoute simplement pas
// d'en-tête Authorization quand personne n'est connecté (normal ici).
export default {
  suivre(numero, telephone) {
    return api.get(`/suivi/${encodeURIComponent(numero)}`, { params: { telephone } });
  },
};
