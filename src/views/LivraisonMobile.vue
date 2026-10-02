<template>
  <div class="app">
    <!-- ============ LISTE ============ -->
    <header class="app__bar">
      <div>
        <p class="app__marque">SANAA</p>
        <p class="app__salut">Bonjour {{ prenom }}</p>
        <p class="app__date">{{ dateLongue }}</p>
      </div>
      <div class="app__actions">
        <button type="button" class="icone-btn" :class="{ 'is-tourne': chargement }" aria-label="Actualiser" @click="charger">
          <i class="el-icon-refresh" />
        </button>
        <button type="button" class="icone-btn" aria-label="Quitter" @click="deconnexion">
          <i class="el-icon-switch-button" />
        </button>
      </div>
    </header>

    <main
      ref="corps"
      class="app__corps"
      @touchstart.passive="debutTouch"
      @touchmove.passive="bougerTouch"
      @touchend.passive="finTouch"
    >
      <div class="app__tirer" :style="{ height: pull + 'px' }">
        <span v-if="pull > 5">{{ pull >= 60 ? 'Relâchez pour actualiser' : 'Tirez pour actualiser' }}</span>
      </div>

      <section class="hero">
        <p class="hero__label">À percevoir{{ jourFiltre ? ' ce jour-là' : '' }}</p>
        <p class="hero__montant">{{ totalAPercevoir | montant }}</p>
        <div class="hero__stats">
          <div>
            <strong>{{ restantesFiltrees.length }}</strong>
            <span>colis restant{{ restantesFiltrees.length > 1 ? 's' : '' }}</span>
          </div>
          <div>
            <strong>{{ livreesAujourdhui.length }}</strong>
            <span>livré{{ livreesAujourdhui.length > 1 ? 's' : '' }} aujourd'hui</span>
          </div>
          <div>
            <strong>{{ montantLivreAujourdhui | montant }}</strong>
            <span>encaissé</span>
          </div>
        </div>
        <div v-if="progressionTotal > 0" class="hero__progression">
          <div class="hero__barre"><div class="hero__barre-remplie" :style="{ width: progression + '%' }" /></div>
          <span>{{ progressionFaits }}/{{ progressionTotal }} livrés {{ jourFiltre && jourFiltre !== aujourdhui ? 'ce jour-là' : "aujourd'hui" }}</span>
        </div>
      </section>

      <div class="jours">
        <button
          v-for="c in chipsJours"
          :key="String(c.cle)"
          type="button"
          class="jour-chip"
          :class="{ 'is-actif': jourFiltre === c.cle }"
          @click="jourFiltre = c.cle"
        >
          {{ c.libelle }}<span v-if="c.n" class="jour-chip__n">{{ c.n }}</span>
        </button>
        <label class="jour-chip jour-chip--date" :class="{ 'is-actif': jourPersonnalise }">
          <i class="el-icon-date" /> Autre jour
          <input v-model="jourSaisi" type="date" class="jour-chip__input" @change="appliquerJourSaisi" />
        </label>
      </div>

      <p v-if="chargement && toutes.length === 0" class="vide"><i class="el-icon-loading" /> Chargement…</p>
      <p v-else-if="listeAffichee.length === 0" class="vide">
        <i :class="statutFiltre === 'livrees' ? 'el-icon-box' : 'el-icon-circle-check'" class="vide__icone" />
        {{ statutFiltre === 'attente' ? 'Rien à livrer ici. Bon travail !' : statutFiltre === 'echec' ? 'Aucun échec de livraison.' : 'Aucune livraison terminée.' }}
      </p>

      <article
        v-for="l in listeAffichee"
        :key="l._id"
        class="carte"
        :class="classeCarte(l)"
        @click="ouvrir(l)"
      >
        <template v-if="l.commande">
          <div class="carte__haut">
            <strong class="carte__numero">{{ l.commande.numero }}</strong>
            <span v-if="estLivree(l)" class="pastille pastille--ok"><i class="el-icon-check" /> Livrée</span>
            <span v-else-if="l.commande.statut_livraison === 'Retour_echec'" class="pastille pastille--ko">Échec</span>
            <span class="carte__jour">{{ formaterJourCourt(l.jour) }}</span>
          </div>
          <p class="carte__client">{{ nomClient(l) }}</p>
          <p v-if="l.commande.client && l.commande.client.adresse" class="carte__adresse">
            <i class="el-icon-location-outline" /> {{ l.commande.client.adresse }}
          </p>

          <div class="carte__bas">
            <div v-if="!estLivree(l)">
              <span v-if="Number(l.commande.reste_a_payer) > 0" class="montant montant--du">
                À encaisser <strong>{{ l.commande.reste_a_payer | montant }}</strong>
              </span>
              <span v-else class="montant montant--regle"><i class="el-icon-circle-check" /> Déjà réglé</span>
            </div>
            <div v-else class="montant montant--regle">
              {{ Number(l.montant_recu) > 0 ? `${formaterMontant(l.montant_recu)} encaissé` : 'Réglé' }}<template v-if="Number(l.frais_livraison) > 0"> · {{ formaterMontant(l.frais_livraison) }} de frais</template>
            </div>

            <div v-if="!estLivree(l)" class="carte__raccourcis" @click.stop>
              <a
                v-for="(t, i) in telephones(l.commande.client).slice(0, 1)"
                :key="i"
                :href="lienTel(t)"
                class="raccourci raccourci--appel"
                aria-label="Appeler"
              ><i class="el-icon-phone" /></a>
              <a
                v-if="l.commande.client && l.commande.client.adresse"
                :href="lienItineraire(l.commande.client.adresse)"
                target="_blank"
                rel="noopener"
                class="raccourci raccourci--route"
                aria-label="Itinéraire"
              ><i class="el-icon-location" /></a>
            </div>
          </div>
        </template>
        <p v-else class="carte__client carte__client--supprime">Commande supprimée</p>
      </article>
    </main>

    <nav class="onglets">
      <button type="button" class="onglet" :class="{ 'is-actif': statutFiltre === 'attente' }" @click="statutFiltre = 'attente'">
        <i class="el-icon-box" />
        <span>À livrer</span>
        <em v-if="enAttente.length" class="onglet__badge">{{ enAttente.length }}</em>
      </button>
      <button type="button" class="onglet" :class="{ 'is-actif': statutFiltre === 'echec' }" @click="statutFiltre = 'echec'">
        <i class="el-icon-warning-outline" />
        <span>Échecs</span>
        <em v-if="echecs.length" class="onglet__badge onglet__badge--ko">{{ echecs.length }}</em>
      </button>
      <button type="button" class="onglet" :class="{ 'is-actif': statutFiltre === 'livrees' }" @click="statutFiltre = 'livrees'">
        <i class="el-icon-circle-check" />
        <span>Livrées</span>
      </button>
    </nav>

    <!-- ============ FICHE (glisse depuis le bas) ============ -->
    <transition name="glisse">
      <section v-if="active" class="feuille">
        <header class="feuille__bar">
          <button type="button" class="icone-btn icone-btn--clair" aria-label="Retour" @click="fermer">
            <i class="el-icon-arrow-left" />
          </button>
          <div class="feuille__titre">
            <strong>{{ active.commande.numero }}</strong>
            <span>{{ formaterJourCourt(active.jour) }}</span>
          </div>
          <span v-if="estLivree(active)" class="pastille pastille--ok"><i class="el-icon-check" /> Livrée</span>
          <span v-else-if="active.commande.statut_livraison === 'Retour_echec'" class="pastille pastille--ko">Échec</span>
        </header>

        <div class="feuille__corps">
          <div class="bloc">
            <p class="bloc__titre">Client</p>
            <p class="client-nom">{{ nomClient(active) }}</p>
            <div class="appels">
              <a
                v-for="(t, i) in telephones(active.commande.client)"
                :key="i"
                :href="lienTel(t)"
                class="gros-lien gros-lien--appel"
              ><i class="el-icon-phone" /> {{ t }}</a>
            </div>
            <div v-if="active.commande.client && active.commande.client.adresse" class="adresse">
              <p><i class="el-icon-location-outline" /> {{ active.commande.client.adresse }}</p>
              <a :href="lienItineraire(active.commande.client.adresse)" target="_blank" rel="noopener" class="gros-lien gros-lien--route">
                <i class="el-icon-location" /> Itinéraire
              </a>
            </div>
          </div>

          <div class="bloc">
            <p class="bloc__titre">Colis</p>
            <ul class="produits">
              <li v-for="(p, i) in active.commande.lignes" :key="i">
                <strong>{{ p.produit }}</strong><template v-if="p.couleur"> · {{ p.couleur }}</template><template v-if="p.detail"> ({{ p.detail }})</template>
                <template v-if="p.quantite > 1"> ×{{ p.quantite }}</template>
                <span v-if="p.personnalisation" class="muted"> — « {{ p.personnalisation }} »</span>
              </li>
            </ul>
          </div>

          <div class="bloc">
            <p class="bloc__titre">Paiement</p>
            <div class="ligne"><span>Total commande</span><span>{{ Number(active.commande.total) - Number(active.commande.reduction || 0) | montant }}</span></div>
            <div class="ligne ligne--vert"><span>Déjà versé</span><span>− {{ dejaVerse | montant }}</span></div>
            <div class="reste" :class="{ 'is-regle': resteActif <= 0 }">
              <template v-if="resteActif <= 0"><i class="el-icon-circle-check" /> Déjà entièrement réglé</template>
              <template v-else>
                <span>Reste à encaisser</span>
                <strong>{{ resteActif | montant }}</strong>
              </template>
            </div>
          </div>

          <!-- Récap d'une livraison déjà faite -->
          <div v-if="estLivree(active)" class="bloc bloc--ok">
            <p class="bloc__titre">Livraison effectuée</p>
            <div class="ligne"><span>Encaissé à la livraison</span><span>{{ Number(active.montant_recu) | montant }}</span></div>
            <div class="ligne"><span>Frais de livraison perçus</span><span>{{ Number(active.frais_livraison) | montant }}</span></div>
            <div v-if="active.livree_le" class="ligne"><span>Le</span><span>{{ active.livree_le | dateHeureFr }}</span></div>
          </div>

          <!-- Saisie de la livraison -->
          <template v-else-if="!modeProbleme">
            <div class="bloc">
              <p class="bloc__titre">Montant reçu du client</p>
              <div class="champ-gros">
                <input v-model="form.montant_recu" type="number" inputmode="decimal" min="0" placeholder="0" />
                <button v-if="resteActif > 0" type="button" class="champ-gros__tout" @click="toutRecevoir">Tout</button>
              </div>

              <template v-if="montantNum > 0">
                <p class="bloc__titre bloc__titre--espace">Moyen de paiement</p>
                <div class="moyens">
                  <button
                    v-for="m in moyensPaiement"
                    :key="m.nom"
                    type="button"
                    class="moyen"
                    :class="{ 'is-actif': form.moyen_paiement === m.nom }"
                    @click="form.moyen_paiement = m.nom"
                  >{{ m.nom }}</button>
                </div>
              </template>

              <p class="bloc__titre bloc__titre--espace">Frais de livraison perçus <span class="muted">(optionnel)</span></p>
              <div class="champ-gros champ-gros--petit">
                <input v-model="form.frais_livraison" type="number" inputmode="decimal" min="0" placeholder="0" />
              </div>
            </div>
          </template>

          <div v-else class="bloc bloc--ko">
            <p class="bloc__titre">Livraison impossible ?</p>
            <p class="muted">Le colis sera marqué « Retour / échec ». Vous pourrez le reprendre un autre jour.</p>
          </div>
        </div>

        <footer v-if="!estLivree(active)" class="feuille__pied">
          <template v-if="!modeProbleme">
            <button type="button" class="btn btn--contour" @click="modeProbleme = true">Problème</button>
            <button type="button" class="btn btn--ok" :disabled="enCours" @click="confirmerLivraison">
              <i :class="enCours ? 'el-icon-loading' : 'el-icon-check'" />
              Confirmer la livraison
            </button>
          </template>
          <template v-else>
            <button type="button" class="btn btn--contour" @click="modeProbleme = false">Annuler</button>
            <button type="button" class="btn btn--ko" :disabled="enCours" @click="confirmerProbleme">
              <i :class="enCours ? 'el-icon-loading' : 'el-icon-close'" />
              Confirmer l'échec
            </button>
          </template>
        </footer>
      </section>
    </transition>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import livraisonsApi from '@/services/livraisons.api';
