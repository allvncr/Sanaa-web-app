<template>
  <div class="lm">
    <header class="lm__topbar">
      <span class="lm__brand">SANAA</span>
      <button type="button" class="lm__deconnexion" @click="deconnexion">
        <i class="el-icon-switch-button" /> Quitter
      </button>
    </header>

    <!-- Écran détail / action d'une livraison -->
    <div v-if="active" class="lm__detail" v-loading="enCours">
      <button type="button" class="lm__retour" @click="active = null">
        <i class="el-icon-arrow-left" /> Retour à la liste
      </button>

      <div class="lm__carte">
        <div class="lm__entete-commande">
          <strong>{{ active.commande.numero }}</strong>
          <StatutBadge :statut="active.commande.statut_livraison" :libelles="statutsLivraison" />
        </div>
        <p class="lm__client">
          {{ active.commande.client && active.commande.client.nom ? active.commande.client.nom : 'Client sans nom' }}
        </p>
        <a
          v-if="active.commande.client && active.commande.client.telephone_whatsapp"
          class="lm__tel"
          :href="`tel:${active.commande.client.telephone_whatsapp}`"
        >
          <i class="el-icon-phone" /> {{ active.commande.client.telephone_whatsapp }}
        </a>
        <p v-if="active.commande.client && active.commande.client.adresse" class="lm__adresse">
          <i class="el-icon-location-outline" /> {{ active.commande.client.adresse }}
        </p>

        <ul class="lm__produits">
          <li v-for="(p, i) in active.commande.lignes" :key="i">
            {{ p.produit }}<template v-if="p.couleur"> {{ p.couleur }}</template><template v-if="p.detail"> ({{ p.detail }})</template>
            <template v-if="p.quantite > 1"> ×{{ p.quantite }}</template>
            <span v-if="p.personnalisation" class="lm__muted"> — « {{ p.personnalisation }} »</span>
          </li>
        </ul>

        <div class="lm__reste">
          Reste à payer : <strong>{{ active.commande.reste_a_payer | montant }}</strong>
        </div>
      </div>

      <template v-if="!modeProbleme">
        <div class="lm__carte">
          <h3>Marquer livrée</h3>
          <label class="lm__label">Montant reçu du client</label>
          <el-input-number v-model="form.montant_recu" :min="0" controls-position="right" class="lm__input-large" />

          <label class="lm__label">Moyen de paiement</label>
          <el-select v-model="form.moyen_paiement" placeholder="Choisir" class="lm__input-large">
            <el-option v-for="m in moyensPaiement" :key="m.nom" :value="m.nom" :label="m.nom" />
          </el-select>

          <label class="lm__label">Frais de livraison perçus <span class="lm__muted">(optionnel)</span></label>
          <el-input-number v-model="form.frais_livraison" :min="0" controls-position="right" class="lm__input-large" />

          <el-button type="success" round class="lm__gros-bouton" :loading="enCours" @click="confirmerLivraison">
            <i class="el-icon-check" /> Confirmer la livraison
          </el-button>
        </div>

        <button type="button" class="lm__lien-probleme" @click="modeProbleme = true">
          Livraison impossible (client absent, échec...)
        </button>
      </template>

      <template v-else>
        <div class="lm__carte lm__carte--alerte">
          <p>Cette commande sera marquée « Retour / échec ». Vous pourrez la reprendre un autre jour.</p>
          <div class="lm__deux-boutons">
            <el-button plain round @click="modeProbleme = false">Annuler</el-button>
            <el-button type="danger" round :loading="enCours" @click="confirmerProbleme">Confirmer l'échec</el-button>
          </div>
        </div>
      </template>
    </div>

    <!-- Liste des livraisons -->
    <div v-else class="lm__liste">
      <div class="lm__totaux">
        <div class="lm__total-item">
          <strong class="lm__total-valeur">{{ restantes.length }}</strong>
          <span class="lm__total-libelle">colis restant{{ restantes.length > 1 ? 's' : '' }}</span>
        </div>
        <div class="lm__total-item">
          <strong class="lm__total-valeur">{{ totalAPercevoir | montant }}</strong>
          <span class="lm__total-libelle">à percevoir</span>
        </div>
      </div>
      <div v-if="livreesAujourdhui.length" class="lm__sous-total">
        Livré aujourd'hui : {{ livreesAujourdhui.length }} · Encaissé {{ montantLivreAujourdhui | montant }}
      </div>

      <div class="lm__filtres">
        <button type="button" :class="{ 'is-actif': statutFiltre === 'attente' }" @click="statutFiltre = 'attente'">
          En attente ({{ enAttente.length }})
        </button>
        <button
          v-if="echecs.length"
          type="button"
          :class="{ 'is-actif': statutFiltre === 'echec' }"
          @click="statutFiltre = 'echec'"
        >
          Échec ({{ echecs.length }})
        </button>
        <button type="button" :class="{ 'is-actif': statutFiltre === 'livrees' }" @click="statutFiltre = 'livrees'">
          Livrées
        </button>
      </div>

      <div class="lm__filtre-jour">
        <el-date-picker
          v-model="jourFiltre"
          type="date"
          value-format="yyyy-MM-dd"
          placeholder="Filtrer par jour"
          size="small"
          class="lm__date-picker"
        />
        <button v-if="jourFiltre" type="button" class="lm__effacer-jour" @click="jourFiltre = null">Tous les jours</button>
      </div>

      <div v-loading="chargement" class="lm__cartes">
        <p v-if="!chargement && listeAffichee.length === 0" class="lm__vide">Rien à afficher ici.</p>

        <div
          v-for="l in listeAffichee"
          :key="l._id"
          class="lm__parcelle"
          :class="{ 'is-livree': l.livree, 'is-probleme': l.commande && l.commande.statut_livraison === 'Retour_echec' }"
          @click="ouvrir(l)"
        >
          <template v-if="l.commande">
            <div class="lm__parcelle-haut">
              <strong>{{ l.commande.numero }}</strong>
              <el-tag v-if="l.livree" type="success" size="mini"><i class="el-icon-check" /> Livrée</el-tag>
              <el-tag v-else-if="l.commande.statut_livraison === 'Retour_echec'" type="danger" size="mini">Échec</el-tag>
              <span v-else class="lm__parcelle-jour">{{ formaterJourCourt(l.jour) }}</span>
            </div>
            <div class="lm__parcelle-client">
              {{ l.commande.client && l.commande.client.nom ? l.commande.client.nom : 'Client sans nom' }}
            </div>
            <div v-if="l.commande.client && l.commande.client.adresse" class="lm__muted">
              <i class="el-icon-location-outline" /> {{ l.commande.client.adresse }}
            </div>
            <div v-if="!l.livree" class="lm__parcelle-reste">
              Reste à payer : {{ l.commande.reste_a_payer | montant }}
            </div>
            <div v-else class="lm__muted">
              {{ formaterJourCourt(l.jour) }} — {{ Number(l.montant_recu) | montant }} encaissé{{ Number(l.frais_livraison) > 0 ? ` + ${formaterMontant(l.frais_livraison)} de frais` : '' }}
            </div>
          </template>
          <template v-else>
            <strong class="lm__muted">Commande supprimée</strong>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import livraisonsApi from '@/services/livraisons.api';
