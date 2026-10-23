<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <div>
        <h1>Relances clients</h1>
        <p class="sanaa-text-muted entete-sous">
          Le bouton WhatsApp ouvre la conversation avec le message déjà écrit. Une fois cliqué, le client disparaît de la liste.
        </p>
      </div>
      <el-button size="small" icon="el-icon-refresh" :loading="chargement" @click="chargerTout">Actualiser</el-button>
    </div>

    <el-tabs v-model="ongletActif">
      <el-tab-pane v-for="t in types" :key="t.cle" :name="t.cle">
        <span slot="label">{{ t.titre }} <span class="compteur" :class="{ 'is-vide': total(t.cle) === 0 }">{{ total(t.cle) }}</span></span>
      </el-tab-pane>
    </el-tabs>

    <section class="sanaa-card bloc" v-loading="chargement && donnees[ongletActif] !== null">
      <p class="sanaa-text-muted bloc__description">{{ typeActif.description }}</p>

      <template v-if="donnees[ongletActif] === null">
        <div v-for="n in 4" :key="n" class="sanaa-skeleton sanaa-skeleton--ligne" />
      </template>
      <p v-else-if="lignes.length === 0" class="vide"><i class="el-icon-circle-check" /> Personne à relancer pour le moment.</p>

      <ul v-else class="lignes">
        <li v-for="i in lignes" :key="i.cle" class="ligne">
          <div class="ligne__principal">
            <strong>{{ i.nom || 'Client sans nom' }}<template v-if="vueGlobale && codePays(i.pays_id)"> · {{ codePays(i.pays_id) }}</template></strong>
            <span class="ligne__tel sanaa-text-muted">{{ i.telephone }}</span>
            <span class="sanaa-text-muted ligne__detail">
              <template v-if="i.numero && ongletActif !== 'fidelisation'">{{ i.numero }} · </template>{{ i.detail }}
            </span>
          </div>
          <div class="ligne__droite">
            <strong v-if="i.montant !== null" class="ligne__montant">{{ i.montant | montant(deviseDe(i.pays_id)) }}</strong>
            <el-button
              size="small"
              icon="el-icon-chat-dot-round"
              class="btn-whatsapp"
              :loading="enCours === i.cle"
              @click="relancer(i)"
            >
              WhatsApp
            </el-button>
          </div>
        </li>
      </ul>
      <p v-if="total(ongletActif) > lignes.length" class="sanaa-text-muted plus">
        + {{ total(ongletActif) - lignes.length }} autres — affichage limité aux {{ lignes.length }} plus anciens.
      </p>
    </section>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import relancesApi from '@/services/relances.api';
import { lienWhatsAppRelance } from '@/utils/whatsapp';

const TYPES = [
  {
    cle: 'reste_a_payer',
    titre: 'Reste à payer',
    description: 'Colis livrés pour lesquels il reste un solde à régler. Proposé de nouveau après 3 jours si le client n\'a pas payé.',
  },
  {
    cle: 'avis',
    titre: 'Demande d\'avis',
    description: 'Colis livrés il y a 2 à 14 jours : demander au client son avis ou une photo. Une seule fois par commande.',
  },
  {
    cle: 'fidelisation',
    titre: 'Anciens clients',
    description: 'Clients dont la dernière commande date de 30 à 90 jours : prendre de leurs nouvelles. Pas plus d\'une fois par mois.',
  },
];

export default {
  name: 'Relances',
  data() {
    return {
      types: TYPES,
      ongletActif: 'reste_a_payer',
      donnees: { reste_a_payer: null, avis: null, fidelisation: null },
      chargement: false,
      enCours: null,
    };
  },
  computed: {
    ...mapState('paysContexte', ['paysActifId']),
    vueGlobale() {
      return !this.paysActifId;
    },
    typeActif() {
      return this.types.find((t) => t.cle === this.ongletActif);
    },
    lignes() {
      const d = this.donnees[this.ongletActif];
      return d ? d.items : [];
    },
  },
  watch: {
    paysActifId() {
      this.chargerTout();
    },
  },
  mounted() {
    this.chargerTout();
  },
  methods: {
    total(cle) {
      const d = this.donnees[cle];
      return d ? d.total : 0;
    },
    paysDe(paysId) {
      return this.$store.state.paysContexte.liste.find((p) => p._id === paysId) || null;
    },
    codePays(paysId) {
      const p = this.paysDe(paysId);
      return p ? p.code : '';
    },
    deviseDe(paysId) {
      const p = this.paysDe(paysId);
      return p && p.devise_locale_id ? p.devise_locale_id.symbole || p.devise_locale_id.code : '';
    },
    async chargerTout() {
      this.chargement = true;
      try {
        const params = { pays_id: this.paysActifId || undefined };
        const reponses = await Promise.all(this.types.map((t) => relancesApi.lister({ ...params, type: t.cle })));
        const donnees = {};
        this.types.forEach((t, k) => { donnees[t.cle] = reponses[k].data.data; });
        this.donnees = donnees;
      } catch (e) {
        this.$store.dispatch('notifications/erreur', 'Impossible de charger les relances.');
      } finally {
        this.chargement = false;
      }
    },
    async relancer(item) {
      const type = this.ongletActif;
      const lien = lienWhatsAppRelance(type, item, this.paysDe(item.pays_id));
      if (!lien) {
        this.$store.dispatch('notifications/erreur', 'Numéro du client absent ou illisible : impossible d\'ouvrir WhatsApp.');
        return;
      }
      // Ouverture immédiate (le navigateur n'autorise une nouvelle fenêtre que
      // pendant le clic), puis seulement on mémorise la relance.
      window.open(lien, '_blank', 'noopener');
      this.enCours = item.cle;
      try {
        await relancesApi.enregistrer({ type, commande_id: item.commande_id || undefined, client_id: item.client_id });
        const d = this.donnees[type];
        this.donnees = { ...this.donnees, [type]: { ...d, total: Math.max(0, d.total - 1), items: d.items.filter((x) => x.cle !== item.cle) } };
      } catch (e) {
        this.$store.dispatch('notifications/erreur', 'La relance n\'a pas pu être enregistrée : le client restera dans la liste.');
      } finally {
        this.enCours = null;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.entete-sous { margin: 4px 0 0; max-width: 640px; }
.compteur {
  display: inline-block;
  min-width: 22px;
  margin-left: 4px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--sanaa-accent-2-dark);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  text-align: center;
  &.is-vide { background: var(--sanaa-border); color: var(--sanaa-text); }
}
.bloc__description { margin: 0 0 8px; font-size: 0.85rem; }
.vide { color: var(--sanaa-success, #4caf50); font-weight: 600; margin: 12px 0; }
.lignes { list-style: none; margin: 8px 0 0; padding: 0; }
.ligne {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 6px;
  border-top: 1px solid var(--sanaa-border);
}
.ligne__principal { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ligne__tel, .ligne__detail { font-size: 0.82rem; }
.ligne__droite { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.ligne__montant { color: var(--sanaa-danger, #c0392b); white-space: nowrap; }
.btn-whatsapp { color: #1da851; border-color: #25D366; }
.plus { margin: 10px 0 0; font-size: 0.82rem; }
</style>
