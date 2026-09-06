<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Utilisateurs</h1>
      <el-button type="primary" icon="el-icon-plus" v-can="'utilisateurs:creer'" @click="ouvrirCreation">Nouvel utilisateur</el-button>
    </div>

    <div class="sanaa-card sanaa-table-scroll" v-loading="chargement">
      <el-table :data="utilisateurs" stripe>
        <el-table-column prop="nom" label="Nom" min-width="160" />
        <el-table-column prop="email" label="Email" min-width="200" />
        <el-table-column label="Rôle" min-width="150">
          <template slot-scope="{ row }">{{ row.role_id ? row.role_id.nom : '' }}</template>
        </el-table-column>
        <el-table-column label="Pays" min-width="160" class-name="hide-mobile">
          <template slot-scope="{ row }">
            <span v-if="row.role_id && row.role_id.portee === 'global'">Tous</span>
            <span v-else>{{ (row.pays_autorises || []).map(p => p.code).join(', ') || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Actif" min-width="80">
          <template slot-scope="{ row }">
            <el-tag :type="row.actif ? 'success' : 'info'" size="mini">{{ row.actif ? 'Actif' : 'Inactif' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="" min-width="100">
          <template slot-scope="{ row }">
            <el-button size="mini" icon="el-icon-edit" @click="ouvrirEdition(row)" v-can="'utilisateurs:modifier'" />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog :title="utilisateurActuel ? 'Modifier' : 'Nouvel utilisateur'" :visible.sync="dialogueOuvert" width="480px">
      <el-form :model="form" label-position="top">
        <el-form-item label="Nom" required><el-input v-model="form.nom" /></el-form-item>
        <el-form-item label="Email" required><el-input v-model="form.email" :disabled="!!utilisateurActuel" /></el-form-item>
        <el-form-item :label="utilisateurActuel ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'" :required="!utilisateurActuel">
          <el-input v-model="form.mot_de_passe" type="password" show-password />
        </el-form-item>
        <el-form-item label="Rôle" required>
          <el-select v-model="form.role_id" style="width:100%" @change="onChangeRole">
            <el-option v-for="r in roles" :key="r._id" :value="r._id" :label="r.nom" />
          </el-select>
        </el-form-item>
        <el-form-item label="Pays autorisés" v-if="roleSelectionneEstPays">
          <el-select v-model="form.pays_autorises" multiple style="width:100%">
            <el-option v-for="p in paysContexte.liste" :key="p._id" :value="p._id" :label="p.nom" />
          </el-select>
        </el-form-item>
        <el-form-item label="Actif" v-if="utilisateurActuel">
          <el-switch v-model="form.actif" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button @click="dialogueOuvert = false">Annuler</el-button>
        <el-button type="primary" @click="enregistrer">Enregistrer</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import utilisateursApi from '@/services/utilisateurs.api';
import referentielsApi from '@/services/referentiels.api';

export default {
  name: 'Utilisateurs',
  data() {
    return {
      chargement: false,
      utilisateurs: [],
      roles: [],
      dialogueOuvert: false,
      utilisateurActuel: null,
      form: { nom: '', email: '', mot_de_passe: '', role_id: '', pays_autorises: [], actif: true },
    };
  },
  computed: {
    ...mapState({ paysContexte: (state) => state.paysContexte }),
    roleSelectionneEstPays() {
      const role = this.roles.find((r) => r._id === this.form.role_id);
      return role ? role.portee === 'pays' : true;
    },
  },
  async mounted() {
    const { data } = await referentielsApi.listerRoles();
    this.roles = data.data;
    this.charger();
  },
  methods: {
    async charger() {
      this.chargement = true;
      try {
        const { data } = await utilisateursApi.lister();
        this.utilisateurs = data.data;
      } finally {
        this.chargement = false;
      }
    },
    onChangeRole() {
      if (!this.roleSelectionneEstPays) this.form.pays_autorises = [];
    },
    ouvrirCreation() {
      this.utilisateurActuel = null;
      this.form = { nom: '', email: '', mot_de_passe: '', role_id: '', pays_autorises: [], actif: true };
      this.dialogueOuvert = true;
    },
    ouvrirEdition(row) {
      this.utilisateurActuel = row;
      this.form = {
        nom: row.nom,
        email: row.email,
        mot_de_passe: '',
        role_id: row.role_id ? row.role_id._id : '',
        pays_autorises: (row.pays_autorises || []).map((p) => p._id),
        actif: row.actif,
      };
      this.dialogueOuvert = true;
    },
    async enregistrer() {
      try {
        if (this.utilisateurActuel) {
          const payload = { nom: this.form.nom, role_id: this.form.role_id, pays_autorises: this.form.pays_autorises, actif: this.form.actif };
          if (this.form.mot_de_passe) payload.mot_de_passe = this.form.mot_de_passe;
          await utilisateursApi.modifier(this.utilisateurActuel._id, payload);
        } else {
          await utilisateursApi.creer(this.form);
        }
        this.$store.dispatch('notifications/succes', 'Utilisateur enregistré.');
        this.dialogueOuvert = false;
        this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Échec de l’enregistrement');
      }
    },
  },
};
</script>
