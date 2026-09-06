<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Exports</h1>
    </div>

    <div class="sanaa-grid sanaa-grid--generation">
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

      <div class="sanaa-card" v-if="estPorteeGlobale">
        <h3 style="margin-top:0">Export usine</h3>
        <p class="sanaa-text-muted">
          Un seul fichier combinant <strong>tous les pays</strong> du jour, en chinois — l'usine fabrique pour
          tout le monde à la fois.
        </p>
        <div class="sanaa-toolbar">
          <el-date-picker v-model="dateUsine" type="date" size="small" value-format="yyyy-MM-dd" placeholder="Date des commandes" />
        </div>
        <el-button icon="el-icon-tickets" :loading="generationUsine" @click="genererUsine">
          Générer l'export usine (tous pays)
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
import { mapState, mapGetters } from 'vuex';
import exportsApi from '@/services/exports.api';

export default {
  name: 'Exports',
  data() {
    return {
      chargement: false,
      exports: [],
      filtres: { type: '', pays_id: '' },
      paysSelectionne: '',
      date: new Date().toISOString().slice(0, 10),
      dateUsine: new Date().toISOString().slice(0, 10),
      generationInterne: false,
      generationUsine: false,
    };
  },
  computed: {
    ...mapState({ paysContexte: (state) => state.paysContexte }),
    ...mapGetters('auth', { estPorteeGlobale: 'porteeGlobale' }),
  },
  mounted() {
    this.paysSelectionne = this.paysContexte.paysActifId || (this.paysContexte.liste[0] && this.paysContexte.liste[0]._id) || '';
    this.charger();
  },
  methods: {
    async charger() {
      this.chargement = true;
      try {
        const { data } = await exportsApi.lister(this.filtres);
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
    async genererUsine() {
      this.generationUsine = true;
      try {
        await exportsApi.genererUsine(this.dateUsine);
        this.$store.dispatch('notifications/succes', 'Export usine généré (tous pays).');
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
</style>
