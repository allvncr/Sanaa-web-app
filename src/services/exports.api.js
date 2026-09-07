import api from './api';

export default {
  genererInterne(paysId, date) {
    return api.post('/exports/interne', null, { params: { pays_id: paysId, date } });
  },
  // Retour V0.1 : l'export usine est généré par pays, comme l'export interne.
  genererUsine(paysId, date) {
    return api.post('/exports/usine', null, { params: { pays_id: paysId, date } });
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
