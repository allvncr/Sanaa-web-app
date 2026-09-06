<template>
  <div class="shell" :class="{ 'sidebar-open-mobile': sidebarOuvertMobile }">
    <aside class="shell__sidebar" :class="{ 'is-collapsed': sidebarReduit }">
      <div class="shell__brand">
        <span class="shell__brand-mark">SANAA</span>
        <span v-if="!sidebarReduit" class="shell__brand-sub">Gestion globale</span>
      </div>

      <el-menu
        :default-active="$route.name"
        :collapse="sidebarReduit"
        class="shell__menu"
        router
      >
        <el-menu-item
          v-for="item in itemsMenu"
          :key="item.name"
          :index="item.name"
          :route="{ name: item.name }"
          v-can="item.permission"
        >
          <i :class="item.icone" class="shell__menu-icon" />
          <span slot="title">{{ item.label }}</span>
        </el-menu-item>
      </el-menu>

      <button class="shell__collapse-btn hide-mobile" @click="sidebarReduit = !sidebarReduit">
        <i :class="sidebarReduit ? 'el-icon-d-arrow-right' : 'el-icon-d-arrow-left'" />
      </button>
    </aside>

    <div v-if="sidebarOuvertMobile" class="shell__overlay" @click="sidebarOuvertMobile = false" />

    <div class="shell__main">
      <header class="shell__topbar">
        <button class="shell__burger hide-desktop" @click="sidebarOuvertMobile = true">
          <i class="el-icon-menu" />
        </button>

        <div class="shell__pays-select">
          <el-select
            :value="paysContexte.paysActifId"
            size="small"
            :disabled="!estPorteeGlobale"
            @input="selectionnerPays"
          >
            <el-option v-if="estPorteeGlobale" :value="null" label="Tous les pays" />
            <el-option v-for="p in paysContexte.liste" :key="p._id" :value="p._id" :label="p.nom" />
          </el-select>
        </div>

        <div class="shell__spacer" />

        <el-dropdown trigger="click" @command="onCommandeUtilisateur">
          <span class="shell__user">
            <el-avatar size="small" :style="{ background: 'var(--sanaa-accent-2)' }">
              {{ initiales }}
            </el-avatar>
            <span class="hide-mobile">{{ utilisateur ? utilisateur.nom : '' }}</span>
            <i class="el-icon-arrow-down" />
          </span>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item disabled>{{ utilisateur ? utilisateur.role.nom : '' }}</el-dropdown-item>
            <el-dropdown-item command="parametres" icon="el-icon-setting">Paramètres</el-dropdown-item>
            <el-dropdown-item command="deconnexion" icon="el-icon-switch-button" divided>
              Déconnexion
            </el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </header>

      <main class="shell__content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';

export default {
  name: 'AppShell',
  data() {
    return {
      sidebarReduit: false,
      sidebarOuvertMobile: false,
      itemsMenu: [
        { name: 'dashboard', label: 'Dashboard', icone: 'el-icon-data-line', permission: 'dashboard:voir_pays' },
        { name: 'commandes', label: 'Commandes', icone: 'el-icon-shopping-bag-1', permission: 'commandes:voir' },
        { name: 'encaissements', label: 'Encaissements du jour', icone: 'el-icon-wallet', permission: 'paiements:voir' },
        { name: 'clients', label: 'Clients', icone: 'el-icon-user', permission: 'clients:voir' },
        { name: 'catalogue', label: 'Catalogue global', icone: 'el-icon-goods', permission: 'catalogue:voir' },
        { name: 'prix-par-pays', label: 'Prix par pays', icone: 'el-icon-coin', permission: 'catalogue:voir' },
        { name: 'exports', label: 'Exports', icone: 'el-icon-download', permission: 'exports:generer' },
        { name: 'stock', label: 'Stock', icone: 'el-icon-box', permission: 'stock:voir' },
        { name: 'depenses', label: 'Dépenses', icone: 'el-icon-money', permission: 'depenses:voir' },
        { name: 'pays', label: 'Pays', icone: 'el-icon-place', permission: 'pays:voir' },
        { name: 'utilisateurs', label: 'Utilisateurs', icone: 'el-icon-user-solid', permission: 'utilisateurs:voir' },
        { name: 'journal-activite', label: "Journal d'activité", icone: 'el-icon-tickets', permission: 'journal_activite:voir' },
      ],
    };
  },
  computed: {
    ...mapState('auth', ['utilisateur']),
    ...mapState({ paysContexte: (state) => state.paysContexte }),
    ...mapGetters('auth', { estPorteeGlobale: 'porteeGlobale' }),
    initiales() {
      if (!this.utilisateur) return '?';
      return this.utilisateur.nom.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
    },
  },
  watch: {
    '$route'() {
      this.sidebarOuvertMobile = false;
    },
  },
  methods: {
    selectionnerPays(id) {
      this.$store.dispatch('paysContexte/selectionnerPays', id);
    },
    onCommandeUtilisateur(commande) {
      if (commande === 'deconnexion') {
        this.$store.dispatch('auth/deconnexion').then(() => this.$router.push({ name: 'connexion' }));
      } else if (commande === 'parametres') {
        this.$router.push({ name: 'parametres' });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.shell {
  display: flex;
  min-height: 100vh;
  background: var(--sanaa-bg);
}

.shell__sidebar {
  width: var(--sanaa-sidebar-width);
  flex-shrink: 0;
  background: var(--sanaa-surface);
  border-right: 1px solid var(--sanaa-border);
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  position: relative;

  &.is-collapsed { width: var(--sanaa-sidebar-width-collapsed); }

  @media (max-width: 768px) {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 220;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    width: 260px;
  }
}

.sidebar-open-mobile .shell__sidebar {
  @media (max-width: 768px) { transform: translateX(0); }
}

.shell__overlay {
  display: none;
  @media (max-width: 768px) {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(44, 38, 34, 0.4);
    z-index: 210;
  }
}

.shell__brand {
  padding: 22px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.shell__brand-mark {
  font-family: var(--sanaa-font-display);
  font-size: 1.5rem;
  letter-spacing: 0.08em;
  color: var(--sanaa-accent-2-dark);
}
.shell__brand-sub {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--sanaa-text-muted);
}

.shell__menu {
  flex: 1;
  overflow-y: auto;
  border-right: none;
  padding: 4px 10px;
}
.shell__menu-icon { margin-right: 8px; color: var(--sanaa-accent-2); }

.shell__collapse-btn {
  border: none;
  background: var(--sanaa-bg-alt);
  color: var(--sanaa-text-muted);
  padding: 10px;
  cursor: pointer;
  margin: 8px;
  border-radius: var(--sanaa-radius-sm);
  &:hover { background: var(--sanaa-accent-1-soft); }
}

.shell__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.shell__topbar {
  height: var(--sanaa-topbar-height);
  flex-shrink: 0;
  background: var(--sanaa-surface);
  border-bottom: 1px solid var(--sanaa-border);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 100;

  @media (max-width: 768px) { padding: 0 12px; gap: 10px; }
}

.shell__burger, .shell__collapse-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--sanaa-text);
}

.shell__pays-select { min-width: 160px; max-width: 220px; }

.shell__spacer { flex: 1; }

.shell__user {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--sanaa-text);
  font-size: 0.9rem;
}

.shell__content {
  flex: 1;
  min-width: 0;
}
</style>
