<template>
  <div class="sanaa-page" v-loading="chargement">
    <template v-if="commande">
      <div class="sanaa-page-header">
        <h1>Commande {{ commande.numero }}</h1>
        <div class="entete-actions">
          <el-button v-can="'commandes:modifier'" type="primary" icon="el-icon-edit" @click="dialogueEdition = true">Modifier</el-button>
          <el-button v-can="'commandes:supprimer'" type="danger" plain icon="el-icon-delete" :loading="suppression" @click="supprimerCommande">Supprimer</el-button>
          <el-button icon="el-icon-back" @click="retour">{{ $route.query.retour === 'livraisons' ? 'Retour aux livraisons' : 'Retour' }}</el-button>
        </div>
      </div>

      <div class="sanaa-grid sanaa-grid--statuts">
        <div class="sanaa-card">
          <span class="sanaa-kpi-label">Statut commande</span>
          <StatutBadge :statut="commande.statut_commande" :libelles="statutsCommande" />
          <el-select
            v-if="$can('commandes:changer_statut')"
            v-model="nouveauStatutCommande"
            size="mini"
            placeholder="Changer…"
            style="margin-top:8px; width:100%"
            @change="changerStatutCommande"
          >
            <el-option v-for="opt in transitionsCommande" :key="opt" :value="opt" :label="statutsCommande[opt]" />
          </el-select>
        </div>
        <div class="sanaa-card">
          <span class="sanaa-kpi-label">Fabrication</span>
          <StatutBadge :statut="commande.statut_fabrication" :libelles="statutsFabrication" />
          <el-select
            v-if="$can('commandes:changer_statut')"
            v-model="nouveauStatutFabrication"
            size="mini"
            placeholder="Changer…"
            style="margin-top:8px; width:100%"
            @change="changerStatutFabrication"
          >
            <el-option v-for="(l, v) in statutsFabrication" :key="v" :value="v" :label="l" />
          </el-select>
        </div>
        <div class="sanaa-card">
          <span class="sanaa-kpi-label">Livraison</span>
          <StatutBadge :statut="commande.statut_livraison" :libelles="statutsLivraison" />
          <el-select
            v-if="$can('commandes:changer_statut')"
            v-model="nouveauStatutLivraison"
            size="mini"
            placeholder="Changer…"
            style="margin-top:8px; width:100%"
            @change="changerStatutLivraison"
          >
            <el-option v-for="(l, v) in statutsLivraison" :key="v" :value="v" :label="l" />
          </el-select>
        </div>
        <div class="sanaa-kpi">
          <span class="sanaa-kpi-label">Reste à payer</span>
          <span class="sanaa-kpi-value">{{ commande.reste_a_payer | montant }}</span>
          <span class="sanaa-kpi-sub">
            Total {{ commande.total | montant }}
            <template v-if="commande.reduction > 0"> — Réduction -{{ commande.reduction | montant }}</template>
          </span>
        </div>
      </div>

      <div class="sanaa-grid sanaa-grid--2col">
        <div class="sanaa-card">
          <h3 style="margin-top:0">Client</h3>
          <p><strong>{{ commande.client_id && commande.client_id.nom ? commande.client_id.nom : 'Client sans nom enregistré' }}</strong></p>
          <p>{{ commande.client_id ? commande.client_id.telephone_whatsapp : '' }}</p>
          <p>{{ commande.client_id ? commande.client_id.adresse : '' }}</p>
          <p class="sanaa-text-muted">Canal : {{ commande.canal_vente }} — Pays : {{ commande.pays_id ? commande.pays_id.nom : '' }}</p>
          <p v-if="commande.commentaires" class="sanaa-text-muted">« {{ commande.commentaires }} »</p>
          <p v-if="joursLivraison.length" class="livraison-prevue">
            <i class="el-icon-truck" /> Livraison prévue le {{ joursLivraison.map(formaterJour).join(', ') }}
          </p>

          <div v-if="jalons.length" class="jalons">
            <h4>Historique des dates</h4>
            <ul>
              <li v-for="j in jalons" :key="j.libelle">{{ j.libelle }} : <strong>{{ j.date | dateHeureFr }}</strong></li>
            </ul>
          </div>
        </div>

        <div class="sanaa-card sanaa-table-scroll">
          <h3 style="margin-top:0">Lignes</h3>
          <el-table :data="commande.lignes" size="small">
            <el-table-column label="Produit" min-width="180">
              <template slot-scope="{ row }">
                {{ row.produit_id && row.produit_id.nom ? row.produit_id.nom : '—' }}
                <span v-if="row.detail_variante" class="sanaa-text-muted">({{ row.detail_variante }})</span>
              </template>
            </el-table-column>
            <el-table-column label="Couleur" prop="couleur_choisie" min-width="100" />
            <el-table-column label="Personnalisation" min-width="160">
              <template slot-scope="{ row }">{{ (row.personnalisation || []).map(p => p.texte).join(', ') }}</template>
            </el-table-column>
            <el-table-column label="Qté" prop="quantite" min-width="60" />
            <el-table-column label="Prix unitaire" min-width="110">
              <template slot-scope="{ row }">{{ row.prix_unitaire_applique | montant }}</template>
            </el-table-column>
            <el-table-column label="Sous-total" min-width="110">
              <template slot-scope="{ row }">{{ row.sous_total | montant }}</template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <div class="sanaa-card" style="margin-top:16px">
        <div class="sanaa-toolbar" style="justify-content: space-between;">
          <h3 style="margin:0">Paiements</h3>
          <el-button v-can="'paiements:enregistrer'" size="small" icon="el-icon-plus" @click="dialoguePaiement = true">
            Enregistrer un paiement
          </el-button>
        </div>
        <div class="sanaa-table-scroll">
          <el-table :data="commande.paiements" size="small" :row-class-name="({ row }) => (row.annule ? 'paiement-annule' : '')">
            <el-table-column label="Date" min-width="110">
              <template slot-scope="{ row }">{{ row.date_paiement | dateFr }}</template>
            </el-table-column>
            <el-table-column label="Type" prop="type" min-width="90" />
            <el-table-column label="Moyen" prop="moyen_paiement" min-width="120" />
            <el-table-column label="Montant" min-width="110">
              <template slot-scope="{ row }">{{ row.montant | montant }}</template>
            </el-table-column>
            <el-table-column label="Référence" prop="reference" min-width="120" />
            <el-table-column label="Statut" min-width="100">
              <template slot-scope="{ row }">
                <el-tag v-if="row.annule" type="info" size="mini">Annulé</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="" min-width="110" align="right">
              <template slot-scope="{ row }">
                <el-button
                  v-can="'paiements:enregistrer'"
                  type="text"
                  icon="el-icon-edit"
                  title="Corriger le moyen, le type ou la référence"
                  @click="ouvrirEditionPaiement(row)"
                />
                <el-button
                  v-if="!row.annule"
                  v-can="'paiements:annuler'"
                  type="text"
                  icon="el-icon-close"
                  title="Annuler ce paiement"
                  @click="annulerPaiement(row)"
                />
              </template>
            </el-table-column>
          </el-table>
          <p v-if="commande.paiements.length === 0" class="sanaa-empty">Aucun paiement enregistré.</p>
        </div>
      </div>

      <CommandeHistorique :commande-id="id" :version="versionHistorique" style="margin-top:16px" />

      <CommandeEditDialog :visible.sync="dialogueEdition" :commande="commande" @saved="charger" />

      <el-dialog title="Enregistrer un paiement" :visible.sync="dialoguePaiement" width="420px">
        <el-form :model="nouveauPaiement" label-position="top">
          <el-form-item label="Type">
            <el-select v-model="nouveauPaiement.type" style="width:100%">
              <el-option label="Avance" value="avance" />
              <el-option label="Solde" value="solde" />
            </el-select>
          </el-form-item>
          <el-form-item label="Moyen de paiement">
            <el-select v-model="nouveauPaiement.moyen_paiement" placeholder="Choisir un moyen de paiement" style="width:100%">
              <el-option v-for="m in moyensPaiement" :key="m.nom" :value="m.nom" :label="m.nom" />
            </el-select>
          </el-form-item>
          <el-form-item label="Montant">
            <el-input-number v-model="nouveauPaiement.montant" :min="0" style="width:100%" />
          </el-form-item>
          <el-form-item label="Référence (optionnel)">
            <el-input v-model="nouveauPaiement.reference" />
          </el-form-item>
        </el-form>
        <span slot="footer">
          <el-button @click="dialoguePaiement = false">Annuler</el-button>
          <el-button type="primary" :loading="enregistrementPaiement" @click="enregistrerPaiement">Enregistrer</el-button>
        </span>
      </el-dialog>

      <el-dialog title="Corriger le paiement" :visible.sync="dialogueEditionPaiement" width="420px">
        <template v-if="paiementEnEdition">
          <el-alert type="info" :closable="false" show-icon style="margin-bottom:16px">
            Le montant et la date d'un paiement ne se corrigent pas : {{ montantFormate(paiementEnEdition.montant) }} du
            {{ paiementEnEdition.date_paiement | dateFr }} restent inchangés. Annulez le paiement puis ressaisissez-le si l'un des deux est faux.
          </el-alert>
          <el-form :model="paiementEdite" label-position="top">
            <el-form-item label="Type">
              <el-select v-model="paiementEdite.type" style="width:100%">
                <el-option label="Avance" value="avance" />
                <el-option label="Solde" value="solde" />
              </el-select>
            </el-form-item>
            <el-form-item label="Moyen de paiement">
              <el-select v-model="paiementEdite.moyen_paiement" placeholder="Choisir un moyen de paiement" style="width:100%">
                <el-option v-for="m in moyensPaiement" :key="m.nom" :value="m.nom" :label="m.nom" />
                <el-option
                  v-if="paiementEnEdition && !moyensPaiement.some((m) => m.nom === paiementEnEdition.moyen_paiement)"
                  :key="paiementEnEdition.moyen_paiement"
                  :value="paiementEnEdition.moyen_paiement"
                  :label="`${paiementEnEdition.moyen_paiement} (valeur d'origine)`"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="Référence (optionnel)">
              <el-input v-model="paiementEdite.reference" />
            </el-form-item>
          </el-form>
        </template>
        <span slot="footer">
          <el-button @click="dialogueEditionPaiement = false">Annuler</el-button>
          <el-button type="primary" :loading="enregistrementEditionPaiement" @click="enregistrerEditionPaiement">Enregistrer</el-button>
        </span>
      </el-dialog>
    </template>
  </div>