import { formaterMontant } from '@/utils/format';

const pad = (n) => String(n).padStart(2, '0');
const cleJour = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const depuisCle = (cle) => {
  const [a, m, j] = cle.split('-').map(Number);
  return new Date(a, m - 1, j);
};
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// Fenêtre de récupération : couvre largement tout ce qui peut encore être en
// attente (replanifié après échec, retardé...) sans ramener un historique de
// livrées sans limite.
const JOURS_HISTORIQUE = 90;
const ACTUALISATION_AUTO_MS = 60000;

export default {
  name: 'LivraisonMobile',
  data() {
    return {
      aujourdhui: cleJour(new Date()),
      toutes: [],
      chargement: false,
      requete: 0,
      statutFiltre: 'attente',
      jourFiltre: null,
      jourSaisi: '',
      active: null,
      modeProbleme: false,
      enCours: false,
      form: { montant_recu: '', moyen_paiement: '', frais_livraison: '' },
      pull: 0,
      pullActif: false,
      pullDepart: 0,
      minuterie: null,
    };
  },
  computed: {
    ...mapState({ paysContexte: (state) => state.paysContexte, utilisateur: (state) => state.auth.utilisateur }),
    prenom() {
      return this.utilisateur && this.utilisateur.nom ? this.utilisateur.nom.split(' ')[0] : '';
    },
    dateLongue() {
      return majuscule(depuisCle(this.aujourdhui).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
    },
    moyensPaiement() {
      const pays = this.paysContexte.liste[0];
      return pays ? (pays.moyens_paiement || []).filter((m) => m.actif) : [];
    },
    // Le statut de la commande fait foi, pas le simple booléen `livree` de cette
    // entrée de calendrier : une commande peut avoir été livrée/payée par un
    // autre chemin que « Marquer livrée » ici (ancien flux, paiement saisi
    // directement sur la commande).
    enAttente() {
      return this.toutes.filter((l) => !l.commande || l.commande.statut_livraison === 'En_livraison');
    },
    echecs() {
      return this.toutes.filter((l) => l.commande && l.commande.statut_livraison === 'Retour_echec');
    },
    restantes() {
      return [...this.enAttente, ...this.echecs];
    },
    livrees() {
      return this.toutes
        .filter((l) => l.commande && l.commande.statut_livraison === 'Livree')
        .slice()
        .sort((a, b) => new Date(b.livree_le || b.jour) - new Date(a.livree_le || a.jour));
    },
    // Le bandeau de totaux reflète le filtre jour actif (indépendant de
    // l'onglet de statut, qui a ses propres compteurs).
    restantesFiltrees() {
      return this.jourFiltre ? this.restantes.filter((l) => l.jour === this.jourFiltre) : this.restantes;
    },
    totalAPercevoir() {
      return this.restantesFiltrees.reduce((s, l) => s + (l.commande ? Number(l.commande.reste_a_payer) || 0 : 0), 0);
    },
    livreesAujourdhui() {
      return this.toutes.filter((l) => this.estLivree(l) && l.jour === this.aujourdhui);
    },
    montantLivreAujourdhui() {
      return this.livreesAujourdhui.reduce((s, l) => s + Number(l.montant_recu || 0), 0);
    },
    jourReference() {
      return this.jourFiltre || this.aujourdhui;
    },
    progressionTotal() {
      return this.toutes.filter((l) => l.commande && l.jour === this.jourReference).length;
    },
    progressionFaits() {
      return this.toutes.filter((l) => this.estLivree(l) && l.jour === this.jourReference).length;
    },
    progression() {
      return this.progressionTotal ? Math.round((this.progressionFaits / this.progressionTotal) * 100) : 0;
    },
    chipsJours() {
      const demain = new Date(depuisCle(this.aujourdhui));
      demain.setDate(demain.getDate() + 1);
      const cleDemain = cleJour(demain);
      const nbRestantes = (cle) => this.restantes.filter((l) => l.jour === cle).length;
      const chips = [
        { cle: null, libelle: 'Tous', n: this.restantes.length },
        { cle: this.aujourdhui, libelle: "Aujourd'hui", n: nbRestantes(this.aujourdhui) },
        { cle: cleDemain, libelle: 'Demain', n: nbRestantes(cleDemain) },
      ];
      if (this.jourPersonnalise) chips.push({ cle: this.jourFiltre, libelle: this.formaterJourCourt(this.jourFiltre), n: nbRestantes(this.jourFiltre) });
      return chips;
    },
    jourPersonnalise() {
      if (!this.jourFiltre) return false;
      const demain = new Date(depuisCle(this.aujourdhui));
      demain.setDate(demain.getDate() + 1);
      return this.jourFiltre !== this.aujourdhui && this.jourFiltre !== cleJour(demain);
    },
    listeAffichee() {
      const base = this.statutFiltre === 'echec' ? this.echecs : this.statutFiltre === 'livrees' ? this.livrees : this.enAttente;
      return this.jourFiltre ? base.filter((l) => l.jour === this.jourFiltre) : base;
    },
    montantNum() {
      return Number(this.form.montant_recu) || 0;
    },
    resteActif() {
      return this.active && this.active.commande ? Number(this.active.commande.reste_a_payer) || 0 : 0;
    },
    dejaVerse() {
      if (!this.active || !this.active.commande) return 0;
      const c = this.active.commande;
      return Math.max(0, Number(c.total) - Number(c.reduction || 0) - Number(c.reste_a_payer || 0));
    },
  },
  async mounted() {
    if (this.paysContexte.liste.length === 0) {
      await this.$store.dispatch('paysContexte/initialiser');
    }
    this.charger();
    document.addEventListener('visibilitychange', this.auRetourAuPremierPlan);
    this.minuterie = setInterval(() => {
      if (!document.hidden && !this.active && !this.enCours) this.charger();
    }, ACTUALISATION_AUTO_MS);
  },
  beforeDestroy() {
    document.removeEventListener('visibilitychange', this.auRetourAuPremierPlan);
    clearInterval(this.minuterie);
  },
  methods: {
    formaterMontant,
    estLivree(l) {
      return !!(l.commande && l.commande.statut_livraison === 'Livree');
    },
    classeCarte(l) {
      if (this.estLivree(l)) return 'is-livree';
      if (l.commande && l.commande.statut_livraison === 'Retour_echec') return 'is-echec';
      return '';
    },
    nomClient(l) {
      return l.commande && l.commande.client && l.commande.client.nom ? l.commande.client.nom : 'Client sans nom';
    },
    // Un même champ téléphone peut contenir plusieurs numéros séparés par "/".
    telephones(client) {
      if (!client || !client.telephone_whatsapp) return [];
      return String(client.telephone_whatsapp).split(/[/,;]/).map((t) => t.trim()).filter(Boolean);
    },
    lienTel(numero) {
      return `tel:${numero.replace(/[^\d+]/g, '')}`;
    },
    lienItineraire(adresse) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
    },
    formaterJourCourt(jour) {
      if (!jour) return '';
      return majuscule(depuisCle(jour).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
    },
    appliquerJourSaisi() {
      this.jourFiltre = this.jourSaisi || null;
    },
    auRetourAuPremierPlan() {
      if (!document.hidden && !this.active) this.charger();
    },
    async charger() {
      const numeroRequete = ++this.requete;
      this.chargement = true;
      this.aujourdhui = cleJour(new Date());
      try {
        const d = new Date();
        d.setDate(d.getDate() - JOURS_HISTORIQUE);
        const { data } = await livraisonsApi.lister({ du: cleJour(d) });
        if (numeroRequete === this.requete) this.toutes = data.data;
      } finally {
        if (numeroRequete === this.requete) this.chargement = false;
      }
    },
    // --- tirer pour actualiser
    debutTouch(e) {
      if (this.$refs.corps && this.$refs.corps.scrollTop <= 0 && !this.active) {
        this.pullDepart = e.touches[0].clientY;
        this.pullActif = true;
      }
    },
    bougerTouch(e) {
      if (!this.pullActif) return;
      const delta = e.touches[0].clientY - this.pullDepart;
      this.pull = delta > 0 ? Math.min(90, delta * 0.5) : 0;
    },
    finTouch() {
      if (this.pull >= 60) this.charger();
      this.pull = 0;
      this.pullActif = false;
    },
    // --- fiche
    ouvrir(l) {
      if (!l.commande) return;
      this.active = l;
      this.modeProbleme = false;
      const reste = Number(l.commande.reste_a_payer) || 0;
      this.form = { montant_recu: reste > 0 ? String(reste) : '', moyen_paiement: '', frais_livraison: '' };
    },
    fermer() {
      this.active = null;
      this.modeProbleme = false;
    },
    toutRecevoir() {
      this.form.montant_recu = String(this.resteActif);
    },
    retourTactile() {
      if (navigator.vibrate) navigator.vibrate(40);
    },
    async confirmerLivraison() {
      if (this.montantNum > 0 && !this.form.moyen_paiement) {
        this.$store.dispatch('notifications/erreur', 'Choisissez le moyen de paiement reçu.');
        return;
      }
      this.enCours = true;
      try {
        await livraisonsApi.marquerLivree(this.active._id, {
          montant_recu: this.montantNum,
          moyen_paiement: this.form.moyen_paiement,
          frais_livraison: Number(this.form.frais_livraison) || 0,
        });
        this.retourTactile();
        this.$store.dispatch('notifications/succes', `${this.active.commande.numero} marquée livrée.`);
        this.fermer();
        await this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de l’enregistrement');
      } finally {
        this.enCours = false;
      }
    },
    async confirmerProbleme() {
      this.enCours = true;
      try {
        await livraisonsApi.signalerProbleme(this.active._id);
        this.$store.dispatch('notifications/succes', `${this.active.commande.numero} marquée en échec de livraison.`);
        this.fermer();
        await this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de l’enregistrement');
      } finally {
        this.enCours = false;
      }
    },
    async deconnexion() {
      await this.$store.dispatch('auth/deconnexion');
      this.$router.push({ name: 'connexion' });
    },
  },
};
</script>

<style lang="scss" scoped>
$barre-onglets: 64px;

.app {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--sanaa-bg);
  color: var(--sanaa-text);
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
}
.muted { color: var(--sanaa-text-muted); font-size: 0.85rem; }

