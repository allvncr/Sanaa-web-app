import api from './api';

export default {
  lister(params) {
    return api.get('/commandes', { params });
  },
  obtenir(id) {
    return api.get(`/commandes/${id}`);
  },
  creer(data) {
    return api.post('/commandes', data);
  },
  modifier(id, data) {
    return api.put(`/commandes/${id}`, data);
  },
  changerStatutCommande(id, statut) {
    return api.patch(`/commandes/${id}/statut-commande`, { statut });
  },
  changerStatutFabrication(id, statut) {
    return api.patch(`/commandes/${id}/statut-fabrication`, { statut });
  },
  changerStatutLivraison(id, statut) {
    return api.patch(`/commandes/${id}/statut-livraison`, { statut });
  },
  listerPaiements(id) {
    return api.get(`/commandes/${id}/paiements`);
  },
  enregistrerPaiement(id, data) {
    return api.post(`/commandes/${id}/paiements`, data);
  },
  encaissementsJour(paysId, date) {
    return api.get('/paiements/encaissements-jour', { params: { pays_id: paysId, date } });
  },
};
