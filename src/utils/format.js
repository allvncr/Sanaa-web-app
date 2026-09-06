export function formaterMontant(valeur, symbole = '') {
  if (valeur === null || valeur === undefined || valeur === '') return '—';
  const nombre = Number(valeur);
  if (Number.isNaN(nombre)) return String(valeur);
  const formate = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(nombre);
  return symbole ? `${formate} ${symbole}` : formate;
}

export function formaterDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formaterDateHeure(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function classeStatut(statut) {
  return `is-${String(statut || '').toLowerCase().replace(/_/g, '-')}`;
}
