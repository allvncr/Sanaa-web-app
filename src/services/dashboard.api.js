import api from './api';

export default {
  kpis(params) {
    return api.get('/dashboard/kpis', { params });
  },
  comparaisonPays(params) {
    return api.get('/dashboard/comparaison-pays', { params });
  },
  performanceProduits(params) {
    return api.get('/dashboard/performance-produits', { params });
  },
  evolutionCA(params) {
    return api.get('/dashboard/evolution-ca', { params });
  },
  repartitionLivraison(params) {
    return api.get('/dashboard/repartition-livraison', { params });
  },
  alertes(params) {
    return api.get('/alertes', { params });
  },
  journalActivite(params) {
    return api.get('/journal-activite', { params });
  },
};
