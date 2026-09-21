<template>
  <div class="sanaa-card" v-loading="chargement">
    <h3 style="margin-top:0">Traçabilité</h3>

    <template v-if="historique">
      <div class="trace-resume">
        <div>
          <span class="trace-resume__label">Saisie par</span>
          <strong>{{ auteur(historique.cree_par) }}</strong>
          <span class="sanaa-text-muted"> le {{ historique.cree_le | dateHeureFr }}</span>
        </div>
        <div>
          <span class="trace-resume__label">Dernière modification</span>
          <template v-if="historique.derniere_modification">
            <strong>{{ auteur(historique.derniere_modification.utilisateur) }}</strong>
            <span class="sanaa-text-muted"> le {{ historique.derniere_modification.date | dateHeureFr }}</span>
          </template>
          <span v-else class="sanaa-text-muted">Aucune — jamais modifiée depuis sa création</span>
        </div>
      </div>

      <el-timeline class="trace-timeline">
        <el-timeline-item
          v-for="e in historique.evenements"
          :key="e._id"
          :timestamp="`${dateHeure(e.date)} — ${auteur(e.utilisateur)}`"
          :type="e.action === 'creation' ? 'success' : 'primary'"
          placement="top"
          size="normal"
        >
          <div class="trace-evenement">
            <strong>{{ e.resume }}</strong>
            <ul v-if="e.changements.length" class="trace-changements">
              <li v-for="c in e.changements" :key="c.champ">
                <span class="trace-champ">{{ c.libelle }}</span>
                <template v-if="c.detail">
                  <ul>
                    <li v-for="(d, i) in c.detail" :key="i">{{ d }}</li>
                  </ul>
                </template>
                <template v-else-if="c.avant === null || c.avant === undefined"> : {{ c.apres }}</template>
                <template v-else> : <span class="trace-avant">{{ c.avant }}</span> → <strong>{{ c.apres }}</strong></template>
              </li>
            </ul>
          </div>
        </el-timeline-item>
      </el-timeline>
    </template>
  </div>
</template>

<script>
import commandesApi from '@/services/commandes.api';
import { formaterDateHeure } from '@/utils/format';

export default {
  name: 'CommandeHistorique',
  props: {
    commandeId: { type: String, required: true },
    // Incrémenté par la page parente après chaque action pour recharger la trace.
    version: { type: Number, default: 0 },
  },
  data() {
    return { chargement: false, historique: null };
  },
  watch: {
    commandeId: 'charger',
    version: 'charger',
  },
  mounted() {
    this.charger();
  },
  methods: {
    async charger() {
      this.chargement = true;
      try {
        const { data } = await commandesApi.historique(this.commandeId);
        this.historique = data.data;
      } catch (e) {
        this.historique = null;
      } finally {
        this.chargement = false;
      }
    },
    dateHeure: formaterDateHeure,
    auteur(utilisateur) {
      return utilisateur && utilisateur.nom ? utilisateur.nom : 'Système / import';
    },
  },
};
</script>

<style lang="scss" scoped>
.trace-resume {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 32px;
  margin-bottom: 18px;
  padding: 10px 14px;
  background: var(--sanaa-bg-alt);
  border-radius: var(--sanaa-radius-md);
  font-size: 0.9rem;
}
.trace-resume__label {
  display: block;
  font-size: 0.75rem;
  color: var(--sanaa-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.sanaa-text-muted { color: var(--sanaa-text-muted); font-size: 0.85rem; }
.trace-timeline { padding-left: 4px; }
.trace-evenement { font-size: 0.9rem; }
.trace-changements {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  ul { margin: 2px 0 0 16px; padding: 0; list-style: disc; color: var(--sanaa-text-muted); }
}
.trace-champ { color: var(--sanaa-text-muted); }
.trace-avant { text-decoration: line-through; color: var(--sanaa-text-muted); }
</style>
