import api from './api';

export default {
  lister(params) {
    return api.get('/utilisateurs', { params });
  },
  creer(data) {
    return api.post('/utilisateurs', data);
  },
  modifier(id, data) {
    return api.put(`/utilisateurs/${id}`, data);
  },
  attribuerPays(id, paysIds) {
    return api.post(`/utilisateurs/${id}/pays`, { pays_ids: paysIds });
  },
};
