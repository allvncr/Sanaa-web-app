<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Commandes</h1>
      <el-button type="primary" icon="el-icon-plus" v-can="'commandes:creer'" @click="$router.push({ name: 'commande-nouvelle' })">
        Nouvelle commande
      </el-button>
    </div>

    <div class="sanaa-toolbar">
      <el-input
        v-model="filtres.q"
        class="recherche"
        size="small"
        clearable
        prefix-icon="el-icon-search"
        placeholder="Rechercher : n° de commande, client, téléphone, prénom gravé…"
        @input="chargerDiffere"
        @clear="charger"
      />
      <el-select v-model="filtres.creePar" placeholder="Saisi par" clearable filterable size="small" style="width: 190px" @change="charger">
        <el-option v-for="u in createurs" :key="u._id" :value="u._id" :label="`${u.nom} (${u.total})`" />
      </el-select>
      <el-select v-model="filtres.statut" placeholder="Statut" clearable size="small" style="width: 160px" @change="charger">
        <el-option v-for="(libelle, val) in statutsCommande" :key="val" :value="val" :label="libelle" />
      </el-select>
      <el-date-picker
        v-model="filtres.plage"
        type="daterange"
        size="small"
        range-separator="→"
        start-placeholder="Début"
        end-placeholder="Fin"
        value-format="yyyy-MM-dd"
        @change="charger"
      />
      <el-button size="small" icon="el-icon-refresh" @click="charger">Actualiser</el-button>
    </div>

    <div v-if="selection.length > 0" class="sanaa-card barre-lot">
      <span><strong>{{ selection.length }}</strong> commande{{ selection.length > 1 ? 's' : '' }} sélectionnée{{ selection.length > 1 ? 's' : '' }}</span>
      <el-select v-model="lot.statut_fabrication" placeholder="Fabrication : ne pas changer" clearable size="small" style="width:220px">
        <el-option v-for="(libelle, val) in statutsFabrication" :key="val" :value="val" :label="libelle" />
      </el-select>
      <el-select v-model="lot.statut_livraison" placeholder="Livraison : ne pas changer" clearable size="small" style="width:220px">
        <el-option v-for="(libelle, val) in statutsLivraison" :key="val" :value="val" :label="libelle" />
      </el-select>
      <el-button
        size="small"
        type="primary"
        :disabled="!lot.statut_fabrication && !lot.statut_livraison"
        :loading="applicationLot"
        @click="appliquerLot"
      >
        Appliquer
      </el-button>
      <el-button size="small" @click="viderSelection">Annuler la sélection</el-button>
    </div>

    <div class="sanaa-card sanaa-table-scroll" v-loading="chargement">
      <el-table ref="tableau" :data="commandes" stripe row-key="_id" @row-click="ouvrir" @selection-change="selection = $event">
        <el-table-column v-if="$can('commandes:changer_statut')" type="selection" width="44" />
        <el-table-column prop="numero" label="Numéro" min-width="140" />
        <el-table-column label="Client" min-width="160">
          <template slot-scope="{ row }">{{ row.client_id ? row.client_id.nom : '—' }}</template>
        </el-table-column>
        <el-table-column label="Pays" min-width="90">
          <template slot-scope="{ row }">{{ row.pays_id ? row.pays_id.code : '—' }}</template>
        </el-table-column>
        <el-table-column label="Total" min-width="110">
          <template slot-scope="{ row }">{{ row.total | montant }}</template>
        </el-table-column>
        <el-table-column label="Statut commande" min-width="140">
          <template slot-scope="{ row }">
            <StatutBadge :statut="row.statut_commande" :libelles="statutsCommande" />
          </template>
        </el-table-column>
        <el-table-column label="Fabrication" min-width="130" class-name="hide-mobile">
          <template slot-scope="{ row }">
            <StatutBadge :statut="row.statut_fabrication" :libelles="statutsFabrication" />
          </template>
        </el-table-column>
        <el-table-column label="Livraison" min-width="130" class-name="hide-mobile">
          <template slot-scope="{ row }">
            <StatutBadge :statut="row.statut_livraison" :libelles="statutsLivraison" />
          </template>
        </el-table-column>
        <el-table-column label="Date" min-width="110" class-name="hide-mobile">
          <template slot-scope="{ row }">{{ row.createdAt | dateFr }}</template>
        </el-table-column>
        <el-table-column label="Saisie par" min-width="130" class-name="hide-mobile">
          <template slot-scope="{ row }">{{ row.cree_par && row.cree_par.nom ? row.cree_par.nom : '—' }}</template>
        </el-table-column>
      </el-table>
      <p v-if="!chargement && commandes.length === 0" class="sanaa-empty">Aucune commande trouvée.</p>
      <p v-else-if="!chargement" class="sanaa-text-muted resultat">{{ commandes.length }} commande{{ commandes.length > 1 ? 's' : '' }}</p>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import commandesApi from '@/services/commandes.api';