// ---------- barre du haut
.app__bar {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: calc(14px + env(safe-area-inset-top)) 18px 10px;
  background: var(--sanaa-bg);
  p { margin: 0; }
}
.app__marque { font-family: var(--sanaa-font-display); letter-spacing: 0.14em; font-size: 0.8rem; color: var(--sanaa-accent-2-dark); }
.app__salut { font-family: var(--sanaa-font-display); font-size: 1.45rem; font-weight: 600; margin-top: 2px !important; }
.app__date { font-size: 0.82rem; color: var(--sanaa-text-muted); margin-top: 2px !important; }
.app__actions { display: flex; gap: 8px; padding-top: 4px; }

.icone-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid var(--sanaa-border);
  background: var(--sanaa-surface);
  color: var(--sanaa-accent-2-dark);
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  &:active { transform: scale(0.94); }
  &.is-tourne i { animation: tourne 0.9s linear infinite; }
  &--clair { background: rgba(255, 255, 255, 0.18); border-color: transparent; color: #fff; }
}
@keyframes tourne { to { transform: rotate(360deg); } }

// ---------- corps scrollable
.app__corps {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  padding: 0 16px calc(#{$barre-onglets} + 24px + env(safe-area-inset-bottom));
}
.app__tirer {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 0.8rem;
  color: var(--sanaa-text-muted);
}

// ---------- hero
.hero {
  padding: 20px;
  border-radius: 22px;
  background: linear-gradient(145deg, var(--sanaa-accent-2-dark), var(--sanaa-accent-2));
  color: #fff;
  box-shadow: 0 10px 24px rgba(120, 80, 40, 0.25);
  p { margin: 0; }
}
.hero__label { font-size: 0.8rem; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.06em; }
.hero__montant { font-size: 2.3rem; font-weight: 700; line-height: 1.15; margin-top: 2px !important; }
.hero__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.25);
  div { display: flex; flex-direction: column; gap: 2px; }
  strong { font-size: 1.1rem; }
  span { font-size: 0.7rem; opacity: 0.85; line-height: 1.2; }
}
.hero__progression { margin-top: 14px; font-size: 0.75rem; opacity: 0.95; }
.hero__barre { height: 6px; border-radius: 6px; background: rgba(255, 255, 255, 0.28); overflow: hidden; margin-bottom: 6px; }
.hero__barre-remplie { height: 100%; background: #fff; border-radius: 6px; transition: width 0.4s; }

// ---------- jours
.jours { display: flex; gap: 8px; overflow-x: auto; padding: 16px 0 6px; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
.jour-chip {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 999px;
  border: 1px solid var(--sanaa-border);
  background: var(--sanaa-surface);
  color: var(--sanaa-text);
  font: inherit;
  font-size: 0.88rem;
  &.is-actif { background: var(--sanaa-text); border-color: var(--sanaa-text); color: #fff; }
  &--date { color: var(--sanaa-accent-2-dark); }
}
.jour-chip__n { min-width: 20px; padding: 1px 6px; border-radius: 999px; background: rgba(0, 0, 0, 0.1); font-size: 0.75rem; text-align: center; }
.is-actif .jour-chip__n { background: rgba(255, 255, 255, 0.25); }
.jour-chip__input { position: absolute; inset: 0; opacity: 0; width: 100%; font-size: 16px; }

.vide { text-align: center; color: var(--sanaa-text-muted); padding: 44px 0; margin: 0; }
.vide__icone { display: block; font-size: 2.4rem; margin-bottom: 8px; color: var(--sanaa-accent-1); }

// ---------- cartes
.carte {
  position: relative;
  margin-top: 12px;
  padding: 14px 14px 12px 18px;
  border-radius: 18px;
  background: var(--sanaa-surface);
  box-shadow: 0 2px 10px rgba(60, 40, 20, 0.07);
  overflow: hidden;
  transition: transform 0.12s;
  &:active { transform: scale(0.985); }
  &::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 5px; background: var(--sanaa-accent-2); }
  &.is-livree::before { background: var(--sanaa-success, #4caf50); }
  &.is-echec::before { background: var(--sanaa-danger, #c0392b); }
  p { margin: 0; }
}
.carte__haut { display: flex; align-items: center; gap: 8px; }
.carte__numero { font-size: 0.95rem; }
.carte__jour { margin-left: auto; font-size: 0.78rem; color: var(--sanaa-text-muted); }
.carte__client { font-size: 1.12rem; font-weight: 600; margin-top: 6px !important; }
.carte__client--supprime { color: var(--sanaa-text-muted); font-weight: 400; }
.carte__adresse { font-size: 0.85rem; color: var(--sanaa-text-muted); margin-top: 3px !important; }
.carte__bas { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; }
.carte__raccourcis { display: flex; gap: 8px; }

.montant { font-size: 0.85rem; &--du strong { font-size: 1.1rem; color: var(--sanaa-danger, #c0392b); } &--regle { color: var(--sanaa-success, #4caf50); font-weight: 600; } }

.raccourci {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  color: #fff;
  &--appel { background: var(--sanaa-success, #4caf50); }
  &--route { background: var(--sanaa-accent-2-dark); }
  &:active { transform: scale(0.92); }
}

.pastille { display: inline-flex; align-items: center; gap: 3px; padding: 2px 9px; border-radius: 999px; font-size: 0.72rem; font-weight: 600;
  &--ok { background: rgba(76, 175, 80, 0.16); color: var(--sanaa-success, #4caf50); }
  &--ko { background: rgba(192, 57, 43, 0.14); color: var(--sanaa-danger, #c0392b); }
}

// ---------- barre d'onglets
.onglets {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  height: calc(#{$barre-onglets} + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--sanaa-surface);
  border-top: 1px solid var(--sanaa-border);
  box-shadow: 0 -4px 16px rgba(60, 40, 20, 0.06);
}
.onglet {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border: none;
  background: none;
  color: var(--sanaa-text-muted);
  font: inherit;
  font-size: 0.72rem;
  i { font-size: 1.45rem; }
  &.is-actif { color: var(--sanaa-accent-2-dark); font-weight: 700; }
}
.onglet__badge {
  position: absolute;
  top: 7px;
  left: calc(50% + 8px);
  min-width: 18px;
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--sanaa-accent-2-dark);
  color: #fff;
  font-style: normal;
  font-size: 0.68rem;
  font-weight: 700;
  text-align: center;
  &--ko { background: var(--sanaa-danger, #c0392b); }
}

// ---------- fiche
.feuille {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  background: var(--sanaa-bg);
}
.feuille__bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(12px + env(safe-area-inset-top)) 16px 14px;
  background: linear-gradient(145deg, var(--sanaa-accent-2-dark), var(--sanaa-accent-2));
  color: #fff;
}
.feuille__titre { flex: 1; display: flex; flex-direction: column; strong { font-size: 1.05rem; } span { font-size: 0.78rem; opacity: 0.85; } }
.feuille__corps { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 14px 16px 24px; user-select: text; -webkit-user-select: text; }
.feuille__pied {
  flex-shrink: 0;
  display: flex;
  gap: 10px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: var(--sanaa-surface);
  border-top: 1px solid var(--sanaa-border);
  box-shadow: 0 -4px 16px rgba(60, 40, 20, 0.06);
}

.bloc {
  margin-bottom: 14px;
  padding: 16px;
  border-radius: 18px;
  background: var(--sanaa-surface);
  box-shadow: 0 2px 10px rgba(60, 40, 20, 0.05);
  p { margin: 0; }
  &--ok { border: 1px solid rgba(76, 175, 80, 0.4); }
  &--ko { border: 1px solid rgba(192, 57, 43, 0.4); }
}
.bloc__titre { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--sanaa-text-muted); margin-bottom: 8px !important; &--espace { margin-top: 18px !important; } }
.client-nom { font-size: 1.3rem; font-weight: 600; font-family: var(--sanaa-font-display); }
.appels { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.gros-lien {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 50px;
  border-radius: 14px;
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
  &--appel { background: var(--sanaa-success, #4caf50); }
  &--route { background: var(--sanaa-accent-2-dark); }
  &:active { opacity: 0.85; }
}
.adresse { margin-top: 14px; p { margin-bottom: 8px !important; color: var(--sanaa-text-muted); font-size: 0.92rem; } }
.produits { margin: 0; padding-left: 18px; line-height: 1.55; }

.ligne { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; font-size: 0.95rem; &--vert { color: var(--sanaa-success, #4caf50); } }
.reste {
  margin-top: 10px;
  padding: 14px;
  border-radius: 14px;
  background: var(--sanaa-accent-2-dark);
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  strong { font-size: 1.4rem; }
  &.is-regle { justify-content: center; gap: 6px; background: rgba(76, 175, 80, 0.15); color: var(--sanaa-success, #4caf50); font-weight: 600; }
}

.champ-gros {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 62px;
  padding: 0 14px;
  border-radius: 16px;
  border: 2px solid var(--sanaa-border);
  background: var(--sanaa-bg);
  &:focus-within { border-color: var(--sanaa-accent-2); }
  input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font: inherit; font-size: 1.7rem; font-weight: 700; color: var(--sanaa-text); }
  &--petit { height: 52px; input { font-size: 1.2rem; } }
}
.champ-gros__tout { border: none; padding: 8px 14px; border-radius: 999px; background: var(--sanaa-accent-2-dark); color: #fff; font: inherit; font-size: 0.85rem; font-weight: 600; }

.moyens { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.moyen {
  height: 50px;
  border-radius: 14px;
  border: 2px solid var(--sanaa-border);
  background: var(--sanaa-surface);
  color: var(--sanaa-text);
  font: inherit;
  font-weight: 600;
  &.is-actif { border-color: var(--sanaa-accent-2-dark); background: var(--sanaa-accent-2-dark); color: #fff; }
}

.btn {
  flex: 1;
  height: 54px;
  border-radius: 16px;
  border: none;
  font: inherit;
  font-size: 1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  &:active { transform: scale(0.98); }
  &:disabled { opacity: 0.6; }
  &--ok { flex: 2; background: var(--sanaa-success, #4caf50); color: #fff; }
  &--ko { flex: 2; background: var(--sanaa-danger, #c0392b); color: #fff; }
  &--contour { background: var(--sanaa-surface); border: 2px solid var(--sanaa-border); color: var(--sanaa-text-muted); }
}

// ---------- transition
.glisse-enter-active, .glisse-leave-active { transition: transform 0.28s cubic-bezier(0.22, 0.8, 0.3, 1), opacity 0.28s; }
.glisse-enter, .glisse-leave-to { transform: translateY(40px); opacity: 0; }
</style>
