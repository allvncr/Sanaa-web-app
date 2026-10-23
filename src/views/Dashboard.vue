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
            <span class="sanaa-kpi-label">Montant perçu consolidé</span>
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
            <span class="sanaa-kpi-label">CA (toutes les commandes)</span>
            <span class="sanaa-kpi-value">{{ kpisData.ca.montant | montant(deviseSymbole) }}</span>
            <span class="sanaa-kpi-sub">commandes passées sur la période, nettes de réduction</span>
            <span v-if="delta('ca')" class="sanaa-kpi-delta" :class="classeDelta('ca')">{{ delta('ca') }} {{ libelleComparaison }}</span>
          </div>
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">Montant perçu</span>
            <span class="sanaa-kpi-sub">avances + paiements à la livraison</span>
            <span class="sanaa-kpi-value">{{ kpisData.encaissements.montant | montant(deviseSymbole) }}</span>
            <span v-if="delta('encaissements')" class="sanaa-kpi-delta" :class="classeDelta('encaissements')">{{ delta('encaissements') }} {{ libelleComparaison }}</span>
          </div>
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">Reste à percevoir</span>
            <span class="sanaa-kpi-value">{{ kpisData.reste_a_recevoir.montant | montant(deviseSymbole) }}</span>
          </div>
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">Dépenses</span>
            <span class="sanaa-kpi-value">{{ kpisData.depenses.montant | montant(deviseSymbole) }}</span>
            <span v-if="Number(kpisData.surcouts_livraison) !== 0" class="sanaa-kpi-sub">dont {{ kpisData.surcouts_livraison | montant(deviseSymbole) }} de surcoût de livraison</span>
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
        <h2 class="sanaa-section-title">Rentabilité de la publicité</h2>
        <div class="sanaa-grid sanaa-grid--kpis">
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">Dépenses publicité</span>
            <span class="sanaa-kpi-value">{{ rentabilitePub.publicite | montant(symboleRentabilite) }}</span>
            <span v-if="deltaRentabilite('publicite')" class="sanaa-kpi-delta is-neutre">{{ deltaRentabilite('publicite') }} {{ libelleComparaison }}</span>
          </div>
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">Coût de pub par commande</span>
            <span class="sanaa-kpi-value">{{ rentabilitePub.cout_par_commande === null ? '—' : formaterMontant(rentabilitePub.cout_par_commande, symboleRentabilite) }}</span>
            <span class="sanaa-kpi-sub">{{ rentabilitePub.nombre_commandes }} commande{{ rentabilitePub.nombre_commandes > 1 ? 's' : '' }} sur la période</span>
            <span v-if="deltaRentabilite('cout_par_commande')" class="sanaa-kpi-delta" :class="classeRentabilite('cout_par_commande', true)">{{ deltaRentabilite('cout_par_commande') }} {{ libelleComparaison }}</span>
          </div>
          <div class="sanaa-kpi">
            <span class="sanaa-kpi-label">Retour sur pub</span>
            <span class="sanaa-kpi-value">{{ rentabilitePub.retour_sur_pub === null ? '—' : `×${String(rentabilitePub.retour_sur_pub).replace('.', ',')}` }}</span>
            <span class="sanaa-kpi-sub">CA généré pour 1 {{ symboleRentabilite || 'unité' }} de pub</span>
            <span v-if="deltaRentabilite('retour_sur_pub')" class="sanaa-kpi-delta" :class="classeRentabilite('retour_sur_pub')">{{ deltaRentabilite('retour_sur_pub') }} {{ libelleComparaison }}</span>
          </div>
        </div>

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
            <h3>Répartition des dépenses</h3>
            <apexchart
              v-if="repartitionDepenses.length"
              type="donut"
              height="280"
              :options="optionsRepartitionDepenses"
              :series="serieRepartitionDepenses"
            />
            <p v-else class="sanaa-empty">Aucune dépense sur la période.</p>
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
            <h3>Commandes par jour</h3>
            <apexchart
              v-if="evolutionCA.points && evolutionCA.points.length > 1"
              type="bar"
              height="260"
              :options="optionsCommandesParJour"
              :series="serieCommandesParJour"
            />
            <p v-else class="sanaa-empty">Pas assez de données sur la période.</p>
          </div>
        </div>

        <div class="sanaa-grid sanaa-grid--charts">
          <div class="sanaa-card" style="grid-column: 1 / -1">
            <h3>Suivi CA / Publicité / Confection</h3>
            <template v-if="analyseCaPubDepenses.points && analyseCaPubDepenses.points.length > 1">
              <div v-for="s in suiviAnalyse" :key="s.cle + s.series[0].data.length + s.options.xaxis.categories[0]" class="suivi">
                <div class="suivi__tete">
                  <span class="suivi__titre" :style="{ color: s.couleur }">{{ s.titre }}</span>
                  <strong>{{ s.total | montant(deviseSymbole) }}</strong>
                </div>
                <apexchart :type="s.type" height="150" :options="s.options" :series="s.series" />
              </div>
            </template>
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

