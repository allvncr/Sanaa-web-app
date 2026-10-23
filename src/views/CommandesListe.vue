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
        @clear="chargerDepuisFiltre"
      />
      <el-select v-model="filtres.creePar" placeholder="Saisi par" clearable filterable size="small" style="width: 190px" @change="chargerDepuisFiltre">
        <el-option v-for="u in createurs" :key="u._id" :value="u._id" :label="`${u.nom} (${u.total})`" />
      </el-select>
      <el-select v-model="filtres.fabrication" placeholder="Fabrication" clearable size="small" style="width: 190px" @change="chargerDepuisFiltre">
        <el-option v-for="(libelle, val) in statutsFabrication" :key="val" :value="val" :label="avecCompteur(libelle, 'fabrication', val)" />
      </el-select>
      <el-select v-model="filtres.livraison" placeholder="Livraison" clearable size="small" style="width: 190px" @change="chargerDepuisFiltre">
        <el-option v-for="(libelle, val) in statutsLivraison" :key="val" :value="val" :label="avecCompteur(libelle, 'livraison', val)" />
      </el-select>
      <el-date-picker
        v-model="filtres.plage"
        type="daterange"
        size="small"
        range-separator="→"
        start-placeholder="Début"
        end-placeholder="Fin"
        value-format="yyyy-MM-dd"
        @change="chargerDepuisFiltre"
      />
      <el-button size="small" icon="el-icon-refresh" @click="charger">Actualiser</el-button>
    </div>

    <div v-if="pastilles.length" class="sanaa-filtres-actifs">
      <span v-for="p in pastilles" :key="p.cle" class="sanaa-filtre-pastille">
        {{ p.texte }}
        <button type="button" :aria-label="'Retirer le filtre ' + p.texte" @click="retirerFiltre(p.cle)">×</button>
      </span>
      <button type="button" class="sanaa-filtres-effacer" @click="effacerFiltres">Tout effacer</button>
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

    <div class="sanaa-card hide-mobile" v-if="chargement && commandes.length === 0">
      <div v-for="n in 8" :key="n" class="sanaa-skeleton sanaa-skeleton--ligne" />
    </div>
    <div v-else class="sanaa-card sanaa-table-scroll hide-mobile" v-loading="chargement">
      <el-table ref="tableau" :data="commandes" stripe row-key="_id" :row-class-name="classeLigne" @row-click="ouvrir" @selection-change="selection = $event">
        <el-table-column v-if="$can('commandes:changer_statut')" type="selection" width="44" />
        <el-table-column label="Numéro" min-width="150">
          <template slot-scope="{ row }">
            <span
              v-if="retardDe(row)"
              class="sanaa-pastille-retard"
              :class="{ 'is-attention': retardDe(row).niveau === 'attention' }"
              :title="retardDe(row).texte"
            />{{ row.numero }}
          </template>
        </el-table-column>
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
        <el-table-column label="" width="56" align="center">
          <template slot-scope="{ row }">
            <el-button
              type="text"
              class="btn-whatsapp-ligne"
              icon="el-icon-chat-dot-round"
              title="Envoyer un message WhatsApp au client"
              @click.stop="envoyerWhatsApp(row)"
            />
          </template>
        </el-table-column>
      </el-table>
      <p v-if="!chargement && commandes.length === 0" class="sanaa-empty">Aucune commande trouvée.</p>
      <PaginationBarre :page="pagination.page" :limite="pagination.limite" :total="pagination.total" @update:page="changerPage" @update:limite="changerLimite" />
    </div>

    <!-- Téléphone : une carte par commande (le tableau large oblige à défiler de côté). -->
    <div class="hide-desktop" v-loading="chargement && commandes.length > 0">
      <template v-if="chargement && commandes.length === 0">
        <div v-for="n in 5" :key="n" class="sanaa-skeleton sanaa-skeleton--ligne" style="height: 96px" />
      </template>
      <article
        v-for="row in commandes"
        :key="row._id"
        class="sanaa-card carte-commande"
        :class="classeCarte(row)"
        @click="ouvrir(row)"
      >
        <header class="carte-commande__tete">
          <strong>{{ row.numero }}</strong>
          <StatutBadge :statut="row.statut_livraison" :libelles="statutsLivraison" />
        </header>
        <p class="carte-commande__client">{{ row.client_id && row.client_id.nom ? row.client_id.nom : '—' }}<span v-if="row.pays_id" class="sanaa-text-muted"> · {{ row.pays_id.code }}</span></p>
        <p v-if="retardDe(row)" class="carte-commande__alerte" :class="{ 'is-attention': retardDe(row).niveau === 'attention' }">
          <span class="sanaa-pastille-retard" :class="{ 'is-attention': retardDe(row).niveau === 'attention' }" />{{ retardDe(row).texte }}
        </p>
        <footer class="carte-commande__pied">
          <span class="carte-commande__total">{{ row.total | montant }}</span>
          <StatutBadge :statut="row.statut_fabrication" :libelles="statutsFabrication" />
          <span class="sanaa-text-muted">{{ row.createdAt | dateFr }}</span>
          <el-button type="text" class="btn-whatsapp-ligne" icon="el-icon-chat-dot-round" @click.stop="envoyerWhatsApp(row)" />
        </footer>
      </article>
      <div v-if="!chargement && commandes.length === 0" class="sanaa-card"><p class="sanaa-empty">Aucune commande trouvée.</p></div>
      <div v-if="commandes.length" class="sanaa-card carte-pagination">
        <PaginationBarre :page="pagination.page" :limite="pagination.limite" :total="pagination.total" @update:page="changerPage" @update:limite="changerLimite" />
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import commandesApi from '@/services/commandes.api';
import StatutBadge from '@/components/common/StatutBadge.vue';
import PaginationBarre from '@/components/common/PaginationBarre.vue';
import { lienWhatsApp } from '@/utils/whatsapp';
import { retardCommande } from '@/utils/retards';