</template>

<script>
import commandesApi from '@/services/commandes.api';
import livraisonsApi from '@/services/livraisons.api';
import StatutBadge from '@/components/common/StatutBadge.vue';
import CommandeEditDialog from '@/components/commandes/CommandeEditDialog.vue';
import CommandeHistorique from '@/components/commandes/CommandeHistorique.vue';
import { formaterMontant as montantFormate } from '@/utils/format';

const TRANSITIONS = {
  Nouvelle: ['Confirmee', 'Annulee', 'Refusee'],
  Confirmee: ['Annulee'],
  Annulee: [],
  Refusee: [],
};

export default {
  name: 'CommandeDetail',
  components: { StatutBadge, CommandeEditDialog, CommandeHistorique },
  props: { id: { type: String, required: true } },
  data() {
    return {
      chargement: false,
      commande: null,
      nouveauStatutCommande: '',
      nouveauStatutFabrication: '',
      nouveauStatutLivraison: '',
      dialoguePaiement: false,
      dialogueEdition: false,
      joursLivraison: [],
      suppression: false,
      versionHistorique: 0,
      nouveauPaiement: { type: 'solde', moyen_paiement: '', montant: 0, reference: '' },
      enregistrementPaiement: false,
      dialogueEditionPaiement: false,
      paiementEnEdition: null,
      paiementEdite: { type: '', moyen_paiement: '', reference: '' },
      enregistrementEditionPaiement: false,
      statutsCommande: this.$i18n.messages.fr.statuts.commande,
      statutsFabrication: this.$i18n.messages.fr.statuts.fabrication,
      statutsLivraison: this.$i18n.messages.fr.statuts.livraison,
    };
  },
  computed: {
    // Mêmes moyens de paiement que la saisie de commande (Pays.moyens_paiement,
    // standardisés par pays — retour V0.1) : plus de champ libre, pour éviter
    // les fautes de frappe (Espece/Espèces, Orange money/Orange Money...).
    moyensPaiement() {
      const moyens = this.commande && this.commande.pays_id ? this.commande.pays_id.moyens_paiement : [];
      return (moyens || []).filter((m) => m.actif);
    },
    transitionsCommande() {
      return this.commande ? TRANSITIONS[this.commande.statut_commande] || [] : [];
    },
    jalons() {
      if (!this.commande) return [];
      const champs = [
        { champ: 'date_fabrication_terminee', libelle: 'Fabrication terminée' },
        { champ: 'date_fabrication_erreur', libelle: 'Erreur de fabrication constatée' },
        { champ: 'date_debut_livraison', libelle: 'Remise au livreur' },
        { champ: 'date_livraison', libelle: 'Livraison confirmée' },
        { champ: 'date_retour_echec', libelle: 'Retour / échec de livraison' },
      ];
      return champs
        .filter((c) => this.commande[c.champ])
        .map((c) => ({ libelle: c.libelle, date: this.commande[c.champ] }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    },
  },
  mounted() {
    this.charger();
  },
  methods: {
    async charger() {
      this.chargement = true;
      try {
        const { data } = await commandesApi.obtenir(this.id);
        this.commande = data.data;
        this.versionHistorique += 1;
        this.chargerJoursLivraison();
      } finally {
        this.chargement = false;
      }
    },
    retour() {
      if (this.$route.query.retour === 'livraisons') {
        this.$router.push({ name: 'livraisons', query: { jour: this.$route.query.jour } });
      } else {
        this.$router.push({ name: 'commandes' });
      }
    },
    formaterJour(jour) {
      return jour.split('-').reverse().join('/');
    },
    // Jours du calendrier des livraisons où cette commande est prévue (info secondaire).
    async chargerJoursLivraison() {
      if (!this.$can('livraisons:voir')) return;
      try {
        const { data } = await livraisonsApi.lister({ commande_id: this.id });
        this.joursLivraison = data.data.map((l) => l.jour);
      } catch (e) {
        this.joursLivraison = [];
      }
    },
    async supprimerCommande() {
      const paiements = this.commande.paiements.filter((p) => !p.annule);
      const avertissementPaiements = paiements.length
        ? ` Elle contient ${paiements.length} paiement(s) enregistré(s) qui seront supprimés avec elle.`
        : '';
      try {
        await this.$confirm(
          `Supprimer définitivement la commande ${this.commande.numero} ?${avertissementPaiements} Le stock réservé sera libéré ; la suppression restera tracée dans le journal d'activité.`,
          'Suppression de la commande',
          { type: 'warning', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler', confirmButtonClass: 'el-button--danger' }
        );
      } catch (e) {
        return;
      }
      this.suppression = true;
      try {
        await commandesApi.supprimer(this.id, { confirmerPaiements: paiements.length > 0 });
        this.$store.dispatch('notifications/succes', `Commande ${this.commande.numero} supprimée.`);
        this.$router.push({ name: 'commandes' });
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de la suppression');
      } finally {
        this.suppression = false;
      }
    },
    async changerStatutCommande(statut) {
      try {
        await commandesApi.changerStatutCommande(this.id, statut);
        this.$store.dispatch('notifications/succes', 'Statut mis à jour.');
        await this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Transition refusée');
      } finally {
        this.nouveauStatutCommande = '';
      }
    },
    async changerStatutFabrication(statut) {
      try {
        await commandesApi.changerStatutFabrication(this.id, statut);
        this.$store.dispatch('notifications/succes', 'Statut de fabrication mis à jour.');
        await this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Transition refusée');
      } finally {
        this.nouveauStatutFabrication = '';
      }
    },
    async changerStatutLivraison(statut) {
      try {
        await commandesApi.changerStatutLivraison(this.id, statut);
        this.$store.dispatch('notifications/succes', 'Statut de livraison mis à jour.');
        await this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Transition refusée');
      } finally {
        this.nouveauStatutLivraison = '';
      }
    },
    async enregistrerPaiement() {
      this.enregistrementPaiement = true;
      try {
        await commandesApi.enregistrerPaiement(this.id, this.nouveauPaiement);
        this.$store.dispatch('notifications/succes', 'Paiement enregistré.');
        this.dialoguePaiement = false;
        this.nouveauPaiement = { type: 'solde', moyen_paiement: '', montant: 0, reference: '' };
        await this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de l’enregistrement');
      } finally {
        this.enregistrementPaiement = false;
      }
    },
    montantFormate,
    ouvrirEditionPaiement(row) {
      this.paiementEnEdition = row;
      this.paiementEdite = { type: row.type, moyen_paiement: row.moyen_paiement, reference: row.reference || '' };
      this.dialogueEditionPaiement = true;
    },
    async enregistrerEditionPaiement() {
      this.enregistrementEditionPaiement = true;
      try {
        await commandesApi.modifierPaiement(this.id, this.paiementEnEdition._id, this.paiementEdite);
        this.$store.dispatch('notifications/succes', 'Paiement corrigé.');
        this.dialogueEditionPaiement = false;
        await this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de la correction');
      } finally {
        this.enregistrementEditionPaiement = false;
      }
    },
    async annulerPaiement(row) {
      try {
        await this.$confirm(
          `Annuler ce paiement de ${montantFormate(row.montant)} (${row.moyen_paiement}) ? Il restera visible mais ne comptera plus dans le reste à payer. Vous pourrez ensuite en ressaisir un correct.`,
          'Annuler le paiement',
          { type: 'warning', confirmButtonText: 'Annuler le paiement', cancelButtonText: 'Retour' }
        );
      } catch (e) {
        return;
      }
      try {
        await commandesApi.annulerPaiement(this.id, row._id);
        this.$store.dispatch('notifications/succes', 'Paiement annulé.');
        await this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de l’annulation');
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.livraison-prevue { color: var(--sanaa-accent-2-dark); font-weight: 600; font-size: 0.9rem; }
.el-table >>> .paiement-annule td { color: var(--sanaa-text-muted); text-decoration: line-through; }
.el-table >>> .paiement-annule .el-tag { text-decoration: none; }
.entete-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.sanaa-grid--statuts { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 16px; }
.sanaa-grid--2col { grid-template-columns: 1fr 2fr; @media (max-width: 900px) { grid-template-columns: 1fr; } }
.sanaa-text-muted { color: var(--sanaa-text-muted); font-size: 0.85rem; }
.jalons {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--sanaa-border);
  h4 { margin: 0 0 6px; font-size: 0.85rem; color: var(--sanaa-text-muted); }
  ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
  li { font-size: 0.82rem; color: var(--sanaa-text-muted); }
}
</style>
