<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <div>
        <h1>Stock</h1>
        <p class="sanaa-text-muted entete-sous">
          Bijoux uniques gardés en stock (non personnalisés). Les ventes ne passent pas par les commandes : on note ici chaque sortie, retour et réapprovisionnement.
        </p>
      </div>
      <div v-can="'stock:ajuster'" class="entete-actions">
        <el-tooltip :disabled="!!paysActifId" content="Choisissez un pays en haut de la page pour ajouter un produit" placement="bottom">
          <span>
            <el-button icon="el-icon-plus" :disabled="!paysActifId" @click="ouvrirNouveauProduit">Nouveau produit</el-button>
          </span>
        </el-tooltip>
        <el-button type="primary" icon="el-icon-edit-outline" :disabled="articles.length === 0" @click="ouvrirMouvement()">Saisir un mouvement</el-button>
      </div>
    </div>

    <div class="resume">
      <div class="sanaa-kpi sanaa-kpi--secondaire">
        <span class="sanaa-kpi-label">Produits en stock</span>
        <span class="sanaa-kpi-value">{{ resume.articles }}</span>
      </div>
      <div class="sanaa-kpi sanaa-kpi--secondaire">
        <span class="sanaa-kpi-label">Pièces au total</span>
        <span class="sanaa-kpi-value">{{ resume.pieces }}</span>
      </div>
      <div class="sanaa-kpi sanaa-kpi--secondaire" :class="{ 'is-alerte': resume.bas > 0 }">
        <span class="sanaa-kpi-label">Stock bas</span>
        <span class="sanaa-kpi-value">{{ resume.bas }}</span>
      </div>
      <div class="sanaa-kpi sanaa-kpi--secondaire" :class="{ 'is-danger': resume.rupture > 0 }">
        <span class="sanaa-kpi-label">En rupture</span>
        <span class="sanaa-kpi-value">{{ resume.rupture }}</span>
      </div>
    </div>

    <div class="sanaa-toolbar">
      <el-input
        v-model="recherche"
        class="recherche"
        size="small"
        clearable
        prefix-icon="el-icon-search"
        placeholder="Rechercher un produit (nom, référence, couleur)…"
        @input="rechercherDiffere"
        @clear="chargerArticles"
      />
      <el-checkbox v-model="afficherArchives" @change="chargerArticles">Afficher les produits archivés</el-checkbox>
    </div>

    <!-- Bureau : tableau -->
    <div v-if="chargementArticles && articles.length === 0" class="sanaa-card">
      <div v-for="n in 5" :key="n" class="sanaa-skeleton sanaa-skeleton--ligne" />
    </div>
    <div v-else class="sanaa-card sanaa-table-scroll hide-mobile" v-loading="chargementArticles">
      <el-table :data="articles" stripe :row-class-name="classeLigne">
        <el-table-column label="Produit" min-width="220">
          <template slot-scope="{ row }">
            <strong>{{ row.nom }}</strong>
            <span v-if="!row.actif" class="archive-tag">archivé</span>
            <div class="sanaa-text-muted detail-produit">{{ [row.reference, row.couleur].filter(Boolean).join(' · ') || '—' }}</div>
          </template>
        </el-table-column>
        <el-table-column v-if="!paysActifId" label="Pays" width="80">
          <template slot-scope="{ row }">{{ row.pays_id && row.pays_id.code }}</template>
        </el-table-column>
        <el-table-column label="En stock" width="130" align="center">
          <template slot-scope="{ row }">
            <span class="sanaa-badge-statut" :class="classeStock(row)">{{ row.quantite }}<template v-if="row.statut_stock === 'rupture'"> · rupture</template><template v-else-if="row.statut_stock === 'bas'"> · bas</template></span>
          </template>
        </el-table-column>
        <el-table-column label="Alerte à" width="90" align="center">
          <template slot-scope="{ row }">{{ row.seuil_alerte || '—' }}</template>
        </el-table-column>
        <el-table-column label="Dernier mouvement" min-width="140">
          <template slot-scope="{ row }">{{ row.dernier_mouvement | dateFr }}</template>
        </el-table-column>
        <el-table-column v-if="$can('stock:ajuster')" label="" min-width="340" align="right">
          <template slot-scope="{ row }">
            <template v-if="row.actif">
              <el-button size="mini" icon="el-icon-plus" class="btn-entree" @click="ouvrirMouvement(row, 'entree')">Entrée</el-button>
              <el-button size="mini" icon="el-icon-minus" class="btn-sortie" :disabled="row.quantite <= 0" @click="ouvrirMouvement(row, 'sortie')">Sortie</el-button>
              <el-button size="mini" icon="el-icon-refresh-left" class="btn-retour" @click="ouvrirMouvement(row, 'retour')">Retour</el-button>
            </template>
            <el-dropdown trigger="click" @command="(c) => actionLigne(c, row)">
              <el-button size="mini" icon="el-icon-more" circle />
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item command="historique" icon="el-icon-time">Historique</el-dropdown-item>
                <el-dropdown-item command="inventaire" icon="el-icon-finished" :disabled="!row.actif">Inventaire (recompter)</el-dropdown-item>
                <el-dropdown-item command="modifier" icon="el-icon-edit">Modifier le produit</el-dropdown-item>
                <el-dropdown-item command="archiver" :icon="row.actif ? 'el-icon-folder-remove' : 'el-icon-folder-checked'">{{ row.actif ? 'Archiver' : 'Réactiver' }}</el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
      <p v-if="!chargementArticles && articles.length === 0" class="sanaa-empty">
        Aucun produit en stock pour le moment.<br />Cliquez sur « Nouveau produit » pour ajouter votre premier bijou.
      </p>
    </div>

    <!-- Téléphone : une carte par produit -->
    <div class="hide-desktop">
      <article v-for="a in articles" :key="a._id" class="sanaa-card carte-article" :class="classeCarte(a)">
        <header class="carte-article__tete">
          <div>
            <strong>{{ a.nom }}</strong><span v-if="!a.actif" class="archive-tag">archivé</span>
            <div class="sanaa-text-muted detail-produit">{{ [a.reference, a.couleur].filter(Boolean).join(' · ') || '—' }}</div>
          </div>
          <span class="sanaa-badge-statut gros" :class="classeStock(a)">{{ a.quantite }}</span>
        </header>
        <div v-can="'stock:ajuster'" class="carte-article__actions">
          <template v-if="a.actif">
            <el-button size="small" icon="el-icon-plus" class="btn-entree" @click="ouvrirMouvement(a, 'entree')">Entrée</el-button>
            <el-button size="small" icon="el-icon-minus" class="btn-sortie" :disabled="a.quantite <= 0" @click="ouvrirMouvement(a, 'sortie')">Sortie</el-button>
            <el-button size="small" icon="el-icon-refresh-left" class="btn-retour" @click="ouvrirMouvement(a, 'retour')">Retour</el-button>
          </template>
          <el-button size="small" icon="el-icon-time" @click="actionLigne('historique', a)" />
          <el-button size="small" icon="el-icon-edit" @click="actionLigne('modifier', a)" />
        </div>
      </article>
      <div v-if="!chargementArticles && articles.length === 0" class="sanaa-card"><p class="sanaa-empty">Aucun produit en stock pour le moment.</p></div>
    </div>

    <!-- Journal des mouvements -->
    <h2 ref="journal" class="sanaa-section-title">Mouvements</h2>
    <div class="sanaa-toolbar">
      <el-select v-model="filtres.article_id" size="small" clearable filterable placeholder="Tous les produits" style="width: 220px" @change="filtrerMouvements">
        <el-option v-for="a in articles" :key="a._id" :value="a._id" :label="libelleArticle(a)" />
      </el-select>
      <el-select v-model="filtres.type" size="small" clearable placeholder="Tous les types" style="width: 170px" @change="filtrerMouvements">
        <el-option v-for="(t, cle) in TYPES" :key="cle" :value="cle" :label="t.libelle" />
      </el-select>
      <el-date-picker
        v-model="filtres.plage"
        type="daterange"
        size="small"
        range-separator="→"
        start-placeholder="Début"
        end-placeholder="Fin"
        value-format="yyyy-MM-dd"
        @change="filtrerMouvements"
      />
      <el-checkbox v-model="filtres.annules" @change="filtrerMouvements">Afficher les annulés</el-checkbox>
    </div>
    <div class="sanaa-card sanaa-table-scroll" v-loading="chargementMouvements">
      <el-table :data="mouvements" stripe size="small" :row-class-name="({ row }) => (row.annule ? 'mouvement-annule' : '')">
        <el-table-column label="Date" width="110">
          <template slot-scope="{ row }">{{ row.date | dateFr }}</template>
        </el-table-column>
        <el-table-column label="Produit" min-width="170">
          <template slot-scope="{ row }">{{ row.article_id ? libelleArticle(row.article_id) : '—' }}</template>
        </el-table-column>
        <el-table-column label="Type" width="140">
          <template slot-scope="{ row }">
            <span class="sanaa-badge-statut" :class="TYPES[row.type] ? TYPES[row.type].classe : ''">{{ TYPES[row.type] ? TYPES[row.type].libelle : row.type }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Quantité" width="90" align="right">
          <template slot-scope="{ row }">
            <strong :class="row.quantite > 0 ? 'qte-plus' : 'qte-moins'">{{ row.quantite > 0 ? '+' : '' }}{{ row.quantite }}</strong>
          </template>
        </el-table-column>
        <el-table-column prop="commentaire" label="Note" min-width="180" class-name="hide-mobile" />
        <el-table-column label="Saisi par" min-width="120" class-name="hide-mobile">
          <template slot-scope="{ row }">{{ row.saisi_par && row.saisi_par.nom ? row.saisi_par.nom : '—' }}</template>
        </el-table-column>
        <el-table-column v-if="$can('stock:ajuster')" label="" width="110" align="center">
          <template slot-scope="{ row }">
            <span v-if="row.annule" class="sanaa-text-muted">annulé</span>
            <el-popconfirm v-else title="Annuler ce mouvement ?" confirm-button-text="Annuler le mouvement" cancel-button-text="Garder" @confirm="annuler(row)">
              <el-button slot="reference" type="text" size="small">Annuler</el-button>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      <p v-if="!chargementMouvements && mouvements.length === 0" class="sanaa-empty">Aucun mouvement enregistré.</p>
      <PaginationBarre :page="pagination.page" :limite="pagination.limite" :total="pagination.total" @update:page="changerPage" @update:limite="changerLimite" />
    </div>

    <!-- Nouveau produit -->
    <el-dialog title="Nouveau produit en stock" :visible.sync="dialogueProduit" width="480px" :close-on-click-modal="false">
      <el-form :model="formProduit" label-position="top" @submit.native.prevent>
        <el-form-item label="Nom du produit" required>
          <el-input v-model="formProduit.nom" placeholder="Ex : Bracelet Étoile" />
        </el-form-item>
        <div class="deux-colonnes">
          <el-form-item label="Couleur / matière"><el-input v-model="formProduit.couleur" placeholder="Ex : Or rose" /></el-form-item>
          <el-form-item label="Référence"><el-input v-model="formProduit.reference" placeholder="Facultatif" /></el-form-item>
        </div>
        <div class="deux-colonnes">
          <el-form-item label="Quantité en stock au départ"><el-input-number v-model="formProduit.quantite_initiale" :min="0" :precision="0" style="width: 100%" /></el-form-item>
          <el-form-item label="Alerte stock bas à">
            <el-input-number v-model="formProduit.seuil_alerte" :min="0" :precision="0" style="width: 100%" />
          </el-form-item>
        </div>
        <p class="sanaa-text-muted aide">L'alerte « stock bas » s'affiche quand il reste ce nombre de pièces ou moins (0 = pas d'alerte avant la rupture).</p>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogueProduit = false">Annuler</el-button>
        <el-button type="primary" :loading="enregistrement" @click="creerProduit">Ajouter le produit</el-button>
      </span>
    </el-dialog>

    <!-- Modifier produit -->
    <el-dialog title="Modifier le produit" :visible.sync="dialogueEdition" width="480px" :close-on-click-modal="false">
      <el-form :model="formEdition" label-position="top" @submit.native.prevent>
        <el-form-item label="Nom du produit" required><el-input v-model="formEdition.nom" /></el-form-item>
        <div class="deux-colonnes">
          <el-form-item label="Couleur / matière"><el-input v-model="formEdition.couleur" /></el-form-item>
          <el-form-item label="Référence"><el-input v-model="formEdition.reference" /></el-form-item>
        </div>
        <el-form-item label="Alerte stock bas à"><el-input-number v-model="formEdition.seuil_alerte" :min="0" :precision="0" /></el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogueEdition = false">Annuler</el-button>
        <el-button type="primary" :loading="enregistrement" @click="sauvegarderEdition">Enregistrer</el-button>
      </span>
    </el-dialog>

    <!-- Mouvement -->
    <el-dialog title="Mouvement de stock" :visible.sync="dialogueMouvement" width="480px" :close-on-click-modal="false">
      <el-form :model="formMouvement" label-position="top" @submit.native.prevent>
        <el-form-item label="Produit" required>
          <el-select v-model="formMouvement.article_id" filterable style="width: 100%" placeholder="Choisir un produit">
            <el-option v-for="a in articlesActifs" :key="a._id" :value="a._id" :label="`${libelleArticle(a)} — ${a.quantite} en stock`" />
          </el-select>
        </el-form-item>
        <el-form-item label="Type de mouvement" required>
          <el-radio-group v-model="formMouvement.type" size="small" class="types">
            <el-radio-button v-for="cle in TYPES_SAISIE" :key="cle" :label="cle">{{ TYPES[cle].court }}</el-radio-button>
          </el-radio-group>
          <p class="sanaa-text-muted aide">{{ TYPES[formMouvement.type].aide }}</p>
        </el-form-item>
        <el-form-item v-if="formMouvement.type !== 'ajustement'" label="Quantité" required>
          <el-input-number v-model="formMouvement.quantite" :min="1" :precision="0" style="width: 100%" />
        </el-form-item>
        <el-form-item v-else label="Quantité réellement comptée" required>
          <el-input-number v-model="formMouvement.quantite_constatee" :min="0" :precision="0" style="width: 100%" />
        </el-form-item>
        <p v-if="articleChoisi" class="apercu">
          Stock actuel : <strong>{{ articleChoisi.quantite }}</strong>
          → après : <strong :class="{ 'qte-moins': stockApres < 0 }">{{ stockApres }}</strong>
          <span v-if="stockApres < 0" class="qte-moins"> (stock insuffisant)</span>
        </p>
        <div class="deux-colonnes">
          <el-form-item label="Date"><el-date-picker v-model="formMouvement.date" type="date" value-format="yyyy-MM-dd" :clearable="false" style="width: 100%" /></el-form-item>
        </div>
        <el-form-item label="Note (facultatif)">
          <el-input v-model="formMouvement.commentaire" type="textarea" :rows="2" :placeholder="TYPES[formMouvement.type].exemple" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogueMouvement = false">Annuler</el-button>
        <el-button type="primary" :loading="enregistrement" :disabled="stockApres < 0 || !formMouvement.article_id" @click="enregistrerMouvement">Enregistrer</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import stockApi from '@/services/stock.api';
import PaginationBarre from '@/components/common/PaginationBarre.vue';

const aujourdhui = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Libellés, couleurs (classes de badge existantes) et aides de chaque type de mouvement.
const TYPES = {
  creation: { libelle: 'Stock de départ', court: 'Départ', classe: 'is-livree' },
  entree: {
    libelle: 'Entrée', court: 'Entrée (achat)', classe: 'is-livree',
    aide: 'Des bijoux arrivent en stock : nouvelle commande fournisseur, réassort.', exemple: 'Ex : commande fournisseur du 25/10',
  },
  sortie: {
    libelle: 'Sortie (vente)', court: 'Sortie (vente)', classe: 'is-retour-echec',
    aide: 'Un bijou part en livraison ou est vendu : retiré du stock.', exemple: 'Ex : commande Shopify C8052, livré le jour même',
  },
  retour: {
    libelle: 'Retour', court: 'Retour', classe: 'is-en-fabrication',
    aide: 'Un bijou revient en stock (non livré, client refusé…) : remis dans le stock.', exemple: 'Ex : client injoignable, bijou rapporté',
  },
  ajustement: {
    libelle: 'Inventaire', court: 'Inventaire', classe: 'is-a-expedier',
    aide: 'Vous avez recompté : indiquez la quantité réellement présente, l\'écart est calculé.', exemple: 'Ex : recomptage de fin de mois',
  },
};

export default {
  name: 'Stock',
  components: { PaginationBarre },
  data() {
    return {
      TYPES,
      TYPES_SAISIE: ['entree', 'sortie', 'retour', 'ajustement'],
      chargementArticles: false,
      chargementMouvements: false,
      enregistrement: false,
      articles: [],
      resume: { articles: 0, pieces: 0, bas: 0, rupture: 0 },
      recherche: '',
      afficherArchives: false,
      minuterie: null,
      mouvements: [],
      pagination: { page: 1, limite: 20, total: 0 },
      filtres: { article_id: '', type: '', plage: [], annules: false },
      dialogueProduit: false,
      formProduit: { nom: '', couleur: '', reference: '', quantite_initiale: 1, seuil_alerte: 2 },
      dialogueEdition: false,
      formEdition: { id: '', nom: '', couleur: '', reference: '', seuil_alerte: 0 },
      dialogueMouvement: false,
      formMouvement: { article_id: '', type: 'sortie', quantite: 1, quantite_constatee: 0, date: aujourdhui(), commentaire: '' },
    };
  },
  computed: {
    ...mapState('paysContexte', { paysActifId: 'paysActifId' }),
    articlesActifs() {
      return this.articles.filter((a) => a.actif);
    },
    articleChoisi() {
      return this.articles.find((a) => a._id === this.formMouvement.article_id) || null;
    },
    stockApres() {
      const a = this.articleChoisi;
      if (!a) return 0;
      const f = this.formMouvement;
      if (f.type === 'ajustement') return Number(f.quantite_constatee) || 0;
      const q = Number(f.quantite) || 0;
      return f.type === 'sortie' ? a.quantite - q : a.quantite + q;
    },
  },
  watch: {
    paysActifId() {
      this.filtres.article_id = '';
      this.chargerTout();
    },
  },
  mounted() {
    this.chargerTout();
  },
  beforeDestroy() {
    clearTimeout(this.minuterie);
  },
  methods: {
    libelleArticle(a) {
      return [a.nom, a.couleur].filter(Boolean).join(' · ');
    },
    classeStock(a) {
      return { rupture: 'is-retour-echec', bas: 'is-en-livraison', ok: 'is-livree' }[a.statut_stock] || '';
    },
    classeLigne({ row }) {
      return row.statut_stock === 'rupture' && row.actif ? 'ligne-retard' : row.statut_stock === 'bas' && row.actif ? 'ligne-attention' : '';
    },
    classeCarte(a) {
      return a.actif && a.statut_stock === 'rupture' ? 'carte-article--rupture' : a.actif && a.statut_stock === 'bas' ? 'carte-article--bas' : '';
    },
    chargerTout() {
      this.pagination.page = 1;
      this.chargerArticles();
      this.chargerMouvements();
    },
    rechercherDiffere() {
      clearTimeout(this.minuterie);
      this.minuterie = setTimeout(this.chargerArticles, 350);
    },
    async chargerArticles() {
      clearTimeout(this.minuterie);
      this.chargementArticles = true;
      try {
        const { data } = await stockApi.articles({
          pays_id: this.paysActifId || undefined,
          q: this.recherche ? this.recherche.trim() : undefined,
          inactifs: this.afficherArchives ? 'true' : undefined,
        });
        this.articles = data.data.items;
        this.resume = data.data.resume;
      } catch (e) {
        this.$store.dispatch('notifications/erreur', 'Impossible de charger le stock.');
      } finally {
        this.chargementArticles = false;
      }
    },
    filtrerMouvements() {
      this.pagination.page = 1;
      this.chargerMouvements();
    },
    async chargerMouvements() {
      this.chargementMouvements = true;
      const [date_de, date_a] = this.filtres.plage && this.filtres.plage.length ? this.filtres.plage : [undefined, undefined];
      try {
        const { data } = await stockApi.mouvements({
          pays_id: this.paysActifId || undefined,
          article_id: this.filtres.article_id || undefined,
          type: this.filtres.type || undefined,
          annules: this.filtres.annules ? 'true' : undefined,
          date_de,
          date_a,
          page: this.pagination.page,
          limite: this.pagination.limite,
        });
        this.mouvements = data.data;
        this.pagination.total = data.meta.total;
      } catch (e) {
        this.$store.dispatch('notifications/erreur', 'Impossible de charger les mouvements.');
      } finally {
        this.chargementMouvements = false;
      }
    },
    changerPage(page) {
      this.pagination.page = page;
      this.chargerMouvements();
    },
    changerLimite(limite) {
      this.pagination.limite = limite;
      this.pagination.page = 1;
      this.chargerMouvements();
    },
    messageErreur(err, defaut) {
      return (err.response && err.response.data && err.response.data.error && err.response.data.error.message) || defaut;
    },
    ouvrirNouveauProduit() {
      this.formProduit = { nom: '', couleur: '', reference: '', quantite_initiale: 1, seuil_alerte: 2 };
      this.dialogueProduit = true;
    },
    async creerProduit() {
      if (!this.formProduit.nom.trim()) {
        this.$store.dispatch('notifications/erreur', 'Indiquez le nom du produit.');
        return;
      }
      this.enregistrement = true;
      try {
        await stockApi.creerArticle({ ...this.formProduit, pays_id: this.paysActifId });
        this.$store.dispatch('notifications/succes', 'Produit ajouté au stock.');
        this.dialogueProduit = false;
        this.chargerTout();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', this.messageErreur(err, 'Échec de l\'ajout du produit'));
      } finally {
        this.enregistrement = false;
      }
    },
    ouvrirMouvement(article, type) {
      const choisi = article && article._id ? article : null;
      this.formMouvement = {
        article_id: choisi ? choisi._id : (this.articlesActifs.length === 1 ? this.articlesActifs[0]._id : ''),
        type: type || 'sortie',
        quantite: 1,
        quantite_constatee: choisi ? choisi.quantite : 0,
        date: aujourdhui(),
        commentaire: '',
      };
      this.dialogueMouvement = true;
    },
    async enregistrerMouvement() {
      const f = this.formMouvement;
      this.enregistrement = true;
      try {
        const { data } = await stockApi.enregistrerMouvement({
          article_id: f.article_id,
          type: f.type,
          quantite: f.type === 'ajustement' ? undefined : f.quantite,
          quantite_constatee: f.type === 'ajustement' ? f.quantite_constatee : undefined,
          date: f.date,
          commentaire: f.commentaire || undefined,
        });
        const a = data.data.article;
        const faits = { entree: 'Entrée enregistrée', sortie: 'Sortie enregistrée', retour: 'Retour enregistré', ajustement: 'Inventaire enregistré' };
        this.$store.dispatch('notifications/succes', `${faits[f.type]} : « ${a.nom} » → ${a.quantite} en stock.`);
        this.dialogueMouvement = false;
        this.chargerArticles();
        this.chargerMouvements();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', this.messageErreur(err, 'Échec de l\'enregistrement'));
      } finally {
        this.enregistrement = false;
      }
    },
    async annuler(mouvement) {
      try {
        await stockApi.annulerMouvement(mouvement._id);
        this.$store.dispatch('notifications/succes', 'Mouvement annulé.');
        this.chargerArticles();
        this.chargerMouvements();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', this.messageErreur(err, 'Annulation impossible'));
      }
    },
    actionLigne(commande, article) {
      if (commande === 'historique') {
        this.filtres.article_id = article._id;
        this.filtrerMouvements();
        this.$nextTick(() => this.$refs.journal && this.$refs.journal.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      } else if (commande === 'inventaire') {
        this.ouvrirMouvement(article, 'ajustement');
      } else if (commande === 'modifier') {
        this.formEdition = {
          id: article._id, nom: article.nom, couleur: article.couleur || '', reference: article.reference || '', seuil_alerte: article.seuil_alerte || 0,
        };
        this.dialogueEdition = true;
      } else if (commande === 'archiver') {
        this.basculerArchive(article);
      }
    },
    async sauvegarderEdition() {
      const f = this.formEdition;
      if (!f.nom.trim()) {
        this.$store.dispatch('notifications/erreur', 'Indiquez le nom du produit.');
        return;
      }
      this.enregistrement = true;
      try {
        await stockApi.modifierArticle(f.id, { nom: f.nom, couleur: f.couleur, reference: f.reference, seuil_alerte: f.seuil_alerte });
        this.$store.dispatch('notifications/succes', 'Produit modifié.');
        this.dialogueEdition = false;
        this.chargerArticles();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', this.messageErreur(err, 'Échec de la modification'));
      } finally {
        this.enregistrement = false;
      }
    },
    async basculerArchive(article) {
      try {
        if (article.actif) {
          await this.$confirm(`Archiver « ${article.nom} » ? Il disparaît de la liste et ne peut plus recevoir de mouvement (l'historique est conservé).`, 'Archiver le produit', {
            confirmButtonText: 'Archiver', cancelButtonText: 'Annuler', type: 'warning',
          });
        }
      } catch (e) {
        return;
      }
      try {
        await stockApi.modifierArticle(article._id, { actif: !article.actif });
        this.chargerArticles();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', this.messageErreur(err, 'Échec'));
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.entete-sous { margin: 4px 0 0; max-width: 620px; font-size: 0.85rem; }
.entete-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.resume {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  @media (max-width: 700px) { grid-template-columns: repeat(2, 1fr); }
  .is-alerte .sanaa-kpi-value { color: var(--sanaa-warning); }
  .is-danger .sanaa-kpi-value { color: var(--sanaa-danger); }
}
.recherche { width: 340px; max-width: 100%; }
.detail-produit { font-size: 0.8rem; }
.archive-tag { margin-left: 8px; font-size: 0.7rem; padding: 1px 8px; border-radius: 999px; background: var(--sanaa-bg-alt); color: var(--sanaa-text-muted); }
.sanaa-section-title { font-size: 1.1rem; margin: 28px 0 12px; }
.btn-entree { color: var(--sanaa-success); border-color: var(--sanaa-success); }
.btn-sortie { color: var(--sanaa-danger); border-color: var(--sanaa-danger); }
.btn-retour { color: #2c5d99; border-color: #2c5d99; }
.qte-plus { color: var(--sanaa-success); }
.qte-moins { color: var(--sanaa-danger); }
.el-table ::v-deep .mouvement-annule td { opacity: 0.45; text-decoration: line-through; }
.types { display: flex; flex-wrap: wrap; }
.aide { margin: 6px 0 0; font-size: 0.8rem; line-height: 1.4; }
.apercu { margin: 0 0 14px; font-size: 0.9rem; }
.deux-colonnes { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; @media (max-width: 520px) { grid-template-columns: 1fr; } }
.gros { font-size: 1rem; padding: 4px 14px; }
.carte-article {
  margin-bottom: 10px;
  padding: 12px 14px;
  border-left: 4px solid transparent;
  &--rupture { border-left-color: var(--sanaa-danger); }
  &--bas { border-left-color: var(--sanaa-warning); }
}
.carte-article__tete { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.carte-article__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
</style>
