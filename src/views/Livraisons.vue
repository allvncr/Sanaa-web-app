<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Livraisons</h1>
    </div>

    <div class="livraisons">
      <!-- Calendrier du mois -->
      <div class="sanaa-card calendrier" v-loading="chargement">
        <div class="calendrier__nav">
          <el-button size="small" icon="el-icon-arrow-left" circle title="Mois précédent" @click="changerMois(-1)" />
          <h2 class="calendrier__titre">{{ titreMois }}</h2>
          <el-button size="small" icon="el-icon-arrow-right" circle title="Mois suivant" @click="changerMois(1)" />
          <el-button size="small" class="calendrier__aujourdhui" @click="allerAujourdhui">Aujourd'hui</el-button>
        </div>

        <div class="calendrier__grille calendrier__entete">
          <span v-for="j in joursSemaine" :key="j">{{ j }}</span>
        </div>
        <div class="calendrier__grille">
          <button
            v-for="cellule in cellules"
            :key="cellule.jour"
            type="button"
            class="cellule"
            :class="{
              'is-autre-mois': !cellule.dansMois,
              'is-aujourdhui': cellule.jour === aujourdhui,
              'is-selectionne': cellule.jour === jourSelectionne,
              'has-livraisons': cellule.total > 0,
            }"
            @click="choisirJour(cellule)"
          >
            <span class="cellule__numero">{{ cellule.numero }}</span>
            <span v-if="cellule.total > 0" class="cellule__badge">
              <i class="el-icon-truck" />
              {{ cellule.total }}<span class="hide-mobile"> livraison{{ cellule.total > 1 ? 's' : '' }}</span>
            </span>
          </button>
        </div>
      </div>

      <!-- Livraisons du jour sélectionné -->
      <div class="sanaa-card jour">
        <div class="jour__entete">
          <div>
            <h3 class="jour__titre">{{ titreJour }}</h3>
            <span class="sanaa-text-muted">
              {{ livraisonsDuJour.length === 0 ? 'Aucune livraison prévue' : `${livraisonsDuJour.length} livraison${livraisonsDuJour.length > 1 ? 's' : ''} prévue${livraisonsDuJour.length > 1 ? 's' : ''}` }}
            </span>
          </div>
          <el-button v-can="'livraisons:planifier'" type="primary" size="small" icon="el-icon-plus" @click="ouvrirAjout">
            Ajouter une livraison
          </el-button>
        </div>

        <p v-if="livraisonsDuJour.length === 0" class="sanaa-empty">Aucune livraison prévue ce jour-là.</p>

        <div v-for="l in livraisonsDuJour" :key="l._id" class="livraison" :class="{ 'is-orpheline': !l.commande }" @click="ouvrirCommande(l)">
          <template v-if="l.commande">
            <div class="livraison__haut">
              <strong class="livraison__numero">{{ l.commande.numero }}</strong>
              <StatutBadge :statut="l.commande.statut_livraison" :libelles="statutsLivraison" />
            </div>
            <div class="livraison__client">
              {{ l.commande.client && l.commande.client.nom ? l.commande.client.nom : 'Client sans nom' }}
              <span v-if="l.commande.client && l.commande.client.telephone_whatsapp" class="sanaa-text-muted"> · {{ l.commande.client.telephone_whatsapp }}</span>
            </div>
            <div v-if="l.commande.client && l.commande.client.adresse" class="sanaa-text-muted livraison__adresse">
              <i class="el-icon-location-outline" /> {{ l.commande.client.adresse }}
            </div>
            <ul class="livraison__produits">
              <li v-for="(p, i) in l.commande.lignes" :key="i">
                {{ p.produit }}<template v-if="p.couleur"> {{ p.couleur }}</template><template v-if="p.detail"> ({{ p.detail }})</template>
                <template v-if="p.quantite > 1"> ×{{ p.quantite }}</template>
                <span v-if="p.personnalisation" class="sanaa-text-muted"> — « {{ p.personnalisation }} »</span>
              </li>
            </ul>
            <div class="livraison__bas">
              <span :class="Number(l.commande.reste_a_payer) > 0 ? 'reste' : 'reste reste--solde'">
                {{ Number(l.commande.reste_a_payer) > 0 ? `Reste à encaisser : ${formaterMontant(l.commande.reste_a_payer)}` : 'Soldée' }}
              </span>
              <el-button
                v-can="'livraisons:planifier'"
                type="text"
                size="small"
                icon="el-icon-close"
                title="Retirer cette livraison de ce jour"
                @click.stop="retirer(l)"
              >
                Retirer
              </el-button>
            </div>
          </template>
          <template v-else>
            <div class="livraison__haut"><strong>Commande supprimée</strong></div>
            <div class="livraison__bas">
              <span />
              <el-button v-can="'livraisons:planifier'" type="text" size="small" icon="el-icon-close" @click.stop="retirer(l)">Retirer</el-button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Ajout d'une livraison à un jour -->
    <el-dialog
      :title="`Ajouter une livraison — ${titreJourCourt}`"
      :visible.sync="dialogueAjout"
      width="640px"
      top="6vh"
      append-to-body
      @closed="reinitialiserAjout"
    >
      <el-input
        ref="rechercheCommande"
        v-model="recherche"
        clearable
        prefix-icon="el-icon-search"
        placeholder="Rechercher une commande : n°, client, téléphone, prénom gravé…"
        @input="rechercherDiffere"
        @clear="rechercherCommandes"
      />
      <div v-loading="rechercheEnCours" class="resultats">
        <p v-if="!rechercheEnCours && resultats.length === 0" class="sanaa-empty">Aucune commande trouvée.</p>
        <div v-for="c in resultats" :key="c._id" class="resultat">
          <div class="resultat__infos">
            <div>
              <strong>{{ c.numero }}</strong>
              <StatutBadge :statut="c.statut_livraison" :libelles="statutsLivraison" style="margin-left:6px" />
            </div>
            <div class="sanaa-text-muted">
              {{ c.client_id && c.client_id.nom ? c.client_id.nom : 'Client sans nom' }}
              <template v-if="c.client_id && c.client_id.telephone_whatsapp"> · {{ c.client_id.telephone_whatsapp }}</template>
              · {{ c.createdAt | dateFr }}
            </div>
          </div>
          <el-button v-if="dejaCeJour(c._id)" size="mini" disabled>Déjà ce jour</el-button>
          <el-button v-else size="mini" type="primary" :loading="ajoutEnCours === c._id" @click="ajouter(c)">Ajouter</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import commandesApi from '@/services/commandes.api';
