<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Commandes</h1>
      <el-button type="primary" icon="el-icon-plus" v-can="'commandes:creer'" @click="$router.push({ name: 'commande-nouvelle' })">
        Nouvelle commande
      </el-button>
    </div>

    <div class="sanaa-toolbar">
      <el-input
        v-model="filtres.q"
        class="recherche"
        size="small"
        clearable
        prefix-icon="el-icon-search"
        placeholder="Rechercher : n° de commande, client, téléphone, prénom gravé…"
        @input="chargerDiffere"
        @clear="charger"
      />
      <el-select v-model="filtres.creePar" placeholder="Saisi par" clearable filterable size="small" style="width: 190px" @change="charger">
        <el-option v-for="u in createurs" :key="u._id" :value="u._id" :label="`${u.nom} (${u.total})`" />
      </el-select>
      <el-select v-model="filtres.statut" placeholder="Statut" clearable size="small" style="width: 160px" @change="charger">
        <el-option v-for="(libelle, val) in statutsCommande" :key="val" :value="val" :label="libelle" />
      </el-select>
      <el-date-picker
        v-model="filtres.plage"
        type="daterange"
        size="small"
        range-separator="→"
        start-placeholder="Début"
        end-placeholder="Fin"
        value-format="yyyy-MM-dd"
        @change="charger"
      />
      <el-button size="small" icon="el-icon-refresh" @click="charger">Actualiser</el-button>
    </div>

    <div class="sanaa-card sanaa-table-scroll" v-loading="chargement">
      <el-table :data="commandes" stripe @row-click="ouvrir">
        <el-table-column prop="numero" label="Numéro" min-width="140" />
        <el-table-column label="Client" min-width="160">
          <template slot-scope="{ row }">{{ row.client_id ? row.client_id.nom : '—' }}</template>
        </el-table-column>
        <el-table-column label="Pays" min-width="90">
          <template slot-scope="{ row }">{{ row.pays_id ? row.pays_id.code : '—' }}</template>
        </el-table-column>
        <el-table-column label="Total" min-width="110">
          <template slot-scope="{ row }">{{ row.total | montant }}</template>
        </el-table-column>
        <el-table-column label="Statut commande" min-width="140">
          <template slot-scope="{ row }">
            <StatutBadge :statut="row.statut_commande" :libelles="statutsCommande" />
          </template>
        </el-table-column>
        <el-table-column label="Fabrication" min-width="130" class-name="hide-mobile">
          <template slot-scope="{ row }">
            <StatutBadge :statut="row.statut_fabrication" :libelles="statutsFabrication" />
          </template>
        </el-table-column>
        <el-table-column label="Livraison" min-width="130" class-name="hide-mobile">
          <template slot-scope="{ row }">
            <StatutBadge :statut="row.statut_livraison" :libelles="statutsLivraison" />
          </template>
        </el-table-column>
        <el-table-column label="Date" min-width="110" class-name="hide-mobile">
          <template slot-scope="{ row }">{{ row.createdAt | dateFr }}</template>
        </el-table-column>
        <el-table-column label="Saisie par" min-width="130" class-name="hide-mobile">
          <template slot-scope="{ row }">{{ row.cree_par && row.cree_par.nom ? row.cree_par.nom : '—' }}</template>
        </el-table-column>
      </el-table>
      <p v-if="!chargement && commandes.length === 0" class="sanaa-empty">Aucune commande trouvée.</p>
      <p v-else-if="!chargement" class="sanaa-text-muted resultat">{{ commandes.length }} commande{{ commandes.length > 1 ? 's' : '' }}</p>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import commandesApi from '@/services/commandes.api';
import StatutBadge from '@/components/common/StatutBadge.vue';

export default {
  name: 'CommandesListe',
  components: { StatutBadge },
  data() {
    return {
      chargement: false,
      commandes: [],
      filtres: { q: '', creePar: '', statut: '', plage: [] },
      createurs: [],
      minuterie: null,
      requete: 0,
      statutsCommande: this.$i18n.messages.fr.statuts.commande,
      statutsFabrication: this.$i18n.messages.fr.statuts.fabrication,
      statutsLivraison: this.$i18n.messages.fr.statuts.livraison,
    };
  },
  computed: {
    ...mapState('paysContexte', { paysActifId: 'paysActifId' }),
  },
  watch: {
    paysActifId() {
      this.filtres.creePar = '';
      this.chargerCreateurs();
      this.charger();
    },
  },
  mounted() {
    this.chargerCreateurs();
    this.charger();
  },
  beforeDestroy() {
    clearTimeout(this.minuterie);
  },
  methods: {
    async chargerCreateurs() {
      try {
        const { data } = await commandesApi.createurs({ pays_id: this.paysActifId || undefined });
        this.createurs = data.data;
      } catch (e) {
        this.createurs = [];
      }
    },
    // Recherche à la frappe : on attend une courte pause avant d'interroger le serveur.
    chargerDiffere() {
      clearTimeout(this.minuterie);
      this.minuterie = setTimeout(this.charger, 350);
    },
    async charger() {
      clearTimeout(this.minuterie);
      const numeroRequete = ++this.requete;
      this.chargement = true;
      const [date_de, date_a] = this.filtres.plage && this.filtres.plage.length ? this.filtres.plage : [undefined, undefined];
      try {
        const { data } = await commandesApi.lister({
          pays_id: this.paysActifId || undefined,
          q: this.filtres.q ? this.filtres.q.trim() : undefined,
          cree_par: this.filtres.creePar || undefined,
          statut: this.filtres.statut || undefined,
          date_de,
          date_a,
        });
        // Réponse périmée (une frappe plus récente a relancé la recherche) : ignorée.
        if (numeroRequete === this.requete) this.commandes = data.data;
      } finally {
        if (numeroRequete === this.requete) this.chargement = false;
      }
    },
    ouvrir(row) {
      this.$router.push({ name: 'commande-detail', params: { id: row._id } });
    },
  },
};
</script>

<style scoped>
.el-table >>> .el-table__row { cursor: pointer; }
.recherche { width: 340px; max-width: 100%; }
.resultat { margin: 10px 0 0; font-size: 0.85rem; color: var(--sanaa-text-muted); }
</style>
