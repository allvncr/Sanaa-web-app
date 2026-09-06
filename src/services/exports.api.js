import api from './api';

export default {
  genererInterne(paysId, date) {
    return api.post('/exports/interne', null, { params: { pays_id: paysId, date } });
  },
  // Pas de pays_id : l'export usine combine tous les pays d'un même jour
  // (retour V0.1 — voir export.service.js côté backend).
  genererUsine(date) {
    return api.post('/exports/usine', null, { params: { date } });
  },
  lister(params) {
    return api.get('/exports', { params });
  },
  // Le téléchargement passe par Axios (et non un <a href> nu) car la route est
  // protégée par JWT : on récupère le blob puis on déclenche l'enregistrement.
  async telecharger(id, nomFichier) {
    const response = await api.get(`/exports/${id}/telecharger`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nomFichier || 'export.xlsx';
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    window.URL.revokeObjectURL(url);
  },
};