// Couleurs fixes du graphique « Répartition des dépenses » (retour du 09/10/2026).
// Les types de dépense sont des catégories librement nommées : on les reconnaît
// à un mot-clé (sans accent ni casse) pour que « Pub Facebook » ou « Publicité
// facebook » aient la même couleur. Le plus spécifique d'abord (tiktok/facebook
// avant tout mot plus général). Un type inconnu reçoit une couleur stable
// tirée de son nom, jamais décalée selon les autres types présents.
const COULEURS_DEPENSE = [
  [/tiktok/, '#8E5BC4'], // violet
  [/facebook|meta\b/, '#3B7DD8'], // bleu
  [/surcout/, '#E8833A'], // orange
  [/confection/, '#4C8064'], // vert
  [/logistique/, '#E3B83C'], // jaune
  [/salaire/, '#D9C7A8'], // beige
  [/divers/, '#9B9B9B'], // gris
];
const COULEURS_DEPENSE_AUTRES = ['#2E9CA6', '#D66A8F', '#8a7256', '#2D4A7A', '#B4483B', '#7A9A3C'];

function couleurDepense(type) {
  const nom = String(type || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const trouvee = COULEURS_DEPENSE.find(([motif]) => motif.test(nom));
  if (trouvee) return trouvee[1];
  let hash = 0;
  for (let i = 0; i < nom.length; i += 1) hash = (hash * 31 + nom.charCodeAt(i)) % 997;
  return COULEURS_DEPENSE_AUTRES[hash % COULEURS_DEPENSE_AUTRES.length];
}

// Axe lisible des mini-graphiques de suivi : 1 200 000 -> « 1,2 M », 45 000 -> « 45 k ».
function formaterCompact(v) {
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1).replace('.', ',')} M`;
  if (abs >= 1e3) return `${Math.round(n / 1e3)} k`;
  return String(Math.round(n));
}

// Couleurs fixes du graphique « Répartition des livraisons » (retour du 08/10/2026).
const COULEURS_STATUT_LIVRAISON = {
  Livree: '#4C8064', // vert
  En_livraison: '#E3B83C', // jaune
  Recue_en_pays: '#D9C7A8', // beige
  A_expedier: '#9B9B9B', // gris
  Retour_echec: '#B4483B', // rouge
};

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
      rentabilitePub: { publicite: 0, ca: 0, nombre_commandes: 0, cout_par_commande: null, retour_sur_pub: null, comparaison: null, devise: null },
      analyseCaPubDepenses: videEvolution(),
      repartitionDepenses: [],
    };
  },
  computed: {
    ...mapState('paysContexte', { paysActifId: 'paysActifId' }),
    ...mapGetters('paysContexte', ['estVueGlobale', 'paysActif']),
    deviseSymbole() {
      return this.paysActif?.devise_locale_id?.symbole || '';
    },
    symboleRentabilite() {
      return this.estVueGlobale ? this.rentabilitePub.devise || '' : this.deviseSymbole;
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
        // Une couleur par statut, fixe : attribuées par position elles se
        // décalaient dès qu'un statut était absent pour le pays choisi.
        colors: this.repartitionLivraison.map((r) => COULEURS_STATUT_LIVRAISON[r.statut] || '#9B9B9B'),
        legend: { position: 'bottom' },
      };
    },
    serieRepartitionDepenses() {
      return this.repartitionDepenses.map((r) => r.montant);
    },
    optionsRepartitionDepenses() {
      return {
        labels: this.repartitionDepenses.map((r) => r.type),
        colors: this.repartitionDepenses.map((r) => couleurDepense(r.type)),
        legend: { position: 'bottom' },
        tooltip: { y: { formatter: (v) => formaterMontant(v, this.deviseSymbole) } },
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
    // Nombre de commandes reçues par période : même source et mêmes statuts que
    // le CA (évolution du CA), donc cohérent avec les cartes du haut. Le total
    // « Nouveaux clients » reste affiché dans les cartes.
    serieCommandesParJour() {
      return [{ name: 'Commandes', data: this.evolutionCA.points.map((p) => p.nombre_commandes) }];
    },
    optionsCommandesParJour() {
      return {
        chart: { toolbar: { show: false } },
        colors: ['#97643E'],
        xaxis: { categories: this.evolutionCA.points.map((p) => p.periode) },
        yaxis: { min: 0, forceNiceScale: true, labels: { formatter: (v) => String(Math.round(v)) } },
        dataLabels: { enabled: false },
        plotOptions: { bar: { borderRadius: 4 } },
        tooltip: { y: { formatter: (v) => `${v} commande${v > 1 ? 's' : ''}` } },
      };
    },
    // Trois mini-graphiques superposés (une échelle chacun) : les dépenses de
    // confection, groupées, écrasaient le CA et la publicité sur un axe commun.
    suiviAnalyse() {
      const points = this.analyseCaPubDepenses.points || [];
      const symbole = this.deviseSymbole;
      const defs = [
        { cle: 'ca', titre: "Chiffre d'affaires", couleur: '#CEA77B', type: 'area' },
        { cle: 'publicite', titre: 'Publicité', couleur: '#3B7DD8', type: 'bar' },
        { cle: 'confection', titre: 'Confection', couleur: '#4C8064', type: 'bar' },
      ];
      return defs.map((d, i) => {
        const valeurs = points.map((p) => p[d.cle]);
        return {
          ...d,
          total: valeurs.reduce((a, b) => a + Number(b || 0), 0),
          series: [{ name: d.titre, data: valeurs }],
          options: {
            chart: { toolbar: { show: false }, zoom: { enabled: false } },
            colors: [d.couleur],
            stroke: { curve: 'smooth', width: d.type === 'area' ? 2 : 0 },
            fill: { opacity: d.type === 'area' ? 0.25 : 1 },
            plotOptions: { bar: { borderRadius: 3, columnWidth: '60%' } },
            dataLabels: { enabled: false },
            legend: { show: false },
            grid: { padding: { left: 8, right: 8 } },
            xaxis: {
              categories: points.map((p) => p.periode),
              labels: { show: i === defs.length - 1, rotate: -45 },
              axisTicks: { show: i === defs.length - 1 },
              tooltip: { enabled: false },
            },
            yaxis: { min: 0, labels: { minWidth: 48, formatter: (v) => formaterCompact(v) } },
            tooltip: { y: { formatter: (v) => formaterMontant(v, symbole) } },
          },
        };
      });
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
    formaterMontant,
    // Variation par rapport à la période précédente ('' si pas de base de comparaison).
    deltaRentabilite(champ) {
      const { comparaison } = this.rentabilitePub;
      const actuel = this.rentabilitePub[champ];
      const precedent = comparaison ? comparaison[champ] : null;
      if (actuel === null || actuel === undefined || !precedent) return '';
      const variation = ((actuel - precedent) / precedent) * 100;
      return `${variation >= 0 ? '+' : ''}${variation.toFixed(1)} %`;
    },
    classeRentabilite(champ, inverser = false) {
      const { comparaison } = this.rentabilitePub;
      if (!comparaison) return '';
      const positif = (this.rentabilitePub[champ] || 0) >= (comparaison[champ] || 0);
      return (inverser ? !positif : positif) ? 'is-hausse' : 'is-baisse';
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
          const [comparaisonRes, perfRes, depensesRes, evolutionRes, repartitionRes, canalRes, clientsRes, analyseRes, rentabiliteRes] = await Promise.all([
            dashboardApi.comparaisonPays(communParams),
            dashboardApi.performanceProduits(communParams),
            dashboardApi.repartitionDepenses(communParams),
            dashboardApi.evolutionCA(communParams),
            dashboardApi.repartitionLivraison(params),
            dashboardApi.repartitionCanal(params),
            dashboardApi.nouveauxClients(params),
            dashboardApi.analyseCaPubDepenses(communParams),
            dashboardApi.rentabilitePub(communParams),
          ]);
          this.comparaison = comparaisonRes.data.data;
          this.performanceProduits = perfRes.data.data;
          this.repartitionDepenses = depensesRes.data.data;
          this.evolutionCA = evolutionRes.data.data;
          this.repartitionLivraison = repartitionRes.data.data;
          this.repartitionCanal = canalRes.data.data;
          this.nouveauxClients = clientsRes.data.data;
          this.analyseCaPubDepenses = analyseRes.data.data;
          this.rentabilitePub = rentabiliteRes.data.data;
        } else {
          const communParams = { pays_id: this.paysActifId, ...params };
          const [kpisRes, perfRes, depensesRes, evolutionRes, repartitionRes, canalRes, clientsRes, analyseRes, rentabiliteRes] = await Promise.all([
            dashboardApi.kpis(communParams),
            dashboardApi.performanceProduits(communParams),
            dashboardApi.repartitionDepenses(communParams),
            dashboardApi.evolutionCA(communParams),
            dashboardApi.repartitionLivraison(communParams),
            dashboardApi.repartitionCanal(communParams),
            dashboardApi.nouveauxClients(communParams),
            dashboardApi.analyseCaPubDepenses(communParams),
            dashboardApi.rentabilitePub(communParams),
          ]);
          this.kpisData = kpisRes.data.data;
          this.performanceProduits = perfRes.data.data;
          this.repartitionDepenses = depensesRes.data.data;
          this.evolutionCA = evolutionRes.data.data;
          this.repartitionLivraison = repartitionRes.data.data;
          this.repartitionCanal = canalRes.data.data;
          this.nouveauxClients = clientsRes.data.data;
          this.analyseCaPubDepenses = analyseRes.data.data;
          this.rentabilitePub = rentabiliteRes.data.data;
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
.suivi {
  & + & {
    margin-top: 4px;
  }
  &__tete {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    padding: 0 4px;
  }
  &__titre {
    font-weight: 600;
    font-size: 13px;
  }
}
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