import livraisonsApi from '@/services/livraisons.api';
import StatutBadge from '@/components/common/StatutBadge.vue';
import { formaterMontant } from '@/utils/format';

const pad = (n) => String(n).padStart(2, '0');
// Clé de jour calendaire locale "yyyy-MM-dd" (jamais via toISOString : décalage de fuseau).
const cleJour = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const depuisCle = (cle) => {
  const [a, m, j] = cle.split('-').map(Number);
  return new Date(a, m - 1, j);
};
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export default {
  name: 'Livraisons',
  components: { StatutBadge },
  data() {
    const aujourdhui = cleJour(new Date());
    const demande = this.$route.query.jour;
    const jourInitial = /^\d{4}-\d{2}-\d{2}$/.test(demande || '') ? demande : aujourdhui;
    const d = depuisCle(jourInitial);
    return {
      aujourdhui,
      moisAffiche: new Date(d.getFullYear(), d.getMonth(), 1),
      jourSelectionne: jourInitial,
      livraisons: [],
      chargement: false,
      requete: 0,
      joursSemaine: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
      statutsLivraison: this.$i18n.messages.fr.statuts.livraison,
      // dialogue d'ajout
      dialogueAjout: false,
      recherche: '',
      resultats: [],
      rechercheEnCours: false,
      requeteRecherche: 0,
      minuterie: null,
      ajoutEnCours: '',
    };
  },
  computed: {
    ...mapState('paysContexte', { paysActifId: 'paysActifId' }),
    titreMois() {
      return majuscule(this.moisAffiche.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
    },
    titreJour() {
      return majuscule(depuisCle(this.jourSelectionne).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      }));
    },
    titreJourCourt() {
      return depuisCle(this.jourSelectionne).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    },
    // Grille du mois, semaines du lundi au dimanche, complétée par les jours voisins.
    cellules() {
      const annee = this.moisAffiche.getFullYear();
      const mois = this.moisAffiche.getMonth();
      const decalage = (new Date(annee, mois, 1).getDay() + 6) % 7;
      const nbJours = new Date(annee, mois + 1, 0).getDate();
      const lignes = Math.ceil((decalage + nbJours) / 7);
      const cellules = [];
      for (let i = 0; i < lignes * 7; i += 1) {
        const d = new Date(annee, mois, 1 - decalage + i);
        const jour = cleJour(d);
        cellules.push({
          jour,
          numero: d.getDate(),
          dansMois: d.getMonth() === mois,
          total: (this.parJour[jour] || []).length,
        });
      }
      return cellules;
    },
    parJour() {
      const map = {};
      this.livraisons.forEach((l) => {
        (map[l.jour] = map[l.jour] || []).push(l);
      });
      return map;
    },
    livraisonsDuJour() {
      return this.parJour[this.jourSelectionne] || [];
    },
  },
  watch: {
    paysActifId() {
      this.charger();
      if (this.dialogueAjout) this.rechercherCommandes();
    },
  },
  mounted() {
    this.charger();
  },
  beforeDestroy() {
    clearTimeout(this.minuterie);
  },
  methods: {
    formaterMontant,
    async charger() {
      const cellules = this.cellules;
      const numeroRequete = ++this.requete;
      this.chargement = true;
      try {
        const { data } = await livraisonsApi.lister({
          du: cellules[0].jour,
          au: cellules[cellules.length - 1].jour,
          pays_id: this.paysActifId || undefined,
        });
        if (numeroRequete === this.requete) this.livraisons = data.data;
      } finally {
        if (numeroRequete === this.requete) this.chargement = false;
      }
    },
    changerMois(delta) {
      this.moisAffiche = new Date(this.moisAffiche.getFullYear(), this.moisAffiche.getMonth() + delta, 1);
      this.charger();
    },
    allerAujourdhui() {
      const d = new Date();
      this.moisAffiche = new Date(d.getFullYear(), d.getMonth(), 1);
      this.jourSelectionne = this.aujourdhui;
      this.charger();
    },
    choisirJour(cellule) {
      this.jourSelectionne = cellule.jour;
      // Un jour du mois voisin : on bascule sur ce mois.
      if (!cellule.dansMois) {
        const d = depuisCle(cellule.jour);
        this.moisAffiche = new Date(d.getFullYear(), d.getMonth(), 1);
        this.charger();
      }
    },
    ouvrirCommande(l) {
      if (!l.commande) return;
      this.$router.push({
        name: 'commande-detail',
        params: { id: l.commande._id },
        query: { retour: 'livraisons', jour: this.jourSelectionne },
      });
    },
    async retirer(l) {
      const numero = l.commande ? `la commande ${l.commande.numero}` : 'cette livraison';
      try {
        await this.$confirm(
          `Retirer ${numero} des livraisons du ${this.titreJourCourt} ? La commande elle-même n'est pas supprimée : tu pourras la replanifier un autre jour.`,
          'Retirer la livraison',
          { type: 'warning', confirmButtonText: 'Retirer', cancelButtonText: 'Annuler' }
        );
      } catch (e) {
        return;
      }
      try {
        await livraisonsApi.retirer(l._id);
        this.$store.dispatch('notifications/succes', 'Livraison retirée.');
        await this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec du retrait');
      }
    },

    // --- ajout d'une livraison
    ouvrirAjout() {
      this.dialogueAjout = true;
      this.rechercherCommandes();
      this.$nextTick(() => this.$refs.rechercheCommande && this.$refs.rechercheCommande.focus());
    },
    reinitialiserAjout() {
      clearTimeout(this.minuterie);
      this.recherche = '';
      this.resultats = [];
    },
    rechercherDiffere() {
      clearTimeout(this.minuterie);
      this.minuterie = setTimeout(this.rechercherCommandes, 350);
    },
    async rechercherCommandes() {
      clearTimeout(this.minuterie);
      const numeroRequete = ++this.requeteRecherche;
      this.rechercheEnCours = true;
      try {
        const { data } = await commandesApi.lister({
          q: this.recherche ? this.recherche.trim() : undefined,
          pays_id: this.paysActifId || undefined,
          limite: 20,
        });
        if (numeroRequete === this.requeteRecherche) {
          this.resultats = data.data.filter((c) => !['Annulee', 'Refusee'].includes(c.statut_commande));
        }
      } finally {
        if (numeroRequete === this.requeteRecherche) this.rechercheEnCours = false;
      }
    },
    dejaCeJour(commandeId) {
      return this.livraisonsDuJour.some((l) => l.commande && l.commande._id === commandeId);
    },
    async ajouter(commande) {
      this.ajoutEnCours = commande._id;
      try {
        const { data } = await livraisonsApi.planifier(commande._id, this.jourSelectionne);
        const autres = data.data.autres_jours || [];
        this.$store.dispatch('notifications/succes', `${commande.numero} ajoutée aux livraisons du ${this.titreJourCourt}.`);
        if (autres.length) {
          this.$store.dispatch(
            'notifications/erreur',
            `Attention : cette commande est aussi prévue le ${autres.map((j) => j.split('-').reverse().join('/')).join(', ')}.`
          );
        }
        await this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de l’ajout');
      } finally {
        this.ajoutEnCours = '';
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.livraisons {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(300px, 2fr);
  gap: 16px;
  align-items: start;
  @media (max-width: 1000px) { grid-template-columns: 1fr; }
}
.sanaa-text-muted { color: var(--sanaa-text-muted); font-size: 0.85rem; }

.calendrier__nav {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.calendrier__titre { margin: 0; font-size: 1.15rem; min-width: 160px; text-align: center; }
.calendrier__aujourdhui { margin-left: auto; }
.calendrier__grille {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}
.calendrier__entete {
  margin-bottom: 4px;
  text-align: center;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--sanaa-text-muted);
}

.cellule {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  min-height: 84px;
  padding: 6px 8px;
  border: 1px solid var(--sanaa-border);
  border-radius: var(--sanaa-radius-sm);
  background: var(--sanaa-surface);
  color: var(--sanaa-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  @media (max-width: 600px) { min-height: 56px; padding: 4px; }

  &:hover { background: var(--sanaa-accent-1-soft); }
  &.is-autre-mois { opacity: 0.45; }
  &.is-aujourdhui .cellule__numero {
    background: var(--sanaa-accent-2);
    color: #fff;
  }
  &.is-selectionne {
    border-color: var(--sanaa-accent-2);
    box-shadow: 0 0 0 1px var(--sanaa-accent-2);
    background: var(--sanaa-accent-1-soft);
  }
}
.cellule__numero {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 4px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
}
.cellule__badge {
  align-self: stretch;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--sanaa-accent-2);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}

.jour__entete {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}
.jour__titre { margin: 0 0 2px; font-size: 1.05rem; }

.livraison {
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid var(--sanaa-border);
  border-radius: var(--sanaa-radius-md);
  background: var(--sanaa-bg-alt);
  cursor: pointer;
  &:hover { border-color: var(--sanaa-accent-2); }
  &.is-orpheline { cursor: default; opacity: 0.8; }
}
.livraison__haut { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px; }
.livraison__numero { font-size: 0.95rem; }
.livraison__client { font-size: 0.9rem; }
.livraison__adresse { margin-top: 2px; }
.livraison__produits {
  margin: 8px 0;
  padding-left: 18px;
  font-size: 0.85rem;
}
.livraison__bas { display: flex; justify-content: space-between; align-items: center; }
.reste { font-size: 0.85rem; font-weight: 600; color: var(--sanaa-danger, #c0392b); }
.reste--solde { color: var(--sanaa-success); }

.resultats { min-height: 120px; max-height: 55vh; overflow-y: auto; margin-top: 12px; }
.resultat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--sanaa-border);
}
.resultat__infos { min-width: 0; }
</style>
