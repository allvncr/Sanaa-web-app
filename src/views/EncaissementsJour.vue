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

    <div class="sanaa-toolbar">
      <el-input
        v-model="filtres.q"
        size="small"
        clearable
        prefix-icon="el-icon-search"
        placeholder="Rechercher : n° de commande ou client"
        style="width: 280px; max-width: 100%"
      />
      <el-select v-model="filtres.type" size="small" clearable placeholder="Tous les types" style="width: 170px">
        <el-option v-for="t in typesDisponibles" :key="t" :value="t" :label="libelleType(t)" />
      </el-select>
      <el-select v-model="filtres.moyen" size="small" clearable placeholder="Tous les moyens" style="width: 190px">
        <el-option v-for="m in moyensDisponibles" :key="m" :value="m" :label="m" />
      </el-select>
      <el-button v-if="filtreActif" size="small" type="text" @click="effacerFiltres">Effacer les filtres</el-button>
    </div>

    <div v-loading="chargement">
      <div class="sanaa-grid sanaa-grid--kpis">
        <div class="sanaa-kpi">
          <span class="sanaa-kpi-label">Total encaissé<template v-if="filtreActif"> (filtré)</template></span>
          <span class="sanaa-kpi-value">{{ totalFiltre | montant }}</span>
          <span class="sanaa-kpi-sub">{{ paiementsFiltres.length }} encaissement{{ paiementsFiltres.length > 1 ? 's' : '' }}<template v-if="filtreActif"> sur {{ (resultat.paiements || []).length }}</template></span>
        </div>
        <div class="sanaa-kpi" v-for="(montant, moyen) in parMoyenFiltre" :key="moyen">
          <span class="sanaa-kpi-label">{{ moyen }}</span>
          <span class="sanaa-kpi-value">{{ montant | montant }}</span>
        </div>
      </div>

      <div class="sanaa-card sanaa-table-scroll" style="margin-top:16px">
        <el-table :data="paiementsFiltres" stripe @row-click="ouvrir">
          <el-table-column prop="commande_numero" label="Commande" min-width="140" />
          <el-table-column label="Client" min-width="160">
            <template slot-scope="{ row }">{{ row.client_nom || '—' }}</template>
          </el-table-column>
          <el-table-column prop="moyen_paiement" label="Moyen" min-width="140" />
          <el-table-column label="Type" min-width="90">
            <template slot-scope="{ row }">
              <span class="sanaa-badge-statut" :class="row.type === 'avance' ? 'is-en-fabrication' : 'is-livree'">{{ libelleType(row.type) }}</span>
            </template>
          </el-table-column>
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
        <p v-if="!chargement && paiementsFiltres.length === 0" class="sanaa-empty">{{ (resultat.paiements || []).length && filtreActif ? 'Aucun encaissement ne correspond à ces filtres.' : 'Aucun encaissement sur cette période.' }}</p>
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
      filtres: { q: '', type: '', moyen: '' },
    };
  },
  computed: {
    ...mapState('paysContexte', { paysActifId: 'paysActifId' }),
    typePicker() {
      return { jour: 'date', semaine: 'week', mois: 'month', annee: 'year' }[this.periode];
    },
    typesDisponibles() {
      return [...new Set((this.resultat.paiements || []).map((p) => p.type).filter(Boolean))];
    },
    moyensDisponibles() {
      return [...new Set((this.resultat.paiements || []).map((p) => p.moyen_paiement).filter(Boolean))];
    },
    filtreActif() {
      return !!(this.filtres.q || this.filtres.type || this.filtres.moyen);
    },
    paiementsFiltres() {
      const q = this.filtres.q ? this.filtres.q.trim().toLowerCase() : '';
      return (this.resultat.paiements || []).filter((p) => {
        if (this.filtres.type && p.type !== this.filtres.type) return false;
        if (this.filtres.moyen && p.moyen_paiement !== this.filtres.moyen) return false;
        if (q && !`${p.commande_numero} ${p.client_nom || ''}`.toLowerCase().includes(q)) return false;
        return true;
      });
    },
    // Les totaux suivent les filtres : « combien d'avances en Wave aujourd'hui ? ».
    totalFiltre() {
      return this.paiementsFiltres.reduce((somme, p) => somme + Number(p.montant || 0), 0);
    },
    parMoyenFiltre() {
      const par = {};
      for (const p of this.paiementsFiltres) par[p.moyen_paiement] = (par[p.moyen_paiement] || 0) + Number(p.montant || 0);
      return par;
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
    libelleType(type) {
      return { avance: 'Avance', solde: 'Solde' }[type] || type;
    },
    effacerFiltres() {
      this.filtres = { q: '', type: '', moyen: '' };
    },
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
