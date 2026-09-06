<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Encaissements du jour</h1>
      <el-date-picker v-model="date" type="date" size="small" value-format="yyyy-MM-dd" @change="charger" />
    </div>

    <div v-loading="chargement">
      <div class="sanaa-grid sanaa-grid--kpis">
        <div class="sanaa-kpi">
          <span class="sanaa-kpi-label">Total encaissé</span>
          <span class="sanaa-kpi-value">{{ resultat.total | montant }}</span>
        </div>
        <div class="sanaa-kpi" v-for="(montant, moyen) in resultat.par_moyen_paiement" :key="moyen">
          <span class="sanaa-kpi-label">{{ moyen }}</span>
          <span class="sanaa-kpi-value">{{ montant | montant }}</span>
        </div>
      </div>

      <div class="sanaa-card sanaa-table-scroll" style="margin-top:16px">
        <el-table :data="resultat.paiements || []" stripe @row-click="ouvrir">
          <el-table-column prop="commande_numero" label="Commande" min-width="140" />
          <el-table-column prop="moyen_paiement" label="Moyen" min-width="140" />
          <el-table-column prop="type" label="Type" min-width="90" />
          <el-table-column label="Montant" min-width="120">
            <template slot-scope="{ row }">{{ row.montant | montant }}</template>
          </el-table-column>
          <el-table-column label="Heure" min-width="100">
            <template slot-scope="{ row }">{{ new Date(row.date_paiement).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }}</template>
          </el-table-column>
        </el-table>
        <p v-if="!chargement && (resultat.paiements || []).length === 0" class="sanaa-empty">Aucun encaissement ce jour-là.</p>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import commandesApi from '@/services/commandes.api';

export default {
  name: 'EncaissementsJour',
  data() {
    return { chargement: false, date: new Date().toISOString().slice(0, 10), resultat: {} };
  },
  computed: { ...mapState('paysContexte', { paysActifId: 'paysActifId' }) },
  watch: { paysActifId() { this.charger(); } },
  mounted() { this.charger(); },
  methods: {
    async charger() {
      if (!this.paysActifId) return;
      this.chargement = true;
      try {
        const { data } = await commandesApi.encaissementsJour(this.paysActifId, this.date);
        this.resultat = data.data;
      } finally {
        this.chargement = false;
      }
    },
    ouvrir(row) {
      this.$router.push({ name: 'commande-detail', params: { id: row.commande_id } });
    },
  },
};
</script>

<style scoped>
.el-table >>> .el-table__row { cursor: pointer; }
</style>
