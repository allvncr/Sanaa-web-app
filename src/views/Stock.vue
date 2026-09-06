<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Stock</h1>
      <el-button icon="el-icon-plus" v-can="'stock:ajuster'" @click="dialogueOuvert = true">Saisir un mouvement</el-button>
    </div>

    <div class="sanaa-card sanaa-table-scroll" v-loading="chargement">
      <el-table :data="niveaux" stripe>
        <el-table-column label="Produit" min-width="180">
          <template slot-scope="{ row }">{{ nomProduit(row.produit_id) }}</template>
        </el-table-column>
        <el-table-column label="Variante" min-width="120">
          <template slot-scope="{ row }">{{ nomVariante(row.produit_id, row.variante_id) }}</template>
        </el-table-column>
        <el-table-column prop="stock_total" label="Stock physique" min-width="120" />
        <el-table-column prop="reserve" label="Réservé" min-width="100" />
        <el-table-column label="Disponible" min-width="110">
          <template slot-scope="{ row }">
            <span :style="{ color: row.disponible < 0 ? 'var(--sanaa-danger)' : 'inherit' }">{{ row.disponible }}</span>
          </template>
        </el-table-column>
      </el-table>
      <p v-if="!chargement && niveaux.length === 0" class="sanaa-empty">Aucun mouvement de stock enregistré.</p>
    </div>

    <h2 class="sanaa-section-title">Mouvements récents</h2>
    <div class="sanaa-card sanaa-table-scroll" v-loading="chargementMouvements">
      <el-table :data="mouvements" stripe size="small">
        <el-table-column label="Date" min-width="140">
          <template slot-scope="{ row }">{{ row.date | dateHeureFr }}</template>
        </el-table-column>
        <el-table-column prop="type" label="Type" min-width="140" />
        <el-table-column prop="quantite" label="Quantité" min-width="90" />
        <el-table-column prop="commentaire" label="Commentaire" min-width="180" class-name="hide-mobile" />
      </el-table>
    </div>

    <el-dialog title="Nouveau mouvement de stock" :visible.sync="dialogueOuvert" width="460px">
      <el-form :model="form" label-position="top">
        <el-form-item label="Produit" required>
          <el-select v-model="form.produit_id" filterable style="width:100%" @change="() => (form.variante_id = '')">
            <el-option v-for="p in produits" :key="p._id" :value="p._id" :label="p.nom" />
          </el-select>
        </el-form-item>
        <el-form-item label="Variante" required>
          <el-select v-model="form.variante_id" style="width:100%">
            <el-option v-for="v in variantesDuProduit" :key="v._id" :value="v._id" :label="v.couleur || 'Standard'" />
          </el-select>
        </el-form-item>
        <el-form-item label="Type" required>
          <el-select v-model="form.type" style="width:100%">
            <el-option label="Entrée" value="entree" />
            <el-option label="Sortie" value="sortie" />
            <el-option label="Ajustement" value="ajustement" />
          </el-select>
        </el-form-item>
        <el-form-item label="Quantité" required>
          <el-input-number v-model="form.quantite" style="width:100%" />
        </el-form-item>
        <el-form-item label="Commentaire"><el-input v-model="form.commentaire" /></el-form-item>
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
import stockApi from '@/services/stock.api';

export default {
  name: 'Stock',
  data() {
    return {
      chargement: false,
      chargementMouvements: false,
      niveaux: [],
      mouvements: [],
      dialogueOuvert: false,
      form: { produit_id: '', variante_id: '', type: 'entree', quantite: 1, commentaire: '' },
    };
  },
  computed: {
    ...mapState('paysContexte', { paysActifId: 'paysActifId' }),
    ...mapState('catalogue', ['produits']),
    variantesDuProduit() {
      const p = this.produits.find((pp) => pp._id === this.form.produit_id);
      return p ? p.variantes : [];
    },
  },
  watch: { paysActifId() { this.charger(); } },
  async mounted() {
    await this.$store.dispatch('catalogue/charger');
    this.charger();
  },
  methods: {
    nomProduit(id) {
      const p = this.produits.find((pp) => pp._id === String(id));
      return p ? p.nom : String(id);
    },
    nomVariante(produitId, varianteId) {
      const p = this.produits.find((pp) => pp._id === String(produitId));
      const v = p ? p.variantes.find((vv) => vv._id === String(varianteId)) : null;
      return v ? v.couleur || 'Standard' : '—';
    },
    async charger() {
      if (!this.paysActifId) return;
      this.chargement = true;
      this.chargementMouvements = true;
      try {
        const [n, m] = await Promise.all([
          stockApi.niveaux({ pays_id: this.paysActifId }),
          stockApi.listerMouvements({ pays_id: this.paysActifId }),
        ]);
        this.niveaux = n.data.data;
        this.mouvements = m.data.data;
      } finally {
        this.chargement = false;
        this.chargementMouvements = false;
      }
    },
    async enregistrer() {
      try {
        await stockApi.enregistrerMouvement({ ...this.form, pays_id: this.paysActifId });
        this.$store.dispatch('notifications/succes', 'Mouvement enregistré.');
        this.dialogueOuvert = false;
        this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de l’enregistrement');
      }
    },
  },
};
</script>

<style scoped>
.sanaa-section-title { font-size: 1.1rem; margin: 24px 0 12px; }
</style>
