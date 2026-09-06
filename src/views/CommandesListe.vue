<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Commandes</h1>
      <el-button type="primary" icon="el-icon-plus" v-can="'commandes:creer'" @click="$router.push({ name: 'commande-nouvelle' })">
        Nouvelle commande
      </el-button>
    </div>

    <div class="sanaa-toolbar">
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
      </el-table>
      <p v-if="!chargement && commandes.length === 0" class="sanaa-empty">Aucune commande trouvée.</p>
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
      filtres: { statut: '', plage: [] },
      statutsCommande: this.$i18n.messages.fr.statuts.commande,
      statutsFabrication: this.$i18n.messages.fr.statuts.fabrication,
      statutsLivraison: this.$i18n.messages.fr.statuts.livraison,
    };
  },
  computed: {
    ...mapState('paysContexte', { paysActifId: 'paysActifId' }),
  },
  watch: {
    paysActifId() { this.charger(); },
  },
  mounted() {
    this.charger();
  },
  methods: {
    async charger() {
      this.chargement = true;
      const [date_de, date_a] = this.filtres.plage && this.filtres.plage.length ? this.filtres.plage : [undefined, undefined];
      try {
        const { data } = await commandesApi.lister({
          pays_id: this.paysActifId || undefined,
          statut: this.filtres.statut || undefined,
          date_de,
          date_a,
        });
        this.commandes = data.data;
      } finally {
        this.chargement = false;
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
</style>
