<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Dashboard</h1>
      <div class="periode-selecteur">
        <el-radio-group v-model="periode" size="small" @input="onChangePeriode">
          <el-radio-button label="jour">Jour</el-radio-button>
          <el-radio-button label="semaine">Semaine</el-radio-button>
          <el-radio-button label="mois">Mois</el-radio-button>
          <el-radio-button label="annee">Année</el-radio-button>
          <el-radio-button label="personnalise">Personnalisé</el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-if="periode === 'jour'"
          v-model="dateJour"
          type="date"
          size="small"
          value-format="yyyy-MM-dd"
          @change="charger"
        />
        <el-date-picker
          v-if="periode === 'personnalise'"
          v-model="plagePersonnalisee"
          type="daterange"
          size="small"
          range-separator="→"
          value-format="yyyy-MM-dd"
          @change="charger"
        />
        <el-select v-if="estVueGlobale" v-model="deviseAffichage" size="small" style="width:110px" @change="charger">
          <el-option v-for="d in devises" :key="d._id" :value="d.code" :label="d.code" />
        </el-select>
      </div>
    </div>

    <div v-loading="chargement">
      <template v-if="estVueGlobale">
        <div class="sanaa-grid sanaa-grid--kpis">
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">CA consolidé ({{ comparaison.devise_affichage }})</span>
            <span class="sanaa-kpi-value">{{ comparaison.global && comparaison.global.ca_converti | montant }}</span>
          </div>
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">Encaissements consolidés</span>
            <span class="sanaa-kpi-value">{{ comparaison.global && comparaison.global.encaissements_convertis | montant }}</span>
          </div>
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">Dépenses consolidées</span>
            <span class="sanaa-kpi-value">{{ comparaison.global && comparaison.global.depenses_converties | montant }}</span>
          </div>
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">Bénéfice consolidé</span>
            <span class="sanaa-kpi-value">{{ comparaison.global && comparaison.global.benefice_converti | montant }}</span>
          </div>
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">Nouveaux clients</span>
            <span class="sanaa-kpi-value">{{ nouveauxClients.total || 0 }}</span>
            <span v-if="deltaClients" class="sanaa-kpi-delta" :class="classeDeltaClients">{{ deltaClients }} {{ libelleComparaison }}</span>
          </div>
        </div>

        <h2 class="sanaa-section-title">Comparaison des pays</h2>
        <div class="sanaa-grid sanaa-grid--charts">
          <div class="sanaa-card sanaa-table-scroll" style="grid-column: span 2">
            <el-table :data="comparaison.pays || []" stripe>
              <el-table-column prop="pays.nom" label="Pays" min-width="140" />
              <el-table-column label="CA converti" min-width="130">
                <template slot-scope="{ row }">{{ row.ca_converti | montant(comparaison.devise_affichage) }}</template>
              </el-table-column>
              <el-table-column label="Part du CA" min-width="100">
                <template slot-scope="{ row }">{{ row.ca_pct }} %</template>
              </el-table-column>
              <el-table-column label="Dépenses" min-width="130">
                <template slot-scope="{ row }">{{ row.depenses_converties | montant(comparaison.devise_affichage) }}</template>
              </el-table-column>
              <el-table-column label="Bénéfice" min-width="130">
                <template slot-scope="{ row }">{{ row.benefice_converti | montant(comparaison.devise_affichage) }}</template>
              </el-table-column>
              <el-table-column prop="nombre_commandes" label="Commandes" min-width="110" />
              <el-table-column label="Taux livraison" min-width="120">
                <template slot-scope="{ row }">{{ row.taux_livraison_pct }} %</template>
              </el-table-column>
              <el-table-column label="Taux retour" min-width="110">
                <template slot-scope="{ row }">{{ row.taux_retour_pct }} %</template>
              </el-table-column>
            </el-table>
          </div>
          <div class="sanaa-card">
            <h3>Part de CA par pays</h3>
            <apexchart
              v-if="partCaParPays.length"
              type="pie"
              height="260"
              :options="optionsPartCaParPays"
              :series="seriePartCaParPays"
            />
            <p v-else class="sanaa-empty">Aucune vente sur la période.</p>
          </div>
        </div>
      </template>

      <template v-else-if="kpisData">
        <div class="sanaa-grid sanaa-grid--kpis">
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">CA généré</span>
            <span class="sanaa-kpi-value">{{ kpisData.ca.montant | montant(deviseSymbole) }}</span>
            <span v-if="delta('ca')" class="sanaa-kpi-delta" :class="classeDelta('ca')">{{ delta('ca') }} {{ libelleComparaison }}</span>
          </div>
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">Encaissements</span>
            <span class="sanaa-kpi-value">{{ kpisData.encaissements.montant | montant(deviseSymbole) }}</span>
            <span v-if="delta('encaissements')" class="sanaa-kpi-delta" :class="classeDelta('encaissements')">{{ delta('encaissements') }} {{ libelleComparaison }}</span>
          </div>
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">Reste à recevoir</span>
            <span class="sanaa-kpi-value">{{ kpisData.reste_a_recevoir.montant | montant(deviseSymbole) }}</span>
          </div>
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">Dépenses</span>
            <span class="sanaa-kpi-value">{{ kpisData.depenses.montant | montant(deviseSymbole) }}</span>
            <span v-if="delta('depenses')" class="sanaa-kpi-delta" :class="classeDelta('depenses', true)">{{ delta('depenses') }} {{ libelleComparaison }}</span>
          </div>
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">Bénéfice</span>
            <span class="sanaa-kpi-value">{{ kpisData.benefice.montant | montant(deviseSymbole) }}</span>
            <span class="sanaa-kpi-sub">Marge {{ kpisData.marge_pct }} %</span>
          </div>
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">Panier moyen</span>
            <span class="sanaa-kpi-value">{{ panierMoyen | montant(deviseSymbole) }}</span>
            <span class="sanaa-kpi-sub">{{ kpisData.nombre_commandes }} commande{{ kpisData.nombre_commandes > 1 ? 's' : '' }}</span>
          </div>
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">Taux de livraison</span>
            <span class="sanaa-kpi-value">{{ kpisData.taux_livraison_pct }} %</span>
            <span class="sanaa-kpi-sub">Annulation {{ kpisData.taux_annulation_pct }} % — Retour {{ kpisData.taux_retour_pct }} %</span>
          </div>
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">Nouveaux clients</span>
            <span class="sanaa-kpi-value">{{ nouveauxClients.total || 0 }}</span>
            <span v-if="deltaClients" class="sanaa-kpi-delta" :class="classeDeltaClients">{{ deltaClients }} {{ libelleComparaison }}</span>
          </div>
        </div>
      </template>

      <template v-if="estVueGlobale || kpisData">
        <div class="sanaa-grid sanaa-grid--charts">
          <div class="sanaa-card">
            <h3>Évolution du CA</h3>
            <apexchart
              v-if="evolutionCA.points && evolutionCA.points.length > 1"
              type="line"
              height="260"
              :options="optionsEvolutionCA"
              :series="serieEvolutionCA"
            />
            <p v-else class="sanaa-empty">Pas assez de données sur la période.</p>
          </div>
          <div class="sanaa-card">
            <h3>Répartition des livraisons</h3>
            <apexchart
              v-if="repartitionLivraison.length"
              type="donut"
              height="260"
              :options="optionsRepartitionLivraison"
              :series="serieRepartitionLivraison"
            />
            <p v-else class="sanaa-empty">Aucune commande sur la période.</p>
          </div>
        </div>

        <div class="sanaa-grid sanaa-grid--charts">
          <div class="sanaa-card">
            <h3>Meilleurs produits (CA)</h3>
            <apexchart
              v-if="performanceProduits.length"
              type="bar"
              height="280"
              :options="optionsGraphProduits"
              :series="serieProduits"
            />
            <p v-else class="sanaa-empty">Aucune vente sur la période.</p>
          </div>
          <div class="sanaa-card">
            <h3>Alertes actives</h3>
            <ul class="sanaa-alertes" v-if="alertes.length">
              <li v-for="a in alertes" :key="a._id">
                <i class="el-icon-warning" /> {{ a.message || a.type }}
              </li>
            </ul>
            <p v-else class="sanaa-empty">Aucune alerte active.</p>
          </div>
        </div>

        <div class="sanaa-grid sanaa-grid--charts">
          <div class="sanaa-card">
            <h3>Canal d'acquisition</h3>
            <apexchart
              v-if="repartitionCanal.length"
              type="donut"
              height="260"
              :options="optionsRepartitionCanal"
              :series="serieRepartitionCanal"
            />
            <p v-else class="sanaa-empty">Aucune commande sur la période.</p>
          </div>
          <div class="sanaa-card">
            <h3>Nouveaux clients</h3>
            <apexchart
              v-if="nouveauxClients.points && nouveauxClients.points.length > 1"
              type="bar"
              height="260"
              :options="optionsNouveauxClients"
              :series="serieNouveauxClients"
            />
            <p v-else class="sanaa-empty">Pas assez de données sur la période.</p>
          </div>
        </div>

        <div class="sanaa-grid sanaa-grid--charts">
          <div class="sanaa-card" style="grid-column: 1 / -1">
            <h3>Analyse CA / Publicité / Dépenses</h3>
            <apexchart
              v-if="analyseCaPubDepenses.points && analyseCaPubDepenses.points.length > 1"
              type="line"
              height="280"
              :options="optionsAnalyse"
              :series="serieAnalyse"
            />
            <p v-else class="sanaa-empty">Pas assez de données sur la période.</p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import dashboardApi from '@/services/dashboard.api';
