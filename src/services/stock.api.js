import api from './api';

export default {
  articles(params) {
    return api.get('/stock/articles', { params });
  },
  creerArticle(data) {
    return api.post('/stock/articles', data);
  },
  modifierArticle(id, data) {
    return api.patch(`/stock/articles/${id}`, data);
  },
  mouvements(params) {
    return api.get('/stock/mouvements', { params });
  },
  enregistrerMouvement(data) {
    return api.post('/stock/mouvements', data);
  },
  annulerMouvement(id) {
    return api.patch(`/stock/mouvements/${id}/annuler`);
  },
};
