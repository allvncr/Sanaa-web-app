import api from './api';

export default {
  lister(params) {
    return api.get('/pays', { params });
  },
  obtenir(id) {
    return api.get(`/pays/${id}`);
  },
  creer(data) {
    return api.post('/pays', data);
  },
  modifier(id, data) {
    return api.put(`/pays/${id}`, data);
  },
  supprimer(id) {
    return api.delete(`/pays/${id}`);
  },
  heriterCatalogue(id) {
    return api.post(`/pays/${id}/heriter-catalogue`);
  },
};
