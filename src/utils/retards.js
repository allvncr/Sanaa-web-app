// Retards repérés sur une commande (retour du 23/10/2026) : mêmes délais que le
// tableau « À traiter » et la page de suivi (7 jours de fabrication, 5 jours de
// transit après la fabrication). Sert à marquer les lignes urgentes des listes.
const JOUR_MS = 24 * 60 * 60 * 1000;
const JOURS_FABRICATION = 7;
const JOURS_TRANSIT = 5;

const jours = (de, a) => Math.floor((a.getTime() - new Date(de).getTime()) / JOUR_MS);
const plus = (date, n) => new Date(new Date(date).getTime() + n * JOUR_MS);

/**
 * @returns {{niveau: 'retard'|'attention', texte: string}|null}
 */
export function retardCommande(c, maintenant = new Date()) {
  if (!c || c.statut_commande === 'Annulee' || c.statut_livraison === 'Livree') return null;

  if (c.statut_livraison === 'Retour_echec') {
    return { niveau: 'retard', texte: 'Échec de livraison : à reprogrammer' };
  }
  if (c.statut_livraison === 'Recue_en_pays') {
    const depuis = c.date_recue_en_pays || c.updatedAt;
    const j = depuis ? jours(depuis, maintenant) : 0;
    return j >= 2 ? { niveau: 'attention', texte: `Reçue en pays depuis ${j} j, pas encore planifiée` } : null;
  }
  if (c.statut_livraison === 'En_livraison') return null;

  if (c.statut_fabrication === 'Terminee') {
    const fin = c.date_fabrication_terminee || plus(c.createdAt, JOURS_FABRICATION);
    const echeance = plus(fin, JOURS_TRANSIT);
    return echeance < maintenant
      ? { niveau: 'retard', texte: `Colis attendu depuis ${jours(echeance, maintenant)} j (transit)` }
      : null;
  }
  if (c.statut_fabrication === 'En_fabrication') {
    const echeance = plus(c.createdAt, JOURS_FABRICATION);
    return echeance < maintenant
      ? { niveau: 'retard', texte: `Fabrication en retard de ${jours(echeance, maintenant)} j` }
      : null;
  }
  if (c.statut_fabrication === 'Erreur') {
    return { niveau: 'retard', texte: 'Erreur de fabrication signalée' };
  }
  if (c.statut_fabrication === 'A_produire') {
    const j = jours(c.createdAt, maintenant);
    return j >= 2 ? { niveau: 'attention', texte: `Pas encore envoyée à l'usine (${j} j)` } : null;
  }
  return null;
}