import StatutBadge from '@/components/common/StatutBadge.vue';
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
// livrées sans limite (retour V0.1, 29/09/2026 — écran repensé en liste globale
// filtrable plutôt qu'en calendrier jour par jour).
const JOURS_HISTORIQUE = 90;

export default {
  name: 'LivraisonMobile',
  components: { StatutBadge },
  data() {
    return {
      toutes: [],
      chargement: false,
      requete: 0,
      statutFiltre: 'attente',
      jourFiltre: null,
      active: null,
      modeProbleme: false,
      enCours: false,
      form: { montant_recu: 0, moyen_paiement: '', frais_livraison: 0 },
      statutsLivraison: this.$i18n.messages.fr.statuts.livraison,
    };
  },
  computed: {
    ...mapState({ paysContexte: (state) => state.paysContexte }),
    moyensPaiement() {
      const pays = this.paysContexte.liste[0];
      return pays ? (pays.moyens_paiement || []).filter((m) => m.actif) : [];
    },
    restantes() {
      return this.toutes.filter((l) => !l.livree);
    },
    enAttente() {
      return this.restantes.filter((l) => !l.commande || l.commande.statut_livraison !== 'Retour_echec');
    },
    echecs() {
      return this.restantes.filter((l) => l.commande && l.commande.statut_livraison === 'Retour_echec');
    },
    livrees() {
      return this.toutes
        .filter((l) => l.livree)
        .slice()
        .sort((a, b) => new Date(b.livree_le) - new Date(a.livree_le));
    },
    totalAPercevoir() {
      return this.restantes.reduce((s, l) => s + (l.commande ? Number(l.commande.reste_a_payer) || 0 : 0), 0);
    },
    livreesAujourdhui() {
      const aujourdhui = cleJour(new Date());
      return this.toutes.filter((l) => l.livree && l.jour === aujourdhui);
    },
    montantLivreAujourdhui() {
      return this.livreesAujourdhui.reduce((s, l) => s + Number(l.montant_recu || 0), 0);
    },
    listeAffichee() {
      const base = this.statutFiltre === 'echec' ? this.echecs : this.statutFiltre === 'livrees' ? this.livrees : this.enAttente;
      return this.jourFiltre ? base.filter((l) => l.jour === this.jourFiltre) : base;
    },
  },
  async mounted() {
    if (this.paysContexte.liste.length === 0) {
      await this.$store.dispatch('paysContexte/initialiser');
    }
    this.charger();
  },
  methods: {
    formaterMontant,
    formaterJourCourt(jour) {
      if (!jour) return '';
      return majuscule(depuisCle(jour).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
    },
    async charger() {
      const numeroRequete = ++this.requete;
      this.chargement = true;
      try {
        const d = new Date();
        d.setDate(d.getDate() - JOURS_HISTORIQUE);
        const { data } = await livraisonsApi.lister({ du: cleJour(d) });
        if (numeroRequete === this.requete) this.toutes = data.data;
      } finally {
        if (numeroRequete === this.requete) this.chargement = false;
      }
    },
    ouvrir(l) {
      if (!l.commande || l.livree) return;
      this.active = l;
      this.modeProbleme = false;
      this.form = { montant_recu: Number(l.commande.reste_a_payer) || 0, moyen_paiement: '', frais_livraison: 0 };
    },
    async confirmerLivraison() {
      if (this.form.montant_recu > 0 && !this.form.moyen_paiement) {
        this.$store.dispatch('notifications/erreur', 'Choisissez le moyen de paiement reçu.');
        return;
      }
      this.enCours = true;
      try {
        await livraisonsApi.marquerLivree(this.active._id, this.form);
        this.$store.dispatch('notifications/succes', `${this.active.commande.numero} marquée livrée.`);
        this.active = null;
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
        this.active = null;
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
.lm {
  min-height: 100vh;
  background: var(--sanaa-bg);
  padding-bottom: 24px;
}

.lm__topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: var(--sanaa-surface);
  border-bottom: 1px solid var(--sanaa-border);
}
.lm__brand {
  font-family: var(--sanaa-font-display);
  font-size: 1.3rem;
  letter-spacing: 0.1em;
  color: var(--sanaa-accent-2-dark);
}
.lm__deconnexion {
  border: none;
  background: none;
  color: var(--sanaa-text-muted);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 4px;
}

.lm__muted { color: var(--sanaa-text-muted); font-size: 0.85rem; }

// --- liste
.lm__totaux {
  display: flex;
  gap: 10px;
  padding: 16px 16px 0;
}
.lm__total-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 16px 10px;
  border-radius: var(--sanaa-radius-md);
  background: var(--sanaa-accent-2-dark);
  color: #fff;
}
.lm__total-valeur { font-size: 1.5rem; line-height: 1.1; }
.lm__total-libelle { font-size: 0.75rem; opacity: 0.85; }

.lm__sous-total {
  margin: 10px 16px 0;
  padding: 8px 12px;
  border-radius: var(--sanaa-radius-sm, 8px);
  background: rgba(76, 175, 80, 0.12);
  color: var(--sanaa-success, #4caf50);
  font-size: 0.82rem;
  text-align: center;
}

.lm__filtres {
  display: flex;
  gap: 8px;
  padding: 16px 16px 0;
  overflow-x: auto;
}
.lm__filtres button {
  flex-shrink: 0;
  border: 1px solid var(--sanaa-border);
  background: var(--sanaa-surface);
  color: var(--sanaa-text-muted);
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 0.85rem;
  &.is-actif {
    background: var(--sanaa-accent-2-dark);
    border-color: var(--sanaa-accent-2-dark);
    color: #fff;
  }
}

.lm__filtre-jour {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px 0;
}
.lm__date-picker { width: 170px; }
.lm__effacer-jour {
  border: none;
  background: none;
  color: var(--sanaa-accent-2);
  font-size: 0.82rem;
  padding: 0;
}

.lm__cartes { padding: 16px 16px 0; display: flex; flex-direction: column; gap: 10px; min-height: 120px; }
.lm__vide { text-align: center; color: var(--sanaa-text-muted); padding: 40px 0; }

.lm__parcelle {
  padding: 14px;
  border: 1px solid var(--sanaa-border);
  border-radius: var(--sanaa-radius-md);
  background: var(--sanaa-surface);
  &.is-livree { border-left: 4px solid var(--sanaa-success); opacity: 0.75; }
  &.is-probleme { border-left: 4px solid var(--sanaa-danger, #c0392b); }
}
.lm__parcelle-haut { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 1.02rem; }
.lm__parcelle-jour { color: var(--sanaa-text-muted); font-size: 0.8rem; }
.lm__parcelle-client { margin-bottom: 2px; }
.lm__parcelle-reste { margin-top: 6px; font-weight: 600; color: var(--sanaa-danger, #c0392b); font-size: 0.9rem; }

// --- détail / action
.lm__detail { padding: 12px 16px; }
.lm__retour {
  border: none;
  background: none;
  color: var(--sanaa-accent-2-dark);
  font-size: 0.9rem;
  padding: 8px 0;
  display: flex;
  align-items: center;
  gap: 4px;
}
.lm__carte {
  background: var(--sanaa-surface);
  border-radius: var(--sanaa-radius-md);
  padding: 16px;
  margin-bottom: 14px;
  h3 { margin: 0 0 12px; font-size: 1rem; }
}
.lm__carte--alerte { border: 1px solid var(--sanaa-danger, #c0392b); }
.lm__entete-commande { display: flex; justify-content: space-between; align-items: center; font-size: 1.05rem; margin-bottom: 6px; }
.lm__client { margin: 0 0 4px; font-weight: 600; }
.lm__tel { display: inline-flex; align-items: center; gap: 4px; color: var(--sanaa-accent-2-dark); margin-bottom: 4px; }
.lm__adresse { margin: 2px 0 0; color: var(--sanaa-text-muted); font-size: 0.9rem; }
.lm__produits { margin: 12px 0; padding-left: 18px; font-size: 0.9rem; }
.lm__reste { padding-top: 10px; border-top: 1px solid var(--sanaa-border); font-size: 0.95rem; }

.lm__label { display: block; margin: 14px 0 6px; font-size: 0.85rem; color: var(--sanaa-text-muted); &:first-of-type { margin-top: 0; } }
.lm__input-large { width: 100%; }
.lm__gros-bouton { width: 100%; margin-top: 20px; height: 48px; font-size: 1.05rem; }
.lm__lien-probleme {
  display: block;
  width: 100%;
  text-align: center;
  border: none;
  background: none;
  color: var(--sanaa-text-muted);
  text-decoration: underline;
  padding: 8px;
}
.lm__deux-boutons { display: flex; gap: 10px; margin-top: 12px; :deep(.el-button) { flex: 1; } }
</style>
