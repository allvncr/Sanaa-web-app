<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Nouvelle commande</h1>
      <div v-if="paysVerrouille" class="pays-verrouille">
        <span class="pays-verrouille__label">Pays : <strong>{{ paysActuel ? paysActuel.nom : '' }}</strong></span>
        <el-button size="mini" type="text" @click="changerPays">Changer de pays</el-button>
      </div>
    </div>

    <!-- Étape 1 : choix du pays, une seule fois pour toute une série de saisies rapides -->
    <div v-if="!paysVerrouille" class="sanaa-card sanaa-card--choix-pays">
      <h3 style="margin-top:0">Pour quel pays saisissez-vous des commandes ?</h3>
      <p class="sanaa-text-muted">
        Choisissez le pays une fois : vous pourrez ensuite enchaîner la saisie de toutes les commandes de ce
        pays sans le resélectionner.
      </p>
      <div class="sanaa-toolbar">
        <el-select v-model="form.pays_id" placeholder="Choisir un pays" style="width:260px">
          <el-option v-for="p in paysContexte.liste" :key="p._id" :value="p._id" :label="p.nom" />
        </el-select>
        <el-button type="primary" :disabled="!form.pays_id" @click="verrouillerPays">Commencer la saisie</el-button>
      </div>
    </div>

    <template v-else>
      <div v-if="compteurSession > 0" class="sanaa-card sanaa-card--compteur">
        <i class="el-icon-circle-check" /> {{ compteurSession }} commande{{ compteurSession > 1 ? 's' : '' }}
        enregistrée{{ compteurSession > 1 ? 's' : '' }} pour {{ paysActuel ? paysActuel.nom : '' }} dans cette session.
      </div>

      <el-form :model="form" label-position="top" ref="formulaire" @submit.native.prevent>
        <div class="sanaa-card" style="margin-bottom:16px">
          <h3 style="margin-top:0">Client</h3>
          <div class="sanaa-grid sanaa-grid--form">
            <el-form-item label="Nom (optionnel)">
              <el-input v-model="form.client.nom" placeholder="Nom du client" />
            </el-form-item>
            <el-form-item label="Numéro de téléphone" required>
              <el-input v-model="form.client.telephone_whatsapp" placeholder="+225 07 00 00 00 00" ref="telephone" />
            </el-form-item>
            <el-form-item label="Adresse">
              <el-input v-model="form.client.adresse" placeholder="Adresse de livraison" />
            </el-form-item>
            <el-form-item label="Canal d'acquisition">
              <el-select v-model="form.canal_vente" style="width:100%">
                <el-option label="WhatsApp" value="WhatsApp" />
                <el-option label="Site web" value="Site web" />
              </el-select>
            </el-form-item>
          </div>
          <p class="sanaa-text-muted" style="margin-bottom:0">
            Un client déjà connu avec ce numéro dans {{ paysActuel ? paysActuel.nom : 'ce pays' }} sera
            automatiquement retrouvé — inutile de le rechercher.
          </p>
        </div>

        <div class="sanaa-card" style="margin-bottom:16px">
          <div class="sanaa-toolbar" style="justify-content: space-between;">
            <h3 style="margin:0">Lignes de commande</h3>
            <div>
              <el-button v-if="form.lignes.length > 1" size="small" type="text" @click="basculerToutesLignes">
                {{ toutesRepliees ? 'Tout déplier' : 'Tout replier' }}
              </el-button>
              <el-button size="small" icon="el-icon-plus" @click="ajouterLigne">Ajouter un produit</el-button>
            </div>
          </div>

          <div v-for="(ligne, index) in form.lignes" :key="ligne.cle" class="ligne-commande" :class="{ 'is-replie': ligne.replie }">
            <div class="ligne-commande__entete">
              <button type="button" class="ligne-commande__bascule" @click="ligne.replie = !ligne.replie">
                <i :class="ligne.replie ? 'el-icon-arrow-right' : 'el-icon-arrow-down'" />
                <span class="ligne-commande__titre">Produit {{ index + 1 }}</span>
                <span class="ligne-commande__resume">{{ resumeLigne(ligne) }}</span>
              </button>
              <span class="ligne-commande__total">{{ ligne.sousTotal | montant }}</span>
              <el-button type="text" icon="el-icon-delete" title="Retirer la ligne" @click="form.lignes.splice(index, 1)" />
            </div>
            <el-collapse-transition>
            <div v-show="!ligne.replie" class="ligne-commande__corps">
            <div class="sanaa-grid sanaa-grid--ligne">
              <el-form-item label="Produit">
                <el-select v-model="ligne.produit_id" filterable placeholder="Produit" style="width:100%" @change="() => onChangeProduit(ligne)">
                  <el-option v-for="p in produits" :key="p._id" :value="p._id" :label="p.nom" />
                </el-select>
              </el-form-item>

              <el-form-item label="Variante">
                <el-select v-model="ligne.variante_id" placeholder="Couleur / variante" style="width:100%" @change="() => onChangeVariante(ligne)">
                  <el-option
                    v-for="v in variantesDisponibles(ligne.produit_id)"
                    :key="v._id"
                    :value="v._id"
                    :label="v.couleur || 'Standard'"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="Quantité">
                <el-input-number v-model="ligne.quantite" :min="1" style="width:100%" @change="() => calculerLigne(ligne)" />
              </el-form-item>

              <el-form-item label="Prix unitaire (pays)">
                <el-input :value="ligne.prixUnitaire ? formaterMontant(ligne.prixUnitaire) : 'Aucun prix actif'" disabled />
              </el-form-item>

              <el-form-item label="Précision modèle (optionnel)">
                <el-input v-model="ligne.detail_variante" placeholder="ex. mois, cheville..." />
              </el-form-item>
            </div>

            <el-form-item label="Prénom(s) / personnalisation à graver">
              <div class="personnalisation-liste">
                <div v-for="(p, i) in ligne.personnalisation" :key="i" class="personnalisation-item">
                  <el-input v-model="p.texte" placeholder="Prénom / texte" size="small" />
                  <el-input v-model="p.police" placeholder="Police (optionnel)" size="small" style="width:140px" />
                  <el-button icon="el-icon-close" circle size="mini" @click="ligne.personnalisation.splice(i, 1)" />
                </div>
                <el-button size="mini" icon="el-icon-plus" @click="ligne.personnalisation.push({ texte: '', police: '', position: ligne.personnalisation.length })">
                  Ajouter un prénom
                </el-button>
              </div>
            </el-form-item>

            <div class="ligne-commande__pied">
              <span>Sous-total : <strong>{{ ligne.sousTotal | montant }}</strong></span>
            </div>
            </div>
            </el-collapse-transition>
          </div>

          <p v-if="form.lignes.length === 0" class="sanaa-empty">Ajoutez au moins un produit à la commande.</p>
        </div>

        <div class="sanaa-card" style="margin-bottom:16px">
          <button type="button" class="bloc-optionnel__bascule" @click="blocPaiementOuvert = !blocPaiementOuvert">
            <i :class="blocPaiementOuvert ? 'el-icon-arrow-down' : 'el-icon-arrow-right'" />
            <h3>Avance et réduction <span class="sanaa-text-muted">(optionnel)</span></h3>
            <span v-if="!blocPaiementOuvert && resumePaiement" class="bloc-optionnel__resume">{{ resumePaiement }}</span>
          </button>
          <el-collapse-transition>
          <div v-show="blocPaiementOuvert" class="sanaa-grid sanaa-grid--form" style="margin-top:14px">
            <div>
              <h3 style="margin-top:0">Avance</h3>
              <el-form-item label="Moyen de paiement" :required="form.avance.montant > 0" :error="erreurMoyen">
                <el-select v-model="form.avance.moyen_paiement" placeholder="Wave, Orange Money, Espèces…" style="width:100%" @change="erreurMoyen = ''">
                  <el-option v-for="m in moyensPaiement" :key="m.nom" :value="m.nom" :label="m.nom" />
                </el-select>
              </el-form-item>
              <el-form-item label="Montant de l'avance">
                <el-input-number v-model="form.avance.montant" :min="0" style="width:100%" />
              </el-form-item>
              <el-form-item label="Référence (optionnel)">
                <el-input v-model="form.avance.reference" />
              </el-form-item>
            </div>
            <div>
              <h3 style="margin-top:0">Réduction</h3>
              <el-form-item label="Montant de la réduction sur le total">
                <el-input-number v-model="form.reduction" :min="0" style="width:100%" />
              </el-form-item>
              <p class="sanaa-text-muted">Déduite du total de la commande pour le calcul du reste à payer.</p>
            </div>
          </div>
          </el-collapse-transition>
        </div>

        <el-form-item label="Commentaires">
          <el-input v-model="form.commentaires" type="textarea" :rows="2" />
        </el-form-item>

        <div class="sanaa-total-bar">
          <span>
            Total : <strong>{{ totalCommande | montant }}</strong>
            <template v-if="form.reduction > 0"> — Réduction : -{{ form.reduction | montant }} — Net :
              <strong>{{ (totalCommande - form.reduction) | montant }}</strong>
            </template>
          </span>
          <el-button type="primary" :loading="enregistrement" @click="enregistrer">
            Enregistrer et saisir la suivante
          </el-button>
        </div>
      </el-form>
    </template>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import catalogueApi from '@/services/catalogue.api';
