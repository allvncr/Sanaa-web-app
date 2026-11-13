<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Exports</h1>
    </div>

    <div v-can="'exports:generer'" class="sanaa-grid sanaa-grid--generation">
      <div class="sanaa-card">
        <h3 style="margin-top:0">Export interne</h3>
        <p class="sanaa-text-muted">Un fichier par pays, pour le suivi commercial de l'équipe.</p>
        <div class="sanaa-toolbar">
          <el-select v-model="paysSelectionne" placeholder="Pays" size="small" style="width:180px">
            <el-option v-for="p in paysContexte.liste" :key="p._id" :value="p._id" :label="p.nom" />
          </el-select>
          <el-date-picker v-model="date" type="date" size="small" value-format="yyyy-MM-dd" placeholder="Date des commandes" />
        </div>
        <el-button type="primary" icon="el-icon-document" :loading="generationInterne" @click="genererInterne">
          Générer l'export interne
        </el-button>
      </div>

      <div class="sanaa-card">
        <h3 style="margin-top:0">Export usine</h3>
        <p class="sanaa-text-muted">Un fichier par pays, en chinois, pour la fabrication. Seules les commandes <strong>confirmées</strong> y figurent.</p>
        <div class="sanaa-toolbar">
          <el-select v-model="paysSelectionneUsine" placeholder="Pays" size="small" style="width:180px">
            <el-option v-for="p in paysContexte.liste" :key="p._id" :value="p._id" :label="p.nom" />
          </el-select>
          <el-date-picker v-model="dateUsine" type="date" size="small" value-format="yyyy-MM-dd" placeholder="Date des commandes" />
        </div>
        <el-alert
          v-if="apercuUsine && apercuUsine.nouvelles > 0"
          type="warning"
          :closable="false"
          show-icon
          class="apercu-alerte"
          :title="`${apercuUsine.nouvelles} commande${apercuUsine.nouvelles > 1 ? 's' : ''} du jour pas encore confirmée${apercuUsine.nouvelles > 1 ? 's' : ''} : absente${apercuUsine.nouvelles > 1 ? 's' : ''} de la fiche usine.`"
        >
          <el-button type="text" size="small" @click="voirNonConfirmees">Voir ces commandes</el-button>
        </el-alert>
        <p v-else-if="apercuUsine" class="sanaa-text-muted">
          {{ apercuUsine.confirmees }} commande{{ apercuUsine.confirmees > 1 ? 's' : '' }} confirmée{{ apercuUsine.confirmees > 1 ? 's' : '' }} partiront dans la fiche.
        </p>
        <el-button icon="el-icon-tickets" :loading="generationUsine" @click="genererUsine">
          Générer l'export usine
        </el-button>
      </div>
    </div>

    <div class="sanaa-toolbar" style="margin-top:20px">
      <el-select v-model="filtres.type" placeholder="Type" clearable size="small" style="width:140px" @change="charger">
        <el-option label="Interne" value="interne" />
        <el-option label="Usine" value="usine" />
      </el-select>
      <el-select v-model="filtres.pays_id" placeholder="Pays" clearable size="small" style="width:180px" @change="charger">
        <el-option v-for="p in paysContexte.liste" :key="p._id" :value="p._id" :label="p.nom" />
      </el-select>
    </div>

    <div class="sanaa-card sanaa-table-scroll" v-loading="chargement">
      <el-table :data="exports" stripe>
        <el-table-column prop="nom_fichier" label="Fichier" min-width="200" />
        <el-table-column label="Pays" min-width="100">
          <template slot-scope="{ row }">{{ row.pays_id ? row.pays_id.code : 'Tous' }}</template>
        </el-table-column>
        <el-table-column prop="type" label="Type" min-width="90" />
        <el-table-column prop="version" label="Version" min-width="80" />
        <el-table-column label="Date export" min-width="120">
          <template slot-scope="{ row }">{{ row.date_export | dateFr }}</template>
        </el-table-column>
        <el-table-column label="Généré le" min-width="150" class-name="hide-mobile">
          <template slot-scope="{ row }">{{ row.createdAt | dateHeureFr }}</template>
        </el-table-column>
        <el-table-column label="" min-width="140">
          <template slot-scope="{ row }">
            <el-button size="mini" icon="el-icon-download" @click="telecharger(row)">Télécharger</el-button>
          </template>
        </el-table-column>
      </el-table>
      <p v-if="!chargement && exports.length === 0" class="sanaa-empty">Aucun export généré.</p>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import exportsApi from '@/services/exports.api';

