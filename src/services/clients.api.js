import api from './api';

export default {
  lister(params) {
    return api.get('/clients', { params });
  },
  creer(data) {
    return api.post('/clients', data);
  },
  modifier(id, data) {
    return api.put(`/clients/${id}`, data);
  },
  historiqueCommandes(id) {
    return api.get(`/clients/${id}/commandes`);
  },
};
