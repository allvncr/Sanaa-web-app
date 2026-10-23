// Thème de l'interface : clair (identité de marque, par défaut) ou sombre, et
// mode « contraste élevé » de l'écran livreur (lisibilité en plein soleil).
// Choix mémorisés dans le navigateur ; jamais bloquant si le stockage est refusé.

const CLE_THEME = 'sanaa-theme';
const CLE_CONTRASTE = 'sanaa-contraste';

function lire(cle) {
  try { return window.localStorage.getItem(cle); } catch (e) { return null; }
}
function ecrire(cle, valeur) {
  try { window.localStorage.setItem(cle, valeur); } catch (e) { /* stockage indisponible */ }
}

export function themeActuel() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function appliquerTheme(theme) {
  if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
}

export function basculerTheme() {
  const suivant = themeActuel() === 'dark' ? 'light' : 'dark';
  appliquerTheme(suivant);
  ecrire(CLE_THEME, suivant);
  return suivant;
}

export function contrasteActif() {
  return document.documentElement.getAttribute('data-contrast') === 'high';
}

export function appliquerContraste(actif) {
  if (actif) document.documentElement.setAttribute('data-contrast', 'high');
  else document.documentElement.removeAttribute('data-contrast');
}

export function basculerContraste() {
  const actif = !contrasteActif();
  appliquerContraste(actif);
  ecrire(CLE_CONTRASTE, actif ? 'high' : 'normal');
  return actif;
}

/** À appeler avant le montage de l'application (évite un flash de thème clair). */
export function initialiserTheme() {
  appliquerTheme(lire(CLE_THEME) === 'dark' ? 'dark' : 'light');
  appliquerContraste(lire(CLE_CONTRASTE) === 'high');
}