import StatutBadge from '@/components/common/StatutBadge.vue';

export default {
  name: 'CommandesListe',
  components: { StatutBadge },
  data() {
    return {
      chargement: false,
      commandes: [],
      filtres: { q: '', creePar: '', statut: '', plage: [] },
      createurs: [],
      minuterie: null,
      requete: 0,
      selection: [],
      lot: { statut_fabrication: '', statut_livraison: '' },
      applicationLot: false,
      statutsCommande: this.$i18n.messages.fr.statuts.commande,
      statutsFabrication: this.$i18n.messages.fr.statuts.fabrication,
      statutsLivraison: this.$i18n.messages.fr.statuts.livraison,
    };
  },
  computed: {
    ...mapState('paysContexte', { paysActifId: 'paysActifId' }),
  },
  watch: {
    paysActifId() {
      this.filtres.creePar = '';
      this.chargerCreateurs();
      this.charger();
    },
  },
  mounted() {
    this.chargerCreateurs();
    this.charger();
  },
  beforeDestroy() {
    clearTimeout(this.minuterie);
  },
  methods: {
    async chargerCreateurs() {
      try {
        const { data } = await commandesApi.createurs({ pays_id: this.paysActifId || undefined });
        this.createurs = data.data;
      } catch (e) {
        this.createurs = [];
      }
    },
    // Recherche à la frappe : on attend une courte pause avant d'interroger le serveur.
    chargerDiffere() {
      clearTimeout(this.minuterie);
      this.minuterie = setTimeout(this.charger, 350);
    },
    async charger() {
      clearTimeout(this.minuterie);
      const numeroRequete = ++this.requete;
      this.chargement = true;
      const [date_de, date_a] = this.filtres.plage && this.filtres.plage.length ? this.filtres.plage : [undefined, undefined];
      try {
        const { data } = await commandesApi.lister({
          pays_id: this.paysActifId || undefined,
          q: this.filtres.q ? this.filtres.q.trim() : undefined,
          cree_par: this.filtres.creePar || undefined,
          statut: this.filtres.statut || undefined,
          date_de,
          date_a,
        });
        // Réponse périmée (une frappe plus récente a relancé la recherche) : ignorée.
        if (numeroRequete === this.requete) this.commandes = data.data;
      } finally {
        if (numeroRequete === this.requete) this.chargement = false;
      }
    },
    ouvrir(row, column) {
      // Ne pas ouvrir la fiche quand le clic vise la case à cocher de sélection.
      if (column && column.type === 'selection') return;
      this.$router.push({ name: 'commande-detail', params: { id: row._id } });
    },
    viderSelection() {
      this.$refs.tableau && this.$refs.tableau.clearSelection();
      this.selection = [];
      this.lot = { statut_fabrication: '', statut_livraison: '' };
    },
    async appliquerLot() {
      const noms = { ...this.statutsFabrication, ...this.statutsLivraison };
      const changements = [
        this.lot.statut_fabrication && `Fabrication → ${noms[this.lot.statut_fabrication]}`,
        this.lot.statut_livraison && `Livraison → ${noms[this.lot.statut_livraison]}`,
      ].filter(Boolean).join(' · ');
      try {
        await this.$confirm(
          `Appliquer "${changements}" à ${this.selection.length} commande(s) sélectionnée(s) ?`,
          'Modification groupée',
          { type: 'warning', confirmButtonText: 'Appliquer', cancelButtonText: 'Annuler' }
        );
      } catch (e) {
        return;
      }
      this.applicationLot = true;
      try {
        const ids = this.selection.map((c) => c._id);
        const { data } = await commandesApi.modifierStatutsEnLot(ids, this.lot);
        const { reussies, echecs } = data.data;
        if (reussies > 0) {
          this.$store.dispatch('notifications/succes', `${reussies} commande${reussies > 1 ? 's' : ''} mise${reussies > 1 ? 's' : ''} à jour.`);
        }
        if (echecs.length > 0) {
          const parNumero = echecs.map((e) => {
            const c = this.selection.find((x) => x._id === e.id);
            return `${c ? c.numero : e.id} : ${e.message}`;
          });
          this.$store.dispatch('notifications/erreur', `${echecs.length} échec(s) — ${parNumero.join(' ; ')}`);
        }
        this.viderSelection();
        await this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de la modification groupée');
      } finally {
        this.applicationLot = false;
      }
    },
  },
};
</script>

<style scoped>
.el-table >>> .el-table__row { cursor: pointer; }
.recherche { width: 340px; max-width: 100%; }
.resultat { margin: 10px 0 0; font-size: 0.85rem; color: var(--sanaa-text-muted); }
.barre-lot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 10px 14px;
  border-color: var(--sanaa-accent-2);
  background: var(--sanaa-accent-1-soft);
  font-size: 0.9rem;
}
</style>
