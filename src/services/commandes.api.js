import api from './api';

export default {
  lister(params) {
    return api.get('/commandes', { params });
  },
  createurs(params) {
    return api.get('/commandes/createurs', { params });
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
  supprimer(id, { confirmerPaiements = false } = {}) {
    return api.delete(`/commandes/${id}`, { params: confirmerPaiements ? { confirmer_paiements: true } : {} });
  },
  historique(id) {
    return api.get(`/commandes/${id}/historique`);
  },
  modifierStatutsEnLot(ids, { statut_fabrication, statut_livraison } = {}) {
    return api.patch('/commandes/statuts-lot', { ids, statut_fabrication, statut_livraison });
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
  modifierPaiement(id, paiementId, data) {
    return api.put(`/commandes/${id}/paiements/${paiementId}`, data);
  },
  annulerPaiement(id, paiementId) {
    return api.patch(`/commandes/${id}/paiements/${paiementId}/annuler`);
  },
  encaissementsJour(paysId, date) {
    return api.get('/paiements/encaissements-jour', { params: { pays_id: paysId, date } });
  },
};