export default {
  name: 'CommandesListe',
  components: { StatutBadge, PaginationBarre },
  data() {
    return {
      chargement: false,
      commandes: [],
      filtres: { q: '', creePar: '', fabrication: '', livraison: '', plage: [] },
      compteurs: { commande: {}, fabrication: {}, livraison: {} },
      pagination: { page: 1, limite: 20, total: 0 },
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
    // Filtres actifs sous forme de pastilles retirables d'un clic.
    pastilles() {
      const f = this.filtres;
      const liste = [];
      if (f.q) liste.push({ cle: 'q', texte: `Recherche : ${f.q}` });
      if (f.creePar) {
        const u = this.createurs.find((c) => c._id === f.creePar);
        liste.push({ cle: 'creePar', texte: `Saisi par ${u ? u.nom : '…'}` });
      }
      if (f.fabrication) liste.push({ cle: 'fabrication', texte: `Fabrication : ${this.statutsFabrication[f.fabrication] || f.fabrication}` });
      if (f.livraison) liste.push({ cle: 'livraison', texte: `Livraison : ${this.statutsLivraison[f.livraison] || f.livraison}` });
      if (f.plage && f.plage.length === 2) {
        const fr = (d) => String(d).split('-').reverse().join('/');
        liste.push({ cle: 'plage', texte: `Du ${fr(f.plage[0])} au ${fr(f.plage[1])}` });
      }
      return liste;
    },
  },
  watch: {
    paysActifId() {
      this.filtres.creePar = '';
      this.chargerCreateurs();
      this.chargerDepuisFiltre();
    },
  },
  mounted() {
    this.restaurerDepuisRoute();
    this.chargerCreateurs();
    this.charger();
  },
  beforeDestroy() {
    clearTimeout(this.minuterie);
  },
  methods: {
    // Filtres et pagination lus depuis l'URL au montage (retour V0.1,
    // 30/09/2026) : ouvrir une commande puis faire « Retour » réaffiche la
    // même liste filtrée, au lieu de tout réinitialiser silencieusement.
    restaurerDepuisRoute() {
      const q = this.$route.query;
      this.filtres = {
        q: q.q || '',
        creePar: q.cree_par || '',
        fabrication: q.fabrication || '',
        livraison: q.livraison || '',
        plage: q.date_de && q.date_a ? [q.date_de, q.date_a] : [],
      };
      this.pagination.page = Number(q.page) || 1;
      this.pagination.limite = Number(q.limite) || 20;
    },
    // Reflète l'état courant des filtres dans l'URL (sans ajouter d'entrée
    // d'historique) pour que ce même état revienne si on navigue vers une
    // commande puis qu'on revient en arrière.
    synchroniserRoute() {
      const [date_de, date_a] = this.filtres.plage && this.filtres.plage.length ? this.filtres.plage : [undefined, undefined];
      const query = {};
      if (this.filtres.q) query.q = this.filtres.q;
      if (this.filtres.creePar) query.cree_par = this.filtres.creePar;
      if (this.filtres.fabrication) query.fabrication = this.filtres.fabrication;
      if (this.filtres.livraison) query.livraison = this.filtres.livraison;
      if (date_de) query.date_de = date_de;
      if (date_a) query.date_a = date_a;
      if (this.pagination.page > 1) query.page = String(this.pagination.page);
      if (this.pagination.limite !== 20) query.limite = String(this.pagination.limite);
      if (JSON.stringify(query) !== JSON.stringify(this.$route.query)) {
        this.$router.replace({ query }).catch(() => {});
      }
    },
    retardDe(row) {
      return retardCommande(row);
    },
    classeLigne({ row }) {
      const r = retardCommande(row);
      if (!r) return '';
      return r.niveau === 'retard' ? 'ligne-retard' : 'ligne-attention';
    },
    classeCarte(row) {
      const r = retardCommande(row);
      return r ? `carte-commande--${r.niveau}` : '';
    },
    retirerFiltre(cle) {
      this.filtres = { ...this.filtres, [cle]: cle === 'plage' ? [] : '' };
      this.chargerDepuisFiltre();
    },
    effacerFiltres() {
      this.filtres = { q: '', creePar: '', fabrication: '', livraison: '', plage: [] };
      this.chargerDepuisFiltre();
    },
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
      this.minuterie = setTimeout(this.chargerDepuisFiltre, 350);
    },
    // Un filtre qui change invalide la page courante (ex. page 3 peut ne plus exister).
    chargerDepuisFiltre() {
      this.pagination.page = 1;
      this.charger();
    },
    changerPage(page) {
      this.pagination.page = page;
      this.viderSelection();
      this.charger();
    },
    changerLimite(limite) {
      this.pagination.limite = limite;
      this.pagination.page = 1;
      this.viderSelection();
      this.charger();
    },
    // Effectifs réels par statut, selon les autres filtres actifs, affichés
    // dans les listes déroulantes ("En livraison (12)").
    async chargerCompteurs(criteres) {
      try {
        const { data } = await commandesApi.compteursStatuts(criteres);
        this.compteurs = data.data;
      } catch (e) {
        this.compteurs = { commande: {}, fabrication: {}, livraison: {} };
      }
    },
    avecCompteur(libelle, famille, valeur) {
      const n = this.compteurs[famille] ? this.compteurs[famille][valeur] : 0;
      return `${libelle} (${n || 0})`;
    },
    async charger() {
      clearTimeout(this.minuterie);
      this.synchroniserRoute();
      const numeroRequete = ++this.requete;
      this.chargement = true;
      const [date_de, date_a] = this.filtres.plage && this.filtres.plage.length ? this.filtres.plage : [undefined, undefined];
      const criteres = {
        pays_id: this.paysActifId || undefined,
        q: this.filtres.q ? this.filtres.q.trim() : undefined,
        cree_par: this.filtres.creePar || undefined,
        statut_fabrication: this.filtres.fabrication || undefined,
        statut_livraison: this.filtres.livraison || undefined,
        date_de,
        date_a,
      };
      this.chargerCompteurs(criteres);
      try {
        const { data } = await commandesApi.lister({ ...criteres, page: this.pagination.page, limite: this.pagination.limite });
        // Réponse périmée (une frappe plus récente a relancé la recherche) : ignorée.
        if (numeroRequete === this.requete) {
          this.commandes = data.data;
          this.pagination.total = data.meta.total;
        }
      } finally {
        if (numeroRequete === this.requete) this.chargement = false;
      }
    },
    ouvrir(row, column) {
      // Ne pas ouvrir la fiche quand le clic vise la case à cocher de sélection.
      if (column && column.type === 'selection') return;
      this.$router.push({ name: 'commande-detail', params: { id: row._id }, query: this.$route.query });
    },
    envoyerWhatsApp(row) {
      const paysId = row.pays_id && (row.pays_id._id || row.pays_id);
      const pays = this.$store.state.paysContexte.liste.find((p) => p._id === paysId) || row.pays_id;
      const lien = lienWhatsApp(row, pays);
      if (!lien) {
        this.$store.dispatch('notifications/erreur', `Numéro du client absent ou illisible pour ${row.numero}.`);
        return;
      }
      window.open(lien, '_blank', 'noopener');
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

<style lang="scss" scoped>
.el-table ::v-deep .el-table__row { cursor: pointer; }
.recherche { width: 340px; max-width: 100%; }
.btn-whatsapp-ligne { color: #25D366; font-size: 1.25rem; padding: 0; }
.carte-commande {
  margin-bottom: 10px;
  padding: 12px 14px;
  cursor: pointer;
  border-left: 4px solid transparent;
}
.carte-commande--retard { border-left-color: var(--sanaa-danger); }
.carte-commande--attention { border-left-color: var(--sanaa-warning); }
.carte-commande__tete { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.carte-commande__client { margin: 6px 0 2px; font-size: 0.95rem; }
.carte-commande__alerte { margin: 4px 0 0; font-size: 0.8rem; color: var(--sanaa-danger); &.is-attention { color: var(--sanaa-warning); } }
.carte-commande__pied { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-top: 10px; font-size: 0.82rem; }
.carte-commande__total { font-weight: 700; margin-right: auto; }
.carte-pagination { padding: 8px; }
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
