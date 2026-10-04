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
  marquerLivree(id, { total_recu_client, moyen_paiement, frais_livraison }) {
    return api.patch(`/livraisons/${id}/livrer`, { total_recu_client, moyen_paiement, frais_livraison });
  },
  signalerProbleme(id) {
    return api.patch(`/livraisons/${id}/probleme`);
  },
};
