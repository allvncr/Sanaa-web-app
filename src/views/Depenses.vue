<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Dépenses</h1>
      <el-button type="primary" icon="el-icon-plus" v-can="'depenses:creer'" @click="dialogueOuvert = true">Nouvelle dépense</el-button>
    </div>

    <div class="sanaa-toolbar">
      <el-select v-model="filtres.categorie_id" placeholder="Catégorie" clearable size="small" style="width:180px" @change="charger">
        <el-option v-for="c in categories" :key="c._id" :value="c._id" :label="c.nom" />
      </el-select>
      <el-date-picker
        v-model="filtres.plage"
        type="daterange"
        size="small"
        range-separator="→"
        value-format="yyyy-MM-dd"
        @change="charger"
      />
    </div>

    <div class="sanaa-card sanaa-table-scroll" v-loading="chargement">
      <el-table :data="depenses" stripe show-summary :summary-method="calculerTotal">
        <el-table-column label="Date" min-width="110">
          <template slot-scope="{ row }">{{ row.date | dateFr }}</template>
        </el-table-column>
        <el-table-column label="Catégorie" min-width="140">
          <template slot-scope="{ row }">{{ row.categorie_id ? row.categorie_id.nom : '' }}</template>
        </el-table-column>
        <el-table-column label="Montant" min-width="120">
          <template slot-scope="{ row }">{{ row.montant | montant }}</template>
        </el-table-column>
        <el-table-column prop="commentaire" label="Commentaire" min-width="180" class-name="hide-mobile" />
        <el-table-column label="Statut" min-width="110">
          <template slot-scope="{ row }">
            <el-tag :type="row.statut === 'validee' ? 'success' : 'info'" size="mini">
              {{ row.statut === 'validee' ? 'Validée' : 'En attente' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="" min-width="160">
          <template slot-scope="{ row }">
            <el-button v-if="row.statut !== 'validee'" v-can="'depenses:valider'" size="mini" @click="valider(row)">Valider</el-button>
            <el-button size="mini" icon="el-icon-delete" circle v-can="'depenses:supprimer'" @click="supprimer(row)" />
          </template>
        </el-table-column>
      </el-table>
      <p v-if="!chargement && depenses.length === 0" class="sanaa-empty">Aucune dépense.</p>
    </div>

    <el-dialog title="Nouvelle dépense" :visible.sync="dialogueOuvert" width="420px">
      <el-form :model="form" label-position="top">
        <el-form-item label="Catégorie" required>
          <el-select v-model="form.categorie_id" style="width:100%">
            <el-option v-for="c in categories" :key="c._id" :value="c._id" :label="c.nom" />
          </el-select>
        </el-form-item>
        <el-form-item label="Date" required>
          <el-date-picker v-model="form.date" type="date" value-format="yyyy-MM-dd" style="width:100%" />
        </el-form-item>
        <el-form-item label="Montant" required><el-input-number v-model="form.montant" :min="0" style="width:100%" /></el-form-item>
        <el-form-item label="Commentaire"><el-input v-model="form.commentaire" type="textarea" /></el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogueOuvert = false">Annuler</el-button>
        <el-button type="primary" @click="enregistrer">Enregistrer</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import depensesApi from '@/services/depenses.api';
import { formaterMontant } from '@/utils/format';

export default {
  name: 'Depenses',
  data() {
    return {
      chargement: false,
      depenses: [],
      categories: [],
      filtres: { categorie_id: '', plage: [] },
      dialogueOuvert: false,
      form: { categorie_id: '', date: new Date().toISOString().slice(0, 10), montant: 0, commentaire: '' },
    };
  },
  computed: { ...mapState('paysContexte', { paysActifId: 'paysActifId' }) },
  watch: { paysActifId() { this.charger(); } },
  async mounted() {
    const { data } = await depensesApi.listerCategories();
    this.categories = data.data;
    this.charger();
  },
  methods: {
    async charger() {
      this.chargement = true;
      const [date_de, date_a] = this.filtres.plage && this.filtres.plage.length ? this.filtres.plage : [undefined, undefined];
      try {
        const { data } = await depensesApi.lister({
          pays_id: this.paysActifId || undefined,
          categorie_id: this.filtres.categorie_id || undefined,
          date_de,
          date_a,
        });
        this.depenses = data.data;
      } finally {
        this.chargement = false;
      }
    },
    async enregistrer() {
      try {
        await depensesApi.creer({ ...this.form, pays_id: this.paysActifId });
        this.$store.dispatch('notifications/succes', 'Dépense enregistrée.');
        this.dialogueOuvert = false;
        this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de l’enregistrement');
      }
    },
    async valider(row) {
      await depensesApi.valider(row._id);
      this.charger();
    },
    async supprimer(row) {
      try {
        await this.$confirm('Supprimer cette dépense ?', 'Confirmation', { type: 'warning' });
      } catch (e) {
        return;
      }
      try {
        await depensesApi.supprimer(row._id);
        this.$store.dispatch('notifications/succes', 'Dépense supprimée.');
        this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Suppression impossible');
      }
    },
    // Retour V0.1 : toujours afficher le total de la liste filtrée, pas
    // seulement les lignes individuelles.
    calculerTotal({ columns, data }) {
      return columns.map((col, index) => {
        if (index === 0) return `Total (${data.length})`;
        if (col.label === 'Montant') {
          const total = data.reduce((acc, row) => acc + Number(row.montant || 0), 0);
          return formaterMontant(total);
        }
        return '';
      });
    },
  },
};
</script>
