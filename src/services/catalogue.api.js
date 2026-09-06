import api from './api';

export default {
  listerCategories() {
    return api.get('/collections');
  },
  creerCategorie(data) {
    return api.post('/collections', data);
  },
  modifierCategorie(id, data) {
    return api.put(`/collections/${id}`, data);
  },
  supprimerCategorie(id) {
    return api.delete(`/collections/${id}`);
  },
  listerProduits(params) {
    return api.get('/produits', { params });
  },
  obtenirProduit(id) {
    return api.get(`/produits/${id}`);
  },
  creerProduit(data) {
    return api.post('/produits', data);
  },
  modifierProduit(id, data) {
    return api.put(`/produits/${id}`, data);
  },
  ajouterVariante(id, data) {
    return api.post(`/produits/${id}/variantes`, data);
  },
  prixEffectif(id, varianteId, paysId) {
    return api.get(`/produits/${id}/prix`, { params: { variante_id: varianteId, pays_id: paysId } });
  },
  definirPrixPays(varianteId, paysId, data) {
    return api.put(`/variantes/${varianteId}/prix/${paysId}`, data);
  },
};
