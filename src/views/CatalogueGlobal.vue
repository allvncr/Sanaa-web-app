<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Catalogue global</h1>
      <div style="display:flex; gap:8px;">
        <el-button icon="el-icon-collection-tag" v-can="'catalogue:modifier'" @click="dialogueCollections = true">
          Gérer les collections
        </el-button>
        <el-button type="primary" icon="el-icon-plus" v-can="'catalogue:creer'" @click="dialogueProduit = true">Nouveau produit</el-button>
      </div>
    </div>

    <div class="sanaa-toolbar">
      <el-input v-model="recherche" placeholder="Rechercher un produit" prefix-icon="el-icon-search" style="max-width:260px" @input="charger" />
      <el-select v-model="filtreCategorie" placeholder="Collection" clearable size="small" style="width:180px" @change="charger">
        <el-option v-for="c in categories" :key="c._id" :value="c._id" :label="c.nom" />
      </el-select>
    </div>

    <div class="sanaa-grid sanaa-grid--produits" v-loading="chargement">
      <div v-for="p in produits" :key="p._id" class="sanaa-card produit-card" @click="ouvrir(p)">
        <h3>{{ p.nom }}</h3>
        <p class="produit-card__zh" :class="{ 'is-manquant': !p.nom_zh }">
          {{ p.nom_zh || 'Nom chinois manquant' }}
        </p>
        <p class="produit-card__sku">{{ p.reference_sku || '—' }}</p>
        <p class="produit-card__variantes">{{ p.variantes.length }} variante(s)</p>
        <p class="produit-card__categorie" v-if="p.categorie_id">{{ p.categorie_id.nom }}</p>
      </div>
      <p v-if="!chargement && produits.length === 0" class="sanaa-empty">Aucun produit.</p>
    </div>

    <el-dialog title="Nouveau produit" :visible.sync="dialogueProduit" width="480px">
      <el-form :model="nouveauProduit" label-position="top">
        <el-form-item label="Nom (français)" required><el-input v-model="nouveauProduit.nom" /></el-form-item>
        <el-form-item label="Nom (chinois)" required>
          <el-input v-model="nouveauProduit.nom_zh" placeholder="名字戒指" />
        </el-form-item>
        <p class="sanaa-text-muted" style="margin-top:-10px">
          Utilisé comme nom de modèle dans les exports usine, qui ne travaillent qu'en chinois.
        </p>
        <el-form-item label="Collection">
          <el-select v-model="nouveauProduit.categorie_id" style="width:100%">
            <el-option v-for="c in categories" :key="c._id" :value="c._id" :label="c.nom" />
          </el-select>
        </el-form-item>
        <el-form-item label="Référence SKU"><el-input v-model="nouveauProduit.reference_sku" /></el-form-item>
        <el-form-item label="Nombre maximal de prénoms">
          <el-input-number v-model="nouveauProduit.nb_prenoms_max" :min="1" :max="9" style="width:100%" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogueProduit = false">Annuler</el-button>
        <el-button type="primary" @click="creerProduit">Créer</el-button>
      </span>
    </el-dialog>

    <el-dialog title="Gérer les collections" :visible.sync="dialogueCollections" width="480px">
      <div class="collections-liste">
        <div v-for="c in categories" :key="c._id" class="collections-liste__item">
          <el-input v-if="collectionEnEdition === c._id" v-model="nomCollectionEdite" size="small" @keyup.enter.native="validerRenommer(c)" />
          <span v-else>{{ c.nom }}</span>
          <div class="collections-liste__actions">
            <template v-if="collectionEnEdition === c._id">
              <el-button size="mini" type="primary" icon="el-icon-check" circle @click="validerRenommer(c)" />
              <el-button size="mini" icon="el-icon-close" circle @click="collectionEnEdition = null" />
            </template>
            <template v-else>
              <el-button size="mini" icon="el-icon-edit" circle @click="commencerRenommer(c)" />
              <el-button size="mini" icon="el-icon-delete" circle @click="supprimerCollection(c)" />
            </template>
          </div>
        </div>
        <p v-if="categories.length === 0" class="sanaa-empty">Aucune collection.</p>
      </div>
      <div class="sanaa-toolbar" style="margin-top:14px">
        <el-input v-model="nouvelleCollection" placeholder="Nouvelle collection" size="small" style="width:240px" @keyup.enter.native="creerCollection" />
        <el-button size="small" type="primary" icon="el-icon-plus" @click="creerCollection">Ajouter</el-button>
      </div>
      <span slot="footer">
        <el-button @click="dialogueCollections = false">Fermer</el-button>
      </span>
    </el-dialog>

    <el-dialog :title="produitActuel ? produitActuel.nom : ''" :visible.sync="dialogueDetail" width="620px">
      <template v-if="produitActuel">
        <h4 style="margin-top:0">Noms du modèle</h4>
        <div class="sanaa-grid sanaa-grid--noms">
          <el-form-item label="Nom (français)">
            <el-input v-model="produitEnEdition.nom" size="small" />
          </el-form-item>
          <el-form-item label="Nom (chinois) — utilisé sur les exports usine">
            <el-input v-model="produitEnEdition.nom_zh" size="small" placeholder="名字戒指" />
          </el-form-item>
        </div>
        <el-button size="small" type="primary" @click="enregistrerNoms">Enregistrer les noms</el-button>

        <h4>Variantes</h4>
        <div v-for="v in produitActuel.variantes" :key="v._id" class="variante-row">
          <el-tag>{{ v.couleur || 'Standard' }}</el-tag>
          <span :class="{ 'is-manquant': !v.couleur_zh }">{{ v.couleur_zh || 'Couleur chinoise manquante' }}</span>
          <span class="sanaa-text-muted">{{ v.prix_pays.length }} prix pays configuré(s)</span>
        </div>
        <div class="sanaa-grid sanaa-grid--nouvelle-variante" style="margin-top:10px">
          <el-input v-model="nouvelleCouleur" placeholder="Couleur (français)" size="small" />
          <el-input v-model="nouvelleCouleurZh" placeholder="Couleur (chinois)" size="small" />
          <el-button size="small" icon="el-icon-plus" @click="ajouterVariante">Ajouter la variante</el-button>
        </div>
      </template>
      <span slot="footer">
        <el-button @click="dialogueDetail = false">Fermer</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import catalogueApi from '@/services/catalogue.api';