export default {
  name: 'Exports',
  data() {
    return {
      chargement: false,
      exports: [],
      filtres: { type: '', pays_id: '' },
      paysSelectionne: '',
      paysSelectionneUsine: '',
      date: new Date().toISOString().slice(0, 10),
      dateUsine: new Date().toISOString().slice(0, 10),
      generationInterne: false,
      generationUsine: false,
      apercuUsine: null,
    };
  },
  computed: {
    ...mapState({ paysContexte: (state) => state.paysContexte }),
  },
  mounted() {
    const paysParDefaut = this.paysContexte.paysActifId || (this.paysContexte.liste[0] && this.paysContexte.liste[0]._id) || '';
    this.paysSelectionne = paysParDefaut;
    this.paysSelectionneUsine = paysParDefaut;
    this.charger();
  },
  watch: {
    paysSelectionneUsine() { this.chargerApercuUsine(); },
    dateUsine() { this.chargerApercuUsine(); },
  },
  methods: {
    async charger() {
      this.chargement = true;
      try {
        const { data } = await exportsApi.lister({
          type: this.filtres.type || undefined,
          pays_id: this.filtres.pays_id || undefined,
        });
        this.exports = data.data;
      } finally {
        this.chargement = false;
      }
    },
    async genererInterne() {
      if (!this.paysSelectionne) return;
      this.generationInterne = true;
      try {
        await exportsApi.genererInterne(this.paysSelectionne, this.date);
        this.$store.dispatch('notifications/succes', 'Export interne généré.');
        this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de la génération');
      } finally {
        this.generationInterne = false;
      }
    },
    // Aperçu des commandes du jour (confirmées / à vérifier) pour le pays et la date choisis.
    async chargerApercuUsine() {
      this.apercuUsine = null;
      if (!this.paysSelectionneUsine) return;
      try {
        const { data } = await exportsApi.apercu(this.paysSelectionneUsine, this.dateUsine || undefined);
        this.apercuUsine = data.data;
      } catch (e) {
        this.apercuUsine = null;
      }
    },
    voirNonConfirmees() {
      const jour = this.dateUsine || new Date().toISOString().slice(0, 10);
      this.$router.push({ name: 'commandes', query: { statut: 'Nouvelle', date_de: jour, date_a: jour } });
    },
    async genererUsine() {
      if (!this.paysSelectionneUsine) return;
      await this.chargerApercuUsine();
      if (this.apercuUsine && this.apercuUsine.nouvelles > 0) {
        const n = this.apercuUsine.nouvelles;
        try {
          await this.$confirm(
            `${n} commande${n > 1 ? 's' : ''} de ce jour n'${n > 1 ? 'ont' : 'a'} pas encore été confirmée${n > 1 ? 's' : ''} et ne ${n > 1 ? 'seront' : 'sera'} pas dans la fiche usine. Générer quand même ?`,
            'Commandes à vérifier',
            { type: 'warning', confirmButtonText: 'Générer quand même', cancelButtonText: 'Retour' }
          );
        } catch (e) {
          return;
        }
      }
      this.generationUsine = true;
      try {
        await exportsApi.genererUsine(this.paysSelectionneUsine, this.dateUsine);
        this.$store.dispatch('notifications/succes', 'Export usine généré.');
        this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de la génération');
      } finally {
        this.generationUsine = false;
      }
    },
    async telecharger(row) {
      await exportsApi.telecharger(row._id, row.nom_fichier);
    },
  },
};
</script>

<style lang="scss" scoped>
.sanaa-grid--generation { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.sanaa-text-muted { color: var(--sanaa-text-muted); font-size: 0.85rem; }
.apercu-alerte { margin-bottom: 12px; }
</style>
