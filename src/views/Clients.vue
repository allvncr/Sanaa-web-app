<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Clients</h1>
      <el-button type="primary" icon="el-icon-plus" v-can="'clients:creer'" @click="ouvrirCreation">Nouveau client</el-button>
    </div>

    <div class="sanaa-toolbar">
      <el-input v-model="recherche" placeholder="Rechercher (nom, téléphone)" prefix-icon="el-icon-search" style="max-width:280px" @input="charger" />
    </div>

    <div class="sanaa-card sanaa-table-scroll" v-loading="chargement">
      <el-table :data="clients" stripe @row-click="ouvrirFiche">
        <el-table-column prop="nom" label="Nom" min-width="160" />
        <el-table-column prop="telephone_whatsapp" label="Téléphone" min-width="150" />
        <el-table-column prop="adresse" label="Adresse" min-width="180" class-name="hide-mobile" />
        <el-table-column label="Créé le" min-width="110" class-name="hide-mobile">
          <template slot-scope="{ row }">{{ row.createdAt | dateFr }}</template>
        </el-table-column>
      </el-table>
      <p v-if="!chargement && clients.length === 0" class="sanaa-empty">Aucun client.</p>
    </div>

    <el-dialog :title="clientActuel ? 'Fiche client' : 'Nouveau client'" :visible.sync="dialogueOuvert" width="480px">
      <el-form :model="form" label-position="top">
        <el-form-item label="Nom" required><el-input v-model="form.nom" /></el-form-item>
        <el-form-item label="Téléphone / WhatsApp"><el-input v-model="form.telephone_whatsapp" /></el-form-item>
        <el-form-item label="Ville"><el-input v-model="form.ville" /></el-form-item>
        <el-form-item label="Adresse"><el-input v-model="form.adresse" /></el-form-item>
        <el-form-item label="Notes"><el-input v-model="form.notes" type="textarea" /></el-form-item>
      </el-form>

      <div v-if="clientActuel" class="fiche-indicateurs">
        <div class="sanaa-kpi">
          <span class="sanaa-kpi-label">Commandes</span>
          <span class="sanaa-kpi-value">{{ indicateurs.nombre_commandes }}</span>
        </div>
        <div class="sanaa-kpi">
          <span class="sanaa-kpi-label">Dépensé</span>
          <span class="sanaa-kpi-value">{{ indicateurs.montant_depense | montant }}</span>
        </div>
      </div>

      <span slot="footer">
        <el-button @click="dialogueOuvert = false">Fermer</el-button>
        <el-button type="primary" @click="enregistrer">Enregistrer</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import clientsApi from '@/services/clients.api';

export default {
  name: 'Clients',
  data() {
    return {
      chargement: false,
      clients: [],
      recherche: '',
      dialogueOuvert: false,
      clientActuel: null,
      indicateurs: {},
      form: { nom: '', telephone_whatsapp: '', ville: '', adresse: '', notes: '' },
    };
  },
  computed: { ...mapState('paysContexte', { paysActifId: 'paysActifId' }) },
  watch: { paysActifId() { this.charger(); } },
  mounted() { this.charger(); },
  methods: {
    async charger() {
      this.chargement = true;
      try {
        const { data } = await clientsApi.lister({ pays_id: this.paysActifId || undefined, q: this.recherche || undefined });
        this.clients = data.data;
      } finally {
        this.chargement = false;
      }
    },
    ouvrirCreation() {
      this.clientActuel = null;
      this.form = { nom: '', telephone_whatsapp: '', ville: '', adresse: '', notes: '' };
      this.dialogueOuvert = true;
    },
    async ouvrirFiche(row) {
      this.clientActuel = row;
      this.form = { nom: row.nom, telephone_whatsapp: row.telephone_whatsapp, ville: row.ville, adresse: row.adresse, notes: row.notes };
      const { data } = await clientsApi.historiqueCommandes(row._id);
      this.indicateurs = data.data.indicateurs;
      this.dialogueOuvert = true;
    },
    async enregistrer() {
      try {
        if (this.clientActuel) {
          await clientsApi.modifier(this.clientActuel._id, this.form);
        } else {
          await clientsApi.creer({ ...this.form, pays_id: this.paysActifId });
        }
        this.$store.dispatch('notifications/succes', 'Client enregistré.');
        this.dialogueOuvert = false;
        this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de l’enregistrement');
      }
    },
  },
};
</script>

<style scoped>
.el-table >>> .el-table__row { cursor: pointer; }
.fiche-indicateurs { display: flex; gap: 12px; margin-top: 8px; }
</style>
