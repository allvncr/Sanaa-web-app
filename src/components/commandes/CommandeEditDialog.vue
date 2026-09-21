<template>
  <el-dialog
    :title="`Modifier la commande ${commande ? commande.numero : ''}`"
    :visible="visible"
    width="820px"
    top="4vh"
    append-to-body
    :close-on-click-modal="false"
    @update:visible="(v) => $emit('update:visible', v)"
    @open="initialiser"
    @closed="form = null"
  >
    <el-form v-if="form" :model="form" label-position="top" @submit.native.prevent>
      <h4 class="bloc-titre">Client</h4>
      <div class="sanaa-grid sanaa-grid--form">
        <el-form-item label="Nom">
          <el-input v-model="form.client.nom" />
        </el-form-item>
        <el-form-item label="Téléphone">
          <el-input v-model="form.client.telephone_whatsapp" />
        </el-form-item>
        <el-form-item label="Adresse">
          <el-input v-model="form.client.adresse" />
        </el-form-item>
        <el-form-item label="Canal d'acquisition">
          <el-select v-model="form.canal_vente" style="width:100%">
            <el-option label="WhatsApp" value="WhatsApp" />
            <el-option label="Site web" value="Site web" />
          </el-select>
        </el-form-item>
      </div>
      <p class="sanaa-text-muted aide">
        <template v-if="telephoneModifie">
          Un autre numéro rattache la commande à un autre client (retrouvé par ce numéro, ou créé).
        </template>
        <template v-else>
          Le nom et l'adresse sont ceux du client : ils changent aussi pour ses autres commandes.
        </template>
      </p>

      <div class="bloc-entete">
        <h4 class="bloc-titre">Produits</h4>
        <el-button v-if="lignesEditables" size="mini" icon="el-icon-plus" @click="ajouterLigne">Ajouter un produit</el-button>
      </div>
      <el-alert
        v-if="!lignesEditables"
        type="info"
        :closable="false"
        show-icon
        title="Les produits d'une commande annulée ou refusée ne sont plus modifiables."
        style="margin-bottom:12px"
      />

      <div v-for="(ligne, index) in form.lignes" :key="ligne.cle" class="ligne-commande">
        <div class="sanaa-grid sanaa-grid--ligne">
          <el-form-item label="Produit">
            <el-select
              v-model="ligne.produit_id"
              filterable
              :disabled="!lignesEditables"
              style="width:100%"
              @change="() => onChangeProduit(ligne)"
            >
              <el-option v-for="p in optionsProduits" :key="p._id" :value="p._id" :label="p.nom" />
            </el-select>
          </el-form-item>
          <el-form-item label="Variante">
            <el-select
              v-model="ligne.variante_id"
              :disabled="!lignesEditables"
              style="width:100%"
              @change="() => onChangeVariante(ligne)"
            >
              <el-option
                v-for="v in variantesDisponibles(ligne)"
                :key="v._id"
                :value="v._id"
                :label="v.couleur || 'Standard'"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="Quantité">
            <el-input-number v-model="ligne.quantite" :min="1" :disabled="!lignesEditables" style="width:100%" />
          </el-form-item>
          <el-form-item label="Précision modèle">
            <el-input v-model="ligne.detail_variante" placeholder="ex. mois, cheville..." />
          </el-form-item>
        </div>

        <el-form-item label="Prénom(s) / personnalisation à graver">
          <div class="personnalisation-liste">
            <div v-for="(p, i) in ligne.personnalisation" :key="i" class="personnalisation-item">
              <el-input v-model="p.texte" placeholder="Prénom / texte" size="small" />
              <el-input v-model="p.police" placeholder="Police" size="small" style="width:120px" />
              <el-button icon="el-icon-close" circle size="mini" @click="ligne.personnalisation.splice(i, 1)" />
            </div>
            <el-button size="mini" icon="el-icon-plus" @click="ligne.personnalisation.push({ texte: '', police: '' })">
              Ajouter un prénom
            </el-button>
          </div>
        </el-form-item>

        <div class="ligne-commande__pied">
          <span>
            <span class="sanaa-text-muted">Prix unitaire {{ ligne.prixUnitaire ? formaterMontant(ligne.prixUnitaire) : '—' }}
              <template v-if="ligne.prixFige">(prix figé à la commande)</template>
              <template v-else-if="ligne.prixUnitaire">(prix catalogue actuel)</template>
              — </span>
            Sous-total : <strong>{{ sousTotal(ligne) | montant }}</strong>
          </span>
          <el-button
            v-if="lignesEditables && form.lignes.length > 1"
            type="text"
            icon="el-icon-delete"
            @click="form.lignes.splice(index, 1)"
          >
            Retirer la ligne
          </el-button>
        </div>
      </div>

      <div class="sanaa-grid sanaa-grid--form">
        <el-form-item label="Réduction sur le total">
          <el-input-number v-model="form.reduction" :min="0" style="width:100%" />
        </el-form-item>
        <el-form-item label="Commentaires">
          <el-input v-model="form.commentaires" type="textarea" :rows="2" />
        </el-form-item>
      </div>

      <div class="total-barre">
        Total : <strong>{{ total | montant }}</strong>
        <template v-if="form.reduction > 0"> — Réduction : -{{ form.reduction | montant }} — Net :
          <strong>{{ (total - form.reduction) | montant }}</strong>
        </template>
      </div>
    </el-form>

    <span slot="footer">
      <el-button @click="$emit('update:visible', false)">Annuler</el-button>
      <el-button type="primary" :loading="enregistrement" @click="enregistrer">Enregistrer les modifications</el-button>
    </span>
  </el-dialog>