import commandesApi from '@/services/commandes.api';
import { formaterMontant } from '@/utils/format';

function ligneVide() {
  return {
    cle: Math.random().toString(36).slice(2),
    produit_id: '', variante_id: '', couleur_choisie: '', detail_variante: '',
    personnalisation: [{ texte: '', police: '', position: 0 }],
    quantite: 1, prixUnitaire: 0, sousTotal: 0, replie: false,
  };
}

function commandeVide(pays_id) {
  return {
    pays_id,
    client: { nom: '', telephone_whatsapp: '', adresse: '' },
    canal_vente: 'Site web',
    lignes: [],
    avance: { moyen_paiement: '', montant: 0, reference: '' },
    reduction: 0,
    commentaires: '',
  };
}

export default {
  name: 'CommandeForm',
  data() {
    return {
      paysVerrouille: false,
      compteurSession: 0,
      form: commandeVide(''),
      moyensPaiement: [],
      enregistrement: false,
      erreurMoyen: '',
      blocPaiementOuvert: false,
    };
  },
  computed: {
    ...mapState({ paysContexte: (state) => state.paysContexte }),
    ...mapState('catalogue', ['produits']),
    paysActuel() {
      return this.paysContexte.liste.find((p) => p._id === this.form.pays_id) || null;
    },
    toutesRepliees() {
      return this.form.lignes.length > 0 && this.form.lignes.every((l) => l.replie);
    },
    // Rappel affiché quand le bloc optionnel est replié mais renseigné.
    resumePaiement() {
      const morceaux = [];
      if (this.form.avance.montant > 0) morceaux.push(`Avance ${formaterMontant(this.form.avance.montant)}${this.form.avance.moyen_paiement ? ` (${this.form.avance.moyen_paiement})` : ' — moyen à choisir'}`);
      if (this.form.reduction > 0) morceaux.push(`Réduction ${formaterMontant(this.form.reduction)}`);
      return morceaux.join(' · ');
    },
    totalCommande() {
      return this.form.lignes.reduce((acc, l) => acc + (Number(l.sousTotal) || 0), 0);
    },
  },
  async mounted() {
    await this.$store.dispatch('catalogue/charger');
    if (this.paysContexte.paysActifId) {
      this.form.pays_id = this.paysContexte.paysActifId;
    }
  },
  methods: {
    formaterMontant,
    verrouillerPays() {
      this.paysVerrouille = true;
      this.compteurSession = 0;
      this.onChangePays();
      this.ajouterLigne();
    },
    changerPays() {
      this.paysVerrouille = false;
      this.form = commandeVide('');
    },
    onChangePays() {
      const pays = this.paysContexte.liste.find((p) => p._id === this.form.pays_id);
      this.moyensPaiement = pays ? pays.moyens_paiement.filter((m) => m.actif) : [];
    },
    variantesDisponibles(produitId) {
      const produit = this.produits.find((p) => p._id === produitId);
      return produit ? produit.variantes : [];
    },
    basculerToutesLignes() {
      const replier = !this.toutesRepliees;
      this.form.lignes.forEach((l) => { l.replie = replier; });
    },
    resumeLigne(ligne) {
      const produit = this.produits.find((p) => p._id === ligne.produit_id);
      if (!produit) return 'Produit à choisir';
      const variante = produit.variantes.find((v) => v._id === ligne.variante_id);
      const noms = ligne.personnalisation.map((p) => p.texte).filter(Boolean).join(', ');
      return [produit.nom, variante && variante.couleur, ligne.quantite > 1 ? `×${ligne.quantite}` : '', noms && `« ${noms} »`]
        .filter(Boolean)
        .join(' · ');
    },
    ajouterLigne() {
      this.form.lignes.push(ligneVide());
    },
    onChangeProduit(ligne) {
      ligne.variante_id = '';
      ligne.prixUnitaire = 0;
      ligne.sousTotal = 0;
    },
    async onChangeVariante(ligne) {
      const produit = this.produits.find((p) => p._id === ligne.produit_id);
      const variante = produit ? produit.variantes.find((v) => v._id === ligne.variante_id) : null;
      ligne.couleur_choisie = variante ? variante.couleur : '';
      await this.calculerLigne(ligne);
    },
    async calculerLigne(ligne) {
      if (!ligne.produit_id || !ligne.variante_id || !this.form.pays_id) return;
      try {
        const { data } = await catalogueApi.prixEffectif(ligne.produit_id, ligne.variante_id, this.form.pays_id);
        ligne.prixUnitaire = data.data ? Number(data.data.prix.$numberDecimal || data.data.prix) : 0;
      } catch (e) {
        ligne.prixUnitaire = 0;
      }
      ligne.sousTotal = ligne.prixUnitaire * (ligne.quantite || 1);
    },
    async enregistrer() {
      if (!this.form.client.telephone_whatsapp || this.form.lignes.length === 0) {
        this.$store.dispatch('notifications/erreur', 'Numéro de téléphone du client et au moins une ligne sont requis.');
        return;
      }
      if (this.form.avance.montant > 0 && !this.form.avance.moyen_paiement) {
        this.blocPaiementOuvert = true;
        this.erreurMoyen = "Choisissez le moyen de paiement de l'avance.";
        this.$store.dispatch('notifications/erreur', 'Une avance est saisie : choisissez son moyen de paiement (Wave, Orange Money, Espèces…).');
        return;
      }
      this.erreurMoyen = '';
      this.enregistrement = true;
      try {
        const payload = {
          pays_id: this.form.pays_id,
          client: { ...this.form.client },
          canal_vente: this.form.canal_vente,
          commentaires: this.form.commentaires,
          reduction: this.form.reduction || 0,
          lignes: this.form.lignes.map((l) => ({
            produit_id: l.produit_id,
            variante_id: l.variante_id,
            couleur_choisie: l.couleur_choisie,
            personnalisation: l.personnalisation.filter((p) => p.texte),
            detail_variante: l.detail_variante || undefined,
            quantite: l.quantite,
          })),
        };
        if (this.form.avance.montant > 0) payload.avance = this.form.avance;

        const { data } = await commandesApi.creer(payload);
        this.compteurSession += 1;
        this.$store.dispatch('notifications/succes', `Commande ${data.data.numero} enregistrée.`);

        // Retour V0.1 : on reste sur l'écran, pays conservé, prêt pour la
        // commande suivante — c'est l'action la plus répétitive de l'app.
        const paysId = this.form.pays_id;
        this.form = commandeVide(paysId);
        this.blocPaiementOuvert = false;
        this.ajouterLigne();
        this.$nextTick(() => this.$refs.telephone && this.$refs.telephone.focus());
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de la création');
      } finally {
        this.enregistrement = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.pays-verrouille {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--sanaa-bg-alt);
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.85rem;
}
.pays-verrouille__label { color: var(--sanaa-text-muted); }

.sanaa-card--choix-pays { max-width: 560px; }
.sanaa-card--compteur {
  margin-bottom: 16px;
  color: var(--sanaa-success);
  background: #E6F0EA;
  border-color: #cfe3d7;
}

.sanaa-grid--form { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.sanaa-grid--ligne { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
.ligne-commande {
  border: 1px solid var(--sanaa-border);
  border-radius: var(--sanaa-radius-md);
  padding: 14px;
  margin-bottom: 14px;
  background: var(--sanaa-bg-alt);
}
.ligne-commande__entete {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ligne-commande__bascule {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  color: var(--sanaa-text);
  font: inherit;
}
.ligne-commande__titre { font-weight: 600; white-space: nowrap; }
.ligne-commande__resume {
  color: var(--sanaa-text-muted);
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ligne-commande__total { font-weight: 600; white-space: nowrap; }
.ligne-commande__corps { padding-top: 12px; }
.ligne-commande.is-replie { padding-bottom: 8px; }
.bloc-optionnel__bascule {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  color: var(--sanaa-text);
  font: inherit;
  h3 { margin: 0; }
}
.bloc-optionnel__resume {
  margin-left: auto;
  font-size: 0.85rem;
  color: var(--sanaa-success);
}
.ligne-commande__pied {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.personnalisation-liste { display: flex; flex-direction: column; gap: 8px; }
.personnalisation-item { display: flex; gap: 8px; align-items: center; }
.sanaa-total-bar {
  position: sticky;
  bottom: 0;
  background: var(--sanaa-surface);
  border-top: 1px solid var(--sanaa-border);
  padding: 14px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
