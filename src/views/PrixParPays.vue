<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Prix par pays</h1>
      <el-button
        v-can="'catalogue:definir_prix_pays'"
        icon="el-icon-connection"
        :disabled="!paysSelectionne"
        @click="heriterCatalogue"
      >
        Hériter du catalogue global
      </el-button>
    </div>

    <div class="sanaa-toolbar">
      <el-select v-model="paysSelectionne" placeholder="Choisir un pays" size="small" style="width:220px" @change="charger">
        <el-option v-for="p in paysContexte.liste" :key="p._id" :value="p._id" :label="p.nom" />
      </el-select>
    </div>

    <div class="sanaa-card sanaa-table-scroll" v-loading="chargement">
      <el-table :data="lignesGrille" stripe>
        <el-table-column prop="produit" label="Produit" min-width="180" />
        <el-table-column prop="variante" label="Variante" min-width="120" />
        <el-table-column label="Prix actuel" min-width="140">
          <template slot-scope="{ row }">
            <span v-if="row.prixActuel">{{ row.prixActuel.prix | montant }}</span>
            <el-tag v-else type="info" size="mini">Non défini</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Actif" min-width="80">
          <template slot-scope="{ row }">
            <el-tag v-if="row.prixActuel" :type="row.prixActuel.actif ? 'success' : 'info'" size="mini">
              {{ row.prixActuel.actif ? 'Actif' : 'Inactif' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Nouveau prix" min-width="200">
          <template slot-scope="{ row }">
            <div class="prix-edit">
              <el-input-number v-model="row.nouveauPrix" :min="0" size="small" style="width:130px" />
              <el-button size="mini" type="primary" @click="definirPrix(row)">Enregistrer</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <p v-if="!chargement && lignesGrille.length === 0" class="sanaa-empty">Sélectionnez un pays pour afficher la grille.</p>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import catalogueApi from '@/services/catalogue.api';
import paysApi from '@/services/pays.api';

export default {
  name: 'PrixParPays',
  data() {
    return { chargement: false, paysSelectionne: '', lignesGrille: [] };
  },
  computed: { ...mapState({ paysContexte: (state) => state.paysContexte }) },
  mounted() {
    this.paysSelectionne = this.paysContexte.paysActifId || (this.paysContexte.liste[0] && this.paysContexte.liste[0]._id) || '';
    if (this.paysSelectionne) this.charger();
  },
  methods: {
    async charger() {
      if (!this.paysSelectionne) return;
      this.chargement = true;
      try {
        const { data } = await catalogueApi.listerProduits({ statut: 'actif' });
        const lignes = [];
        for (const produit of data.data) {
          for (const variante of produit.variantes) {
            const candidats = (variante.prix_pays || []).filter((p) => String(p.pays_id) === String(this.paysSelectionne));
            const prixActuel = candidats.sort((a, b) => new Date(b.date_debut_validite) - new Date(a.date_debut_validite))[0];
            lignes.push({
              produitId: produit._id,
              varianteId: variante._id,
              produit: produit.nom,
              variante: variante.couleur || 'Standard',
              prixActuel: prixActuel ? { prix: Number(prixActuel.prix.$numberDecimal || prixActuel.prix), actif: prixActuel.actif } : null,
              nouveauPrix: prixActuel ? Number(prixActuel.prix.$numberDecimal || prixActuel.prix) : 0,
            });
          }
        }
        this.lignesGrille = lignes;
      } finally {
        this.chargement = false;
      }
    },
    async definirPrix(row) {
      try {
        await catalogueApi.definirPrixPays(row.varianteId, this.paysSelectionne, { prix: row.nouveauPrix });
        this.$store.dispatch('notifications/succes', 'Prix mis à jour.');
        this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de la mise à jour');
      }
    },
    async heriterCatalogue() {
      try {
        const { data } = await paysApi.heriterCatalogue(this.paysSelectionne);
        this.$store.dispatch(
          'notifications/succes',
          `${data.data.variantesInitialisees} variante(s) initialisée(s) (à activer après vérification).`
        );
        this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de l’héritage');
      }
    },
  },
};
</script>

<style scoped>
.prix-edit { display: flex; align-items: center; gap: 8px; }
</style>
