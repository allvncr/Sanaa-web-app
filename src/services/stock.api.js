import api from './api';

export default {
  niveaux(params) {
    return api.get('/stock', { params });
  },
  listerMouvements(params) {
    return api.get('/stock/mouvements', { params });
  },
  enregistrerMouvement(data) {
    return api.post('/stock/mouvements', data);
  },
  creerTransfert(data) {
    return api.post('/stock/transferts', data);
  },
};
