import api from './api';

export default {
  lister() {
    return api.get('/utilisateurs');
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
