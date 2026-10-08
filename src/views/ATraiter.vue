<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <div>
        <h1>À traiter aujourd'hui</h1>
        <p class="sanaa-text-muted entete-date">{{ dateLongue }}</p>
      </div>
      <el-button size="small" icon="el-icon-refresh" :loading="chargement" @click="charger">Actualiser</el-button>
    </div>

    <div v-if="donnees" class="resume">
      <div class="resume__item" :class="{ 'is-ok': donnees.total === 0 }">
        <strong>{{ donnees.total }}</strong>
        <span>à traiter</span>
      </div>
      <div class="resume__item">
        <strong>{{ donnees.livraisons_aujourdhui }}</strong>
        <span>livraison{{ donnees.livraisons_aujourdhui > 1 ? 's' : '' }} prévue{{ donnees.livraisons_aujourdhui > 1 ? 's' : '' }} aujourd'hui</span>
      </div>
    </div>

    <p v-if="donnees && donnees.total === 0" class="sanaa-card tout-bon">
      <i class="el-icon-circle-check" /> Rien à traiter pour le moment, tout est à jour.
    </p>

    <div v-if="donnees" v-loading="chargement">
      <section
        v-for="s in donnees.sections"
        :key="s.cle"
        class="sanaa-card bloc"
        :class="{ 'bloc--vide': s.total === 0, 'bloc--haute': s.total > 0 && s.urgence === 'haute' }"
      >
        <header class="bloc__entete">
          <div>
            <h3>{{ s.titre }}</h3>
            <p class="sanaa-text-muted">{{ s.description }}</p>
          </div>
          <span v-if="s.total > 0" class="bloc__compteur" :class="{ 'is-haute': s.urgence === 'haute' }">{{ s.total }}</span>
          <i v-else class="el-icon-circle-check bloc__ok" />
        </header>

        <ul v-if="s.total > 0" class="lignes">
          <li v-for="i in s.items" :key="i._id" class="ligne" @click="ouvrir(i)">
            <div class="ligne__principal">
              <strong>{{ i.numero }}</strong>
              <span class="ligne__client">{{ i.client || 'Client sans nom' }}<template v-if="vueGlobale && i.pays"> · {{ i.pays }}</template></span>
              <span class="sanaa-text-muted ligne__detail">{{ i.detail }}</span>
            </div>
            <div class="ligne__droite">
              <strong v-if="i.montant !== null" class="ligne__montant">{{ i.montant | montant }}</strong>
              <a v-if="i.telephone" class="ligne__tel" :href="lienTel(i.telephone)" @click.stop><i class="el-icon-phone" /></a>
            </div>
          </li>
        </ul>
        <p v-if="s.total > s.items.length" class="sanaa-text-muted plus">+ {{ s.total - s.items.length }} autres — affichage limité aux {{ s.items.length }} plus anciens.</p>
      </section>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import commandesApi from '@/services/commandes.api';

export default {
  name: 'ATraiter',
  data() {
    return { donnees: null, chargement: false };
  },
  computed: {
    ...mapState('paysContexte', ['paysActifId']),
    vueGlobale() {
      return !this.paysActifId;
    },
    dateLongue() {
      const d = new Date();
      const t = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      return t.charAt(0).toUpperCase() + t.slice(1);
    },
  },
  watch: {
    paysActifId() {
      this.charger();
    },
  },
  mounted() {
    this.charger();
  },
  methods: {
    async charger() {
      this.chargement = true;
      try {
        const { data } = await commandesApi.aTraiter({ pays_id: this.paysActifId || undefined });
        this.donnees = data.data;
      } catch (e) {
        this.$store.dispatch('notifications/erreur', 'Impossible de charger les éléments à traiter.');
      } finally {
        this.chargement = false;
      }
    },
    ouvrir(item) {
      this.$router.push({ name: 'commande-detail', params: { id: item._id } });
    },
    lienTel(numero) {
      return `tel:${String(numero).split(/[/,;]/)[0].replace(/[^\d+]/g, '')}`;
    },
  },
};
</script>

<style lang="scss" scoped>
.entete-date { margin: 4px 0 0; }
.resume { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
.resume__item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 12px 18px;
  border-radius: var(--sanaa-radius-md);
  background: var(--sanaa-accent-2-dark);
  color: #fff;
  strong { font-size: 1.6rem; }
  span { font-size: 0.85rem; opacity: 0.9; }
  &.is-ok { background: var(--sanaa-success, #4caf50); }
  &:nth-child(2) { background: var(--sanaa-surface); color: var(--sanaa-text); border: 1px solid var(--sanaa-border); }
}
.tout-bon { color: var(--sanaa-success, #4caf50); font-weight: 600; margin-bottom: 16px; }

.bloc { margin-bottom: 14px; }
.bloc--haute { border-left: 4px solid var(--sanaa-danger, #c0392b); }
.bloc--vide { padding-top: 12px; padding-bottom: 12px; opacity: 0.75; p { display: none; } }
.bloc__entete {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  h3 { font-size: 1rem; }
  p { margin: 2px 0 0; font-size: 0.82rem; }
}
.bloc__compteur {
  flex-shrink: 0;
  min-width: 28px;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--sanaa-accent-2-dark);
  color: #fff;
  font-weight: 700;
  text-align: center;
  &.is-haute { background: var(--sanaa-danger, #c0392b); }
}
.bloc__ok { color: var(--sanaa-success, #4caf50); font-size: 1.3rem; }

.lignes { list-style: none; margin: 12px 0 0; padding: 0; }
.ligne {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 6px;
  border-top: 1px solid var(--sanaa-border);
  cursor: pointer;
  &:hover { background: var(--sanaa-bg-alt); }
}
.ligne__principal { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ligne__client { font-size: 0.9rem; }
.ligne__detail { font-size: 0.8rem; }
.ligne__droite { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.ligne__montant { color: var(--sanaa-danger, #c0392b); white-space: nowrap; }
.ligne__tel {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sanaa-success, #4caf50);
  color: #fff;
}
.plus { margin: 8px 0 0; font-size: 0.8rem; }
</style>
