import Vue from 'vue';
import Router from 'vue-router';
import store from '@/store';

Vue.use(Router);

// Accueil selon le rôle : renvoyer tout le monde vers "dashboard" (redirect
// "/" statique, ou "*") bloquerait silencieusement sur place un rôle sans
// accès au dashboard (Livreur, et Gestionnaire depuis le 01/10/2026) — la
// garde de navigation refuserait la permission sans jamais les rediriger
// ailleurs.
function accueilSelonRole() {
  const utilisateur = store.state.auth.utilisateur;
  if (!utilisateur) return { name: 'dashboard' };
  if (utilisateur.role.nom === 'Livreur') return { name: 'mes-livraisons' };
  if (store.getters['auth/aPermission']('dashboard:voir_pays') || store.getters['auth/aPermission']('dashboard:voir_global')) {
    return { name: 'dashboard' };
  }
  // Rôles sans dashboard (Gestionnaire...) : leur tableau de bord, c'est la
  // liste de ce qu'il y a à traiter aujourd'hui.
  return store.getters['auth/aPermission']('commandes:voir') ? { name: 'a-traiter' } : { name: 'commandes' };
}

const routes = [
  { path: '/connexion', name: 'connexion', component: () => import('@/views/Connexion.vue'), meta: { public: true } },
  { path: '/suivi', name: 'suivi-commande', component: () => import('@/views/SuiviCommande.vue'), meta: { public: true } },
  {
    // Écran dédié au rôle Livreur : authentifié comme le reste (pas de meta.public),
    // mais volontairement hors AppShell — pas de menu, pas de sélecteur de pays,
    // optimisé mobile (retour V0.1, section livreurs, 26/09/2026).
    path: '/mes-livraisons',
    name: 'mes-livraisons',
    component: () => import('@/views/LivraisonMobile.vue'),
    meta: { permission: 'livraisons:livrer' },
  },
  {
    path: '/',
    component: () => import('@/components/common/AppShell.vue'),
    children: [
      {
        path: '',
        // Fonction (pas un objet statique) : un utilisateur Livreur qui atterrit
        // sur "/" (favori, retour navigateur...) doit filer vers son écran dédié,
        // pas vers le dashboard auquel il n'a pas accès (blocage silencieux sinon).
        redirect: accueilSelonRole,
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { permission: 'dashboard:voir_pays' },
      },
      {
        path: 'a-traiter',
        name: 'a-traiter',
        component: () => import('@/views/ATraiter.vue'),
        meta: { permission: 'commandes:voir' },
      },
      {
        path: 'commandes',
        name: 'commandes',
        component: () => import('@/views/CommandesListe.vue'),
        meta: { permission: 'commandes:voir' },
      },
      {
        path: 'livraisons',
        name: 'livraisons',
        component: () => import('@/views/Livraisons.vue'),
        meta: { permission: 'livraisons:voir' },
      },
      {
        path: 'commandes/nouvelle',
        name: 'commande-nouvelle',
        component: () => import('@/views/CommandeForm.vue'),
        meta: { permission: 'commandes:creer' },
      },
      {
        path: 'commandes/:id',
        name: 'commande-detail',
        component: () => import('@/views/CommandeDetail.vue'),
        meta: { permission: 'commandes:voir' },
        props: true,
      },
      {
        path: 'encaissements',
        name: 'encaissements',
        component: () => import('@/views/EncaissementsJour.vue'),
        meta: { permission: 'paiements:voir' },
      },
      {
        path: 'clients',
        name: 'clients',
        component: () => import('@/views/Clients.vue'),
        meta: { permission: 'clients:voir' },
      },
      {
        path: 'catalogue',
        name: 'catalogue',
        component: () => import('@/views/CatalogueGlobal.vue'),
        meta: { permission: 'catalogue:voir' },
      },
      {
        path: 'prix-par-pays',
        name: 'prix-par-pays',
        component: () => import('@/views/PrixParPays.vue'),
        meta: { permission: 'catalogue:voir' },
      },
      {
        path: 'exports',
        name: 'exports',
        component: () => import('@/views/Exports.vue'),
        meta: { permission: 'exports:generer' },
      },
      {
        path: 'pays',
        name: 'pays',
        component: () => import('@/views/Pays.vue'),
        meta: { permission: 'pays:voir' },
      },
      {
        path: 'utilisateurs',
        name: 'utilisateurs',
        component: () => import('@/views/Utilisateurs.vue'),
        meta: { permission: 'utilisateurs:voir' },
      },
      {
        path: 'depenses',
        name: 'depenses',
        component: () => import('@/views/Depenses.vue'),
        meta: { permission: 'depenses:voir' },
      },
      {
        path: 'stock',
        name: 'stock',
        component: () => import('@/views/Stock.vue'),
        meta: { permission: 'stock:voir' },
      },
      {
        path: 'journal-activite',
        name: 'journal-activite',
        component: () => import('@/views/JournalActivite.vue'),
        meta: { permission: 'journal_activite:voir' },
      },
      {
        path: 'parametres',
        name: 'parametres',
        component: () => import('@/views/Parametres.vue'),
      },
    ],
  },
  { path: '*', redirect: accueilSelonRole },
];

const router = new Router({ mode: 'history', routes });

// Garde de navigation : authentification + permissions (section 2.1, 4).
router.beforeEach(async (to, from, next) => {
  if (to.meta.public) return next();

  if (!store.getters['auth/estConnecte']) {
    return next({ name: 'connexion', query: { redirect: to.fullPath } });
  }

  if (!store.state.auth.utilisateur) {
    await store.dispatch('auth/chargerProfil');
    if (!store.getters['auth/estConnecte']) return next({ name: 'connexion' });
  }

  if (store.state.paysContexte.liste.length === 0) {
    await store.dispatch('paysContexte/initialiser');
  }

  // Le calendrier admin ("Livraisons") reste accessible en lecture à un Livreur
  // (même permission livraisons:voir), mais on le renvoie vers son écran mobile
  // dédié, bien plus simple pour son usage réel — pas une histoire de droits.
  if (to.name === 'livraisons' && store.state.auth.utilisateur?.role.nom === 'Livreur') {
    return next({ name: 'mes-livraisons' });
  }

  if (to.meta.permission && !store.getters['auth/aPermission'](to.meta.permission)) {
    // Écran refusé : on envoie l'utilisateur sur SON accueil plutôt que de le
    // laisser bloqué. Cas typique : le redirect "?redirect=/dashboard" mémorisé
    // avant la connexion (visite de "/" sans session, quand on ignore encore
    // le rôle) qui renvoyait un Gestionnaire/Livreur sur un écran interdit juste
    // après s'être connecté. L'alerte n'apparaît que pour une navigation
    // volontaire dans l'appli, pas pour ce renvoi automatique.
    const accueil = router.resolve(accueilSelonRole()).route;
    const accueilAutorise = !accueil.meta.permission || store.getters['auth/aPermission'](accueil.meta.permission);
    if (accueilAutorise && accueil.name !== to.name) {
      if (from.name && from.name !== 'connexion') store.dispatch('notifications/erreur', "Vous n'avez pas la permission d'accéder à cet écran.");
      return next({ name: accueil.name, replace: true });
    }
    store.dispatch('notifications/erreur', "Vous n'avez pas la permission d'accéder à cet écran.");
    return next(false);
  }

  return next();
});

export default router;
