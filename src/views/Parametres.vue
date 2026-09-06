<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Paramètres</h1>
    </div>

    <el-tabs v-model="onglet">
      <el-tab-pane label="Taux de change" name="taux" v-if="$can('parametres:gerer_taux_change')">
        <div class="sanaa-toolbar">
          <el-button size="small" icon="el-icon-plus" @click="dialogueTaux = true">Ajouter un taux</el-button>
        </div>
        <div class="sanaa-card sanaa-table-scroll">
          <el-table :data="taux" stripe>
            <el-table-column label="De" min-width="90">
              <template slot-scope="{ row }">{{ row.devise_source_id ? row.devise_source_id.code : '' }}</template>
            </el-table-column>
            <el-table-column label="Vers" min-width="90">
              <template slot-scope="{ row }">{{ row.devise_cible_id ? row.devise_cible_id.code : '' }}</template>
            </el-table-column>
            <el-table-column prop="taux" label="Taux" min-width="120">
              <template slot-scope="{ row }">{{ row.taux.$numberDecimal || row.taux }}</template>
            </el-table-column>
            <el-table-column label="Date d'effet" min-width="120">
              <template slot-scope="{ row }">{{ row.date_effet | dateFr }}</template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="Catégories de dépenses" name="depenses" v-if="$can('depenses:voir')">
        <div class="sanaa-toolbar">
          <el-input v-model="nouvelleCategorie" placeholder="Nouvelle catégorie" size="small" style="width:220px" />
          <el-button size="small" icon="el-icon-plus" @click="ajouterCategorie">Ajouter</el-button>
        </div>
        <div class="sanaa-card">
          <el-tag v-for="c in categoriesDepenses" :key="c._id" style="margin:4px">{{ c.nom }}</el-tag>
        </div>
      </el-tab-pane>

      <el-tab-pane label="Devises" name="devises">
        <div class="sanaa-card sanaa-table-scroll">
          <el-table :data="devises" stripe>
            <el-table-column prop="code" label="Code" min-width="90" />
            <el-table-column prop="nom" label="Nom" min-width="180" />
            <el-table-column prop="symbole" label="Symbole" min-width="90" />
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog title="Ajouter un taux de change" :visible.sync="dialogueTaux" width="420px">
      <el-form :model="nouveauTaux" label-position="top">
        <el-form-item label="Devise source" required>
          <el-select v-model="nouveauTaux.devise_source_id" style="width:100%">
            <el-option v-for="d in devises" :key="d._id" :value="d._id" :label="d.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="Devise cible" required>
          <el-select v-model="nouveauTaux.devise_cible_id" style="width:100%">
            <el-option v-for="d in devises" :key="d._id" :value="d._id" :label="d.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="Taux" required><el-input-number v-model="nouveauTaux.taux" :precision="4" :min="0" style="width:100%" /></el-form-item>
        <el-form-item label="Date d'effet">
          <el-date-picker v-model="nouveauTaux.date_effet" type="date" value-format="yyyy-MM-dd" style="width:100%" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogueTaux = false">Annuler</el-button>
        <el-button type="primary" @click="ajouterTaux">Enregistrer</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import referentielsApi from '@/services/referentiels.api';
import depensesApi from '@/services/depenses.api';

export default {
  name: 'Parametres',
  data() {
    return {
      onglet: 'devises',
      taux: [],
      devises: [],
      categoriesDepenses: [],
      nouvelleCategorie: '',
      dialogueTaux: false,
      nouveauTaux: { devise_source_id: '', devise_cible_id: '', taux: 1, date_effet: new Date().toISOString().slice(0, 10) },
    };
  },
  async mounted() {
    const [taux, devises, categories] = await Promise.all([
      referentielsApi.listerTaux(),
      referentielsApi.listerDevises(),
      depensesApi.listerCategories(),
    ]);
    this.taux = taux.data.data;
    this.devises = devises.data.data;
    this.categoriesDepenses = categories.data.data;
    if (this.$can('parametres:gerer_taux_change')) this.onglet = 'taux';
  },
  methods: {
    async ajouterTaux() {
      try {
        await referentielsApi.ajouterTaux(this.nouveauTaux);
        this.$store.dispatch('notifications/succes', 'Taux ajouté.');
        this.dialogueTaux = false;
        const { data } = await referentielsApi.listerTaux();
        this.taux = data.data;
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de l’ajout');
      }
    },
    async ajouterCategorie() {
      if (!this.nouvelleCategorie) return;
      await depensesApi.creerCategorie({ nom: this.nouvelleCategorie });
      this.nouvelleCategorie = '';
      const { data } = await depensesApi.listerCategories();
      this.categoriesDepenses = data.data;
    },
  },
};
</script>
