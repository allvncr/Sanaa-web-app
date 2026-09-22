import api from './api';

export default {
  lister(params) {
    return api.get('/livraisons', { params });
  },
  planifier(commandeId, jour) {
    return api.post('/livraisons', { commande_id: commandeId, jour });
  },
  retirer(id) {
    return api.delete(`/livraisons/${id}`);
  },
};
