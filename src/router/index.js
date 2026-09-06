import Vue from 'vue';
import Router from 'vue-router';
import store from '@/store';

Vue.use(Router);

const routes = [
  { path: '/connexion', name: 'connexion', component: () => import('@/views/Connexion.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('@/components/common/AppShell.vue'),
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { permission: 'dashboard:voir_pays' },
      },
      {
        path: 'commandes',
        name: 'commandes',
        component: () => import('@/views/CommandesListe.vue'),
        meta: { permission: 'commandes:voir' },
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
  { path: '*', redirect: { name: 'dashboard' } },
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

  if (to.meta.permission && !store.getters['auth/aPermission'](to.meta.permission)) {
    store.dispatch('notifications/erreur', "Vous n'avez pas la permission d'accéder à cet écran.");
    return next(false);
  }

  return next();
});

export default router;
