<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Encaissements</h1>
    </div>

    <div class="sanaa-toolbar">
      <el-radio-group v-model="periode" size="small" @change="onChangePeriode">
        <el-radio-button label="jour">Jour</el-radio-button>
        <el-radio-button label="semaine">Semaine</el-radio-button>
        <el-radio-button label="mois">Mois</el-radio-button>
        <el-radio-button label="annee">Année</el-radio-button>
      </el-radio-group>

      <el-button size="small" icon="el-icon-arrow-left" circle title="Période précédente" @click="changerDate(-1)" />
      <el-date-picker
        v-model="dateRef"
        :type="typePicker"
        size="small"
        :clearable="false"
        style="width:170px"
        @change="charger"
      />
      <el-button size="small" icon="el-icon-arrow-right" circle title="Période suivante" @click="changerDate(1)" />
      <el-button size="small" @click="allerAujourdhui">Aujourd'hui</el-button>

      <span v-if="resultat.date_de" class="sanaa-text-muted plage-label">{{ libellePlage }}</span>
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
          <el-table-column label="Date" min-width="110" v-if="periode !== 'jour'">
            <template slot-scope="{ row }">{{ row.date_paiement | dateFr }}</template>
          </el-table-column>
          <el-table-column label="Heure" min-width="100">
            <template slot-scope="{ row }">{{ new Date(row.date_paiement).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }}</template>
          </el-table-column>
        </el-table>
        <p v-if="!chargement && (resultat.paiements || []).length === 0" class="sanaa-empty">Aucun encaissement sur cette période.</p>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import commandesApi from '@/services/commandes.api';
import { formaterDate } from '@/utils/format';

const toISODate = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

export default {
  name: 'EncaissementsJour',
  data() {
    return {
      chargement: false,
      periode: 'jour', // jour | semaine | mois | annee
      dateRef: new Date(),
      resultat: {},
    };
  },
  computed: {
    ...mapState('paysContexte', { paysActifId: 'paysActifId' }),
    typePicker() {
      return { jour: 'date', semaine: 'week', mois: 'month', annee: 'year' }[this.periode];
    },
    libellePlage() {
      if (!this.resultat.date_de) return '';
      const de = formaterDate(this.resultat.date_de);
      const a = formaterDate(this.resultat.date_a);
      return de === a ? de : `Du ${de} au ${a}`;
    },
  },
  watch: { paysActifId() { this.charger(); } },
  mounted() { this.charger(); },
  methods: {
    onChangePeriode() {
      this.charger();
    },
    changerDate(delta) {
      const d = new Date(this.dateRef);
      if (this.periode === 'jour') d.setDate(d.getDate() + delta);
      else if (this.periode === 'semaine') d.setDate(d.getDate() + delta * 7);
      else if (this.periode === 'mois') d.setMonth(d.getMonth() + delta);
      else d.setFullYear(d.getFullYear() + delta);
      this.dateRef = d;
      this.charger();
    },
    allerAujourdhui() {
      this.dateRef = new Date();
      this.charger();
    },
    async charger() {
      if (!this.paysActifId) return;
      this.chargement = true;
      try {
        const { data } = await commandesApi.encaissementsJour(this.paysActifId, toISODate(this.dateRef), this.periode);
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
.plage-label { margin-left: 6px; }
</style>
