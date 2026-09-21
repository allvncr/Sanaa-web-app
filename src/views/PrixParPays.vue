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

    <div v-can="'catalogue:definir_prix_pays'" class="barre-lot" :class="{ 'barre-lot--active': lignesModifiees.length > 0 }">
      <span v-if="lignesModifiees.length > 0">
        <strong>{{ lignesModifiees.length }}</strong> prix modifié{{ lignesModifiees.length > 1 ? 's' : '' }} non enregistré{{ lignesModifiees.length > 1 ? 's' : '' }}
      </span>
      <span v-else class="sanaa-text-muted">Modifiez des prix dans la grille, puis enregistrez-les tous d'un coup.</span>
      <span class="barre-lot__actions">
        <el-button size="small" :disabled="lignesModifiees.length === 0 || enregistrementLot" @click="annulerModifications">
          Annuler les modifications
        </el-button>
        <el-button
          size="small"
          type="primary"
          icon="el-icon-check"
          :disabled="lignesModifiees.length === 0"
          :loading="enregistrementLot"
          @click="enregistrerTout"
        >
          Enregistrer tout{{ lignesModifiees.length ? ` (${lignesModifiees.length})` : '' }}
        </el-button>
      </span>
    </div>

    <div class="sanaa-toolbar">
      <el-select v-model="paysSelectionne" placeholder="Choisir un pays" size="small" style="width:220px" @change="changerPays">
        <el-option v-for="p in paysContexte.liste" :key="p._id" :value="p._id" :label="p.nom" />
      </el-select>
    </div>

    <div class="sanaa-card sanaa-table-scroll" v-loading="chargement">
      <el-table :data="lignesGrille" stripe :row-class-name="classeLigne">
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
              <el-button size="mini" :type="estModifiee(row) ? 'primary' : 'default'" @click="definirPrix(row)">Enregistrer</el-button>
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
    return { chargement: false, enregistrementLot: false, paysSelectionne: '', paysAffiche: '', lignesGrille: [] };
  },
  computed: {
    ...mapState({ paysContexte: (state) => state.paysContexte }),
    // Une ligne est "modifiée" quand le prix saisi diffère du prix actuel (ou qu'un
    // premier prix est saisi pour une variante sans prix dans ce pays).
    lignesModifiees() {
      return this.lignesGrille.filter((row) => this.estModifiee(row));
    },
  },
  mounted() {
    this.paysSelectionne = this.paysContexte.paysActifId || (this.paysContexte.liste[0] && this.paysContexte.liste[0]._id) || '';
    if (this.paysSelectionne) this.charger();
  },
  methods: {
    estModifiee(row) {
      const saisi = Number(row.nouveauPrix) || 0;
      return row.prixActuel ? saisi !== row.prixActuel.prix : saisi > 0;
    },
    classeLigne({ row }) {
      return this.estModifiee(row) ? 'ligne-modifiee' : '';
    },
    annulerModifications() {
      this.lignesGrille.forEach((row) => {
        row.nouveauPrix = row.prixActuel ? row.prixActuel.prix : 0;
      });
    },
    async enregistrerTout() {
      const lot = this.lignesModifiees;
      if (lot.length === 0) return;
      this.enregistrementLot = true;
      try {
        await catalogueApi.definirPrixPaysEnLot(
          this.paysSelectionne,
          lot.map((row) => ({ variante_id: row.varianteId, prix: Number(row.nouveauPrix) || 0 }))
        );
        this.$store.dispatch('notifications/succes', `${lot.length} prix enregistré${lot.length > 1 ? 's' : ''}.`);
        await this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de l’enregistrement groupé');
      } finally {
        this.enregistrementLot = false;
      }
    },
    async changerPays(nouveau) {
      if (this.lignesModifiees.length > 0) {
        try {
          await this.$confirm(
            `${this.lignesModifiees.length} prix modifié(s) non enregistré(s) seront perdus. Changer de pays ?`,
            'Modifications non enregistrées',
            { type: 'warning', confirmButtonText: 'Changer de pays', cancelButtonText: 'Rester' }
          );
        } catch (e) {
          this.paysSelectionne = this.paysAffiche;
          return;
        }
      }
      this.paysSelectionne = nouveau;
      await this.charger();
    },
    // conserver : recharge les prix depuis le serveur en gardant les saisies non
    // enregistrées des autres lignes (ex. après l'enregistrement d'une seule ligne).
    async charger({ conserver = false } = {}) {
      if (!this.paysSelectionne) return;
      const saisies = new Map(conserver ? this.lignesModifiees.map((row) => [row.varianteId, row.nouveauPrix]) : []);
      this.paysAffiche = this.paysSelectionne;
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
              nouveauPrix: saisies.has(variante._id)
                ? saisies.get(variante._id)
                : prixActuel ? Number(prixActuel.prix.$numberDecimal || prixActuel.prix) : 0,
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
        await this.charger({ conserver: true });
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
        await this.charger({ conserver: true });
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de l’héritage');
      }
    },
  },
};
</script>

<style scoped>
.prix-edit { display: flex; align-items: center; gap: 8px; }
.sanaa-text-muted { color: var(--sanaa-text-muted); font-size: 0.85rem; }
.barre-lot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px 14px;
  border: 1px solid var(--sanaa-border);
  border-radius: var(--sanaa-radius-md);
  background: var(--sanaa-bg-alt);
  font-size: 0.9rem;
}
.barre-lot--active { border-color: var(--el-color-primary, #409eff); background: #fff8e6; }
.el-table >>> .ligne-modifiee td { background: #fff8e6 !important; }
</style>