import referentielsApi from '@/services/referentiels.api';
import { formaterMontant } from '@/utils/format';

const LIBELLES_COMPARAISON = {
  jour: 'vs veille',
  semaine: 'vs semaine précédente',
  mois: 'vs mois précédent',
  annee: 'vs année précédente',
};

function videEvolution() {
  return { points: [] };
}

export default {
  name: 'Dashboard',
  data() {
    return {
      chargement: false,
      periode: 'mois',
      dateJour: new Date().toISOString().slice(0, 10),
      plagePersonnalisee: [],
      deviseAffichage: 'XOF',
      devises: [],
      kpisData: null,
      comparaison: {},
      performanceProduits: [],
      evolutionCA: videEvolution(),
      repartitionLivraison: [],
      repartitionCanal: [],
      nouveauxClients: { total: 0, comparaison: null, points: [] },
      analyseCaPubDepenses: videEvolution(),
      alertes: [],
    };
  },
  computed: {
    ...mapState('paysContexte', { paysActifId: 'paysActifId' }),
    ...mapGetters('paysContexte', ['estVueGlobale', 'paysActif']),
    deviseSymbole() {
      return this.paysActif?.devise_locale_id?.symbole || '';
    },
    libelleComparaison() {
      return LIBELLES_COMPARAISON[this.periode] || '';
    },
    panierMoyen() {
      if (!this.kpisData || !this.kpisData.nombre_commandes) return 0;
      return Number(this.kpisData.ca.montant) / this.kpisData.nombre_commandes;
    },
    deltaClients() {
      const { total, comparaison } = this.nouveauxClients;
      if (comparaison === null || comparaison === undefined || !comparaison) return '';
      const variation = ((total - comparaison) / comparaison) * 100;
      const signe = variation >= 0 ? '+' : '';
      return `${signe}${variation.toFixed(1)} %`;
    },
    classeDeltaClients() {
      const { total, comparaison } = this.nouveauxClients;
      if (comparaison === null || comparaison === undefined) return '';
      return total >= comparaison ? 'is-hausse' : 'is-baisse';
    },
    serieProduits() {
      return [{ name: 'Chiffre d’affaires', data: this.performanceProduits.map((p) => p.chiffre_affaires) }];
    },
    optionsGraphProduits() {
      return {
        chart: { toolbar: { show: false } },
        colors: ['#B8885E'],
        xaxis: { categories: this.performanceProduits.map((p) => p.nom || 'Produit') },
        plotOptions: { bar: { borderRadius: 4, horizontal: true } },
      };
    },
    serieEvolutionCA() {
      return [{ name: 'CA', data: this.evolutionCA.points.map((p) => p.ca) }];
    },
    optionsEvolutionCA() {
      return {
        chart: { toolbar: { show: false } },
        colors: ['#CEA77B'],
        stroke: { curve: 'smooth', width: 3 },
        xaxis: { categories: this.evolutionCA.points.map((p) => p.periode) },
        dataLabels: { enabled: false },
      };
    },
    serieRepartitionLivraison() {
      return this.repartitionLivraison.map((r) => r.nombre);
    },
    optionsRepartitionLivraison() {
      const libelles = this.$i18n.messages.fr.statuts.livraison;
      return {
        labels: this.repartitionLivraison.map((r) => libelles[r.statut] || r.statut),
        colors: ['#8a7256', '#CEA77B', '#B8885E', '#4C8064', '#B4483B'],
        legend: { position: 'bottom' },
      };
    },
    serieRepartitionCanal() {
      return this.repartitionCanal.map((r) => r.nombre);
    },
    optionsRepartitionCanal() {
      return {
        labels: this.repartitionCanal.map((r) => r.canal),
        colors: ['#CEA77B', '#4C8064'],
        legend: { position: 'bottom' },
      };
    },
    serieNouveauxClients() {
      return [{ name: 'Nouveaux clients', data: this.nouveauxClients.points.map((p) => p.nombre) }];
    },
    optionsNouveauxClients() {
      return {
        chart: { toolbar: { show: false } },
        colors: ['#4C8064'],
        xaxis: { categories: this.nouveauxClients.points.map((p) => p.periode) },
        dataLabels: { enabled: false },
        plotOptions: { bar: { borderRadius: 4 } },
      };
    },
    serieAnalyse() {
      return [
        { name: 'CA', data: this.analyseCaPubDepenses.points.map((p) => p.ca) },
        { name: 'Publicité', data: this.analyseCaPubDepenses.points.map((p) => p.publicite) },
        { name: 'Dépenses totales', data: this.analyseCaPubDepenses.points.map((p) => p.depenses) },
      ];
    },
    optionsAnalyse() {
      return {
        chart: { toolbar: { show: false } },
        colors: ['#CEA77B', '#B4483B', '#8a7256'],
        stroke: { curve: 'smooth', width: 2 },
        xaxis: { categories: this.analyseCaPubDepenses.points.map((p) => p.periode) },
        dataLabels: { enabled: false },
        legend: { position: 'bottom' },
      };
    },
    partCaParPays() {
      return (this.comparaison.pays || []).filter((p) => Number(p.ca_converti) > 0);
    },
    seriePartCaParPays() {
      return this.partCaParPays.map((p) => Number(p.ca_converti));
    },
    optionsPartCaParPays() {
      return {
        labels: this.partCaParPays.map((p) => p.pays.nom),
        colors: ['#CEA77B', '#B8885E', '#4C8064', '#8a7256', '#B4483B'],
        legend: { position: 'bottom' },
      };
    },
  },
  watch: {
    paysActifId() { this.charger(); },
  },
  async mounted() {
    const { data } = await referentielsApi.listerDevises();
    this.devises = data.data;
    this.charger();
  },
  methods: {
    onChangePeriode() {
      this.charger();
    },
    paramsPeriode() {
      const params = { periode: this.periode };
      if (this.periode === 'jour') params.date = this.dateJour;
      if (this.periode === 'personnalise' && this.plagePersonnalisee?.length === 2) {
        [params.periode_debut, params.periode_fin] = this.plagePersonnalisee;
      }
      return params;
    },
    delta(champ) {
      if (!this.kpisData?.comparaison) return '';
      const actuel = Number(this.kpisData[champ].montant);
      const precedent = Number(this.kpisData.comparaison[champ].montant);
      if (precedent === 0) return '';
      const variation = ((actuel - precedent) / precedent) * 100;
      const signe = variation >= 0 ? '+' : '';
      return `${signe}${variation.toFixed(1)} %`;
    },
    classeDelta(champ, inverser = false) {
      if (!this.kpisData?.comparaison) return '';
      const actuel = Number(this.kpisData[champ].montant);
      const precedent = Number(this.kpisData.comparaison[champ].montant);
      const positif = actuel >= precedent;
      return (inverser ? !positif : positif) ? 'is-hausse' : 'is-baisse';
    },
    async charger() {
      this.chargement = true;
      const params = this.paramsPeriode();
      try {
        if (this.estVueGlobale) {
          const communParams = { devise_affichage: this.deviseAffichage, ...params };
          const [comparaisonRes, perfRes, alertesRes, evolutionRes, repartitionRes, canalRes, clientsRes, analyseRes] = await Promise.all([
            dashboardApi.comparaisonPays(communParams),
            dashboardApi.performanceProduits(communParams),
            dashboardApi.alertes({ statut: 'nouvelle' }),
            dashboardApi.evolutionCA(communParams),
            dashboardApi.repartitionLivraison(params),
            dashboardApi.repartitionCanal(params),
            dashboardApi.nouveauxClients(params),
            dashboardApi.analyseCaPubDepenses(communParams),
          ]);
          this.comparaison = comparaisonRes.data.data;
          this.performanceProduits = perfRes.data.data;
          this.alertes = alertesRes.data.data;
          this.evolutionCA = evolutionRes.data.data;
          this.repartitionLivraison = repartitionRes.data.data;
          this.repartitionCanal = canalRes.data.data;
          this.nouveauxClients = clientsRes.data.data;
          this.analyseCaPubDepenses = analyseRes.data.data;
        } else {
          const communParams = { pays_id: this.paysActifId, ...params };
          const [kpisRes, perfRes, alertesRes, evolutionRes, repartitionRes, canalRes, clientsRes, analyseRes] = await Promise.all([
            dashboardApi.kpis(communParams),
            dashboardApi.performanceProduits(communParams),
            dashboardApi.alertes({ pays_id: this.paysActifId, statut: 'nouvelle' }),
            dashboardApi.evolutionCA(communParams),
            dashboardApi.repartitionLivraison(communParams),
            dashboardApi.repartitionCanal(communParams),
            dashboardApi.nouveauxClients(communParams),
            dashboardApi.analyseCaPubDepenses(communParams),
          ]);
          this.kpisData = kpisRes.data.data;
          this.performanceProduits = perfRes.data.data;
          this.alertes = alertesRes.data.data;
          this.evolutionCA = evolutionRes.data.data;
          this.repartitionLivraison = repartitionRes.data.data;
          this.repartitionCanal = canalRes.data.data;
          this.nouveauxClients = clientsRes.data.data;
          this.analyseCaPubDepenses = analyseRes.data.data;
        }
      } catch (err) {
        this.$store.dispatch('notifications/erreur', 'Impossible de charger le dashboard.');
      } finally {
        this.chargement = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.periode-selecteur {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.sanaa-section-title {
  font-size: 1.1rem;
  margin: 28px 0 12px;
}
.sanaa-grid--charts {
  grid-template-columns: 1fr 1fr;
  margin-top: 20px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
}
.sanaa-alertes {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  li { color: var(--sanaa-warning); font-size: 0.9rem; }
}
.sanaa-kpi-delta {
  font-size: 0.75rem;
  font-weight: 600;
  &.is-hausse { color: var(--sanaa-success); }
  &.is-baisse { color: var(--sanaa-danger); }
}
</style>
