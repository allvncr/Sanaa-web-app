import api from './api';

export default {
  listerCategories() {
    return api.get('/categories-depenses');
  },
  creerCategorie(data) {
    return api.post('/categories-depenses', data);
  },
  lister(params) {
    return api.get('/depenses', { params });
  },
  creer(data) {
    return api.post('/depenses', data);
  },
  valider(id) {
    return api.patch(`/depenses/${id}/valider`);
  },
};
