import api from './api';

export default {
  listerDevises() {
    return api.get('/devises');
  },
  creerDevise(data) {
    return api.post('/devises', data);
  },
  listerTaux(params) {
    return api.get('/taux-change', { params });
  },
  ajouterTaux(data) {
    return api.post('/taux-change', data);
  },
  listerMoyensPaiement(paysId) {
    return api.get('/moyens-paiement', { params: { pays_id: paysId } });
  },
  listerRoles() {
    return api.get('/roles');
  },
};
