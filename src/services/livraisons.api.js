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
  // Fiche de livraison du jour (PDF) : route protégée par JWT, donc blob puis
  // enregistrement manuel. En cas d'erreur le corps est un blob : on le relit
  // en JSON pour que l'appelant retrouve le message du serveur.
  async telechargerFiche(jour, paysId) {
    try {
      const response = await api.get('/livraisons/fiche', { params: { jour, pays_id: paysId }, responseType: 'blob' });
      const disposition = response.headers['content-disposition'] || '';
      const nom = (/filename="?([^";]+)"?/.exec(disposition) || [])[1] || `fiche-livraison-${jour}.pdf`;
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = nom;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      if (err.response && err.response.data instanceof Blob) {
        try { err.response.data = JSON.parse(await err.response.data.text()); } catch (e) { /* corps non JSON */ }
      }
      throw err;
    }
  },
  marquerLivree(id, { total_recu_client, moyen_paiement, frais_livraison }) {
    return api.patch(`/livraisons/${id}/livrer`, { total_recu_client, moyen_paiement, frais_livraison });
  },
  signalerProbleme(id) {
    return api.patch(`/livraisons/${id}/probleme`);
  },
};