</template>

<script>
import { mapState } from 'vuex';
import catalogueApi from '@/services/catalogue.api';
import commandesApi from '@/services/commandes.api';
import { formaterMontant } from '@/utils/format';

const idDe = (v) => (v && typeof v === 'object' ? v._id : v);
const nombre = (v) => Number((v && v.$numberDecimal) || v || 0);

export default {
  name: 'CommandeEditDialog',
  props: {
    visible: { type: Boolean, default: false },
    commande: { type: Object, default: null },
  },
  data() {
    return { form: null, enregistrement: false };
  },
  computed: {
    ...mapState('catalogue', ['produits']),
    lignesEditables() {
      return this.commande && !['Annulee', 'Refusee'].includes(this.commande.statut_commande);
    },
    telephoneModifie() {
      const actuel = (this.commande && this.commande.client_id && this.commande.client_id.telephone_whatsapp) || '';
      return this.form && (this.form.client.telephone_whatsapp || '').trim() !== actuel;
    },
    // Catalogue actif + produits déjà présents sur la commande (ex. produit désactivé depuis).
    optionsProduits() {
      const liste = [...this.produits];
      if (this.commande) {
        for (const l of this.commande.lignes) {
          const id = idDe(l.produit_id);
          if (!liste.some((p) => p._id === id)) {
            liste.push({ _id: id, nom: (l.produit_id && l.produit_id.nom) || 'Produit (retiré du catalogue)', variantes: [] });
          }
        }
      }
      return liste;
    },
    total() {
      return this.form ? this.form.lignes.reduce((acc, l) => acc + this.sousTotal(l), 0) : 0;
    },
  },
  methods: {
    formaterMontant,
    sousTotal(ligne) {
      return (Number(ligne.prixUnitaire) || 0) * (ligne.quantite || 1);
    },
    async initialiser() {
      await this.$store.dispatch('catalogue/charger');
      const c = this.commande;
      const client = c.client_id || {};
      this.form = {
        client: {
          nom: client.nom || '',
          telephone_whatsapp: client.telephone_whatsapp || '',
          adresse: client.adresse || '',
        },
        canal_vente: c.canal_vente || 'Site web',
        reduction: nombre(c.reduction),
        commentaires: c.commentaires || '',
        lignes: c.lignes.map((l) => ({
          cle: l._id,
          _id: l._id,
          produit_id: idDe(l.produit_id),
          variante_id: l.variante_id,
          couleur_choisie: l.couleur_choisie || '',
          detail_variante: l.detail_variante || '',
          personnalisation: (l.personnalisation || []).map((p) => ({ texte: p.texte || '', police: p.police || '' })),
          quantite: l.quantite,
          prixUnitaire: nombre(l.prix_unitaire_applique),
          prixFige: true,
          origine: { produit_id: idDe(l.produit_id), variante_id: l.variante_id, couleur: l.couleur_choisie },
        })),
      };
    },
    variantesDisponibles(ligne) {
      const produit = this.produits.find((p) => p._id === ligne.produit_id);
      const variantes = produit ? [...produit.variantes] : [];
      // Variante d'origine d'un produit sorti du catalogue actif : on la garde sélectionnable.
      const o = ligne.origine;
      if (o && o.produit_id === ligne.produit_id && !variantes.some((v) => v._id === o.variante_id)) {
        variantes.push({ _id: o.variante_id, couleur: o.couleur });
      }
      return variantes;
    },
    ajouterLigne() {
      this.form.lignes.push({
        cle: Math.random().toString(36).slice(2),
        produit_id: '',
        variante_id: '',
        couleur_choisie: '',
        detail_variante: '',
        personnalisation: [{ texte: '', police: '' }],
        quantite: 1,
        prixUnitaire: 0,
        prixFige: false,
        origine: null,
      });
    },
    onChangeProduit(ligne) {
      ligne.variante_id = '';
      ligne.prixUnitaire = 0;
      ligne.prixFige = false;
    },
    async onChangeVariante(ligne) {
      const o = ligne.origine;
      // Retour à la variante d'origine : on retrouve le prix figé de la commande.
      if (o && o.produit_id === ligne.produit_id && o.variante_id === ligne.variante_id) {
        const initiale = this.commande.lignes.find((l) => l._id === ligne._id);
        ligne.prixUnitaire = nombre(initiale.prix_unitaire_applique);
        ligne.prixFige = true;
        ligne.couleur_choisie = o.couleur;
        return;
      }
      const produit = this.produits.find((p) => p._id === ligne.produit_id);
      const variante = produit ? produit.variantes.find((v) => v._id === ligne.variante_id) : null;
      ligne.couleur_choisie = variante ? variante.couleur : '';
      ligne.prixFige = false;
      try {
        const { data } = await catalogueApi.prixEffectif(ligne.produit_id, ligne.variante_id, idDe(this.commande.pays_id));
        ligne.prixUnitaire = data.data ? nombre(data.data.prix) : 0;
      } catch (e) {
        ligne.prixUnitaire = 0;
      }
    },
    async enregistrer() {
      const f = this.form;
      if (this.lignesEditables && f.lignes.some((l) => !l.produit_id || !l.variante_id)) {
        this.$store.dispatch('notifications/erreur', 'Chaque ligne doit avoir un produit et une variante.');
        return;
      }
      if (this.lignesEditables && f.lignes.some((l) => !l.prixUnitaire)) {
        this.$store.dispatch('notifications/erreur', 'Une ligne n\'a aucun prix actif dans ce pays.');
        return;
      }
      if (f.reduction > this.total) {
        this.$store.dispatch('notifications/erreur', 'La réduction ne peut pas dépasser le total.');
        return;
      }

      const payload = {
        client: { ...f.client },
        canal_vente: f.canal_vente,
        commentaires: f.commentaires,
        reduction: f.reduction || 0,
      };
      if (this.lignesEditables) {
        payload.lignes = f.lignes.map((l) => ({
          ...(l._id ? { _id: l._id } : {}),
          produit_id: l.produit_id,
          variante_id: l.variante_id,
          couleur_choisie: l.couleur_choisie,
          detail_variante: l.detail_variante || undefined,
          personnalisation: l.personnalisation.filter((p) => p.texte && p.texte.trim()),
          quantite: l.quantite,
        }));
      }

      this.enregistrement = true;
      try {
        await commandesApi.modifier(this.commande._id, payload);
        this.$store.dispatch('notifications/succes', 'Commande modifiée.');
        this.$emit('update:visible', false);
        this.$emit('saved');
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de la modification');
      } finally {
        this.enregistrement = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.sanaa-grid--form { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
.sanaa-grid--ligne { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.sanaa-text-muted { color: var(--sanaa-text-muted); font-size: 0.85rem; }
.aide { margin: -4px 0 14px; }
.bloc-titre { margin: 8px 0 10px; font-size: 0.95rem; }
.bloc-entete { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
.ligne-commande {
  border: 1px solid var(--sanaa-border);
  border-radius: var(--sanaa-radius-md);
  padding: 12px 14px 8px;
  margin-bottom: 12px;
  background: var(--sanaa-bg-alt);
}
.ligne-commande__pied {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.personnalisation-liste { display: flex; flex-direction: column; gap: 8px; }
.personnalisation-item { display: flex; gap: 8px; align-items: center; }
.total-barre { padding: 10px 0 0; border-top: 1px solid var(--sanaa-border); text-align: right; }
</style>