export default {
  name: 'CatalogueGlobal',
  data() {
    return {
      chargement: false,
      produits: [],
      categories: [],
      recherche: '',
      filtreCategorie: '',
      dialogueProduit: false,
      nouveauProduit: { nom: '', nom_zh: '', categorie_id: '', reference_sku: '', nb_prenoms_max: 1 },
      dialogueDetail: false,
      produitActuel: null,
      produitEnEdition: { nom: '', nom_zh: '' },
      nouvelleCouleur: '',
      nouvelleCouleurZh: '',
      dialogueCollections: false,
      nouvelleCollection: '',
      collectionEnEdition: null,
      nomCollectionEdite: '',
    };
  },
  async mounted() {
    const { data } = await catalogueApi.listerCategories();
    this.categories = data.data;
    this.charger();
  },
  methods: {
    async charger() {
      this.chargement = true;
      try {
        const { data } = await catalogueApi.listerProduits({ q: this.recherche || undefined, categorie_id: this.filtreCategorie || undefined });
        this.produits = data.data;
      } finally {
        this.chargement = false;
      }
    },
    async creerProduit() {
      try {
        const payload = { ...this.nouveauProduit };
        if (!payload.categorie_id) delete payload.categorie_id;
        if (!payload.reference_sku) delete payload.reference_sku;
        await catalogueApi.creerProduit(payload);
        this.$store.dispatch('notifications/succes', 'Produit créé.');
        this.dialogueProduit = false;
        this.nouveauProduit = { nom: '', nom_zh: '', categorie_id: '', reference_sku: '', nb_prenoms_max: 1 };
        this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de la création');
      }
    },
    async ouvrir(p) {
      const { data } = await catalogueApi.obtenirProduit(p._id);
      this.produitActuel = data.data;
      this.produitEnEdition = { nom: data.data.nom, nom_zh: data.data.nom_zh || '' };
      this.dialogueDetail = true;
    },
    async enregistrerNoms() {
      try {
        await catalogueApi.modifierProduit(this.produitActuel._id, this.produitEnEdition);
        this.$store.dispatch('notifications/succes', 'Noms enregistrés.');
        const { data } = await catalogueApi.obtenirProduit(this.produitActuel._id);
        this.produitActuel = data.data;
        this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de l’enregistrement');
      }
    },
    async ajouterVariante() {
      if (!this.nouvelleCouleur) return;
      const { data } = await catalogueApi.ajouterVariante(this.produitActuel._id, {
        couleur: this.nouvelleCouleur,
        couleur_zh: this.nouvelleCouleurZh,
      });
      this.produitActuel = data.data;
      this.nouvelleCouleur = '';
      this.nouvelleCouleurZh = '';
      this.charger();
    },
    async rechargerCategories() {
      const { data } = await catalogueApi.listerCategories();
      this.categories = data.data;
    },
    async creerCollection() {
      if (!this.nouvelleCollection) return;
      try {
        await catalogueApi.creerCategorie({ nom: this.nouvelleCollection });
        this.nouvelleCollection = '';
        await this.rechargerCategories();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de la création');
      }
    },
    commencerRenommer(c) {
      this.collectionEnEdition = c._id;
      this.nomCollectionEdite = c.nom;
    },
    async validerRenommer(c) {
      try {
        await catalogueApi.modifierCategorie(c._id, { nom: this.nomCollectionEdite });
        this.collectionEnEdition = null;
        await this.rechargerCategories();
        this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de la modification');
      }
    },
    async supprimerCollection(c) {
      try {
        await this.$confirm(`Supprimer la collection « ${c.nom} » ?`, 'Confirmation', { type: 'warning' });
      } catch (e) {
        return;
      }
      try {
        await catalogueApi.supprimerCategorie(c._id);
        this.$store.dispatch('notifications/succes', 'Collection supprimée.');
        await this.rechargerCategories();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Suppression impossible');
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.sanaa-grid--produits { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
.produit-card { cursor: pointer; &:hover { border-color: var(--sanaa-accent-2); } }
.produit-card__zh { font-size: 0.85rem; margin: 2px 0; color: var(--sanaa-text); }
.produit-card__sku { color: var(--sanaa-text-muted); font-size: 0.8rem; margin: 4px 0; }
.is-manquant { color: var(--sanaa-warning); font-style: italic; }
.sanaa-grid--noms { grid-template-columns: 1fr 1fr; gap: 10px; }
.sanaa-grid--nouvelle-variante { grid-template-columns: 1fr 1fr auto; gap: 8px; align-items: center; }
@media (max-width: 560px) {
  .sanaa-grid--noms, .sanaa-grid--nouvelle-variante { grid-template-columns: 1fr; }
}
.produit-card__variantes { font-size: 0.85rem; }
.produit-card__categorie {
  display: inline-block;
  margin-top: 6px;
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--sanaa-accent-1-soft);
  color: var(--sanaa-accent-2-dark);
}
.variante-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
.collections-liste { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; }
.collections-liste__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
  border-bottom: 1px solid var(--sanaa-border);
}
.collections-liste__actions { display: flex; gap: 6px; flex-shrink: 0; }
</style>
