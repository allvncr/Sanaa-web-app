<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Pays</h1>
      <el-button type="primary" icon="el-icon-plus" v-can="'pays:creer'" @click="ouvrirCreation">Nouveau pays</el-button>
    </div>

    <div class="sanaa-grid sanaa-grid--pays" v-loading="chargement">
      <div v-for="p in pays" :key="p._id" class="sanaa-card">
        <div class="pays-card__header">
          <h3>{{ p.nom }}</h3>
          <div style="display:flex; align-items:center; gap:6px;">
            <el-tag size="mini" :type="p.actif ? '' : 'info'">{{ p.code }}</el-tag>
          </div>
        </div>
        <p class="sanaa-text-muted">Devise : {{ p.devise_locale_id ? p.devise_locale_id.code : '—' }}</p>
        <p class="sanaa-text-muted" v-if="p.est_pays_historique_sans_suffixe">Export sans suffixe (pays historique)</p>
        <p class="sanaa-text-muted" v-if="!p.actif">Désactivé</p>
        <div class="pays-card__moyens">
          <el-tag v-for="m in p.moyens_paiement" :key="m._id" size="mini" style="margin: 2px" :type="m.actif ? '' : 'info'">
            {{ m.nom }}
          </el-tag>
        </div>
        <div class="pays-card__actions">
          <el-button size="mini" icon="el-icon-edit" v-can="'pays:modifier'" @click="ouvrirEdition(p)">Modifier</el-button>
          <el-button size="mini" icon="el-icon-delete" type="danger" plain v-can="'pays:supprimer'" @click="supprimer(p)">
            Supprimer
          </el-button>
        </div>
      </div>
    </div>

    <el-dialog :title="paysActuel ? 'Modifier le pays' : 'Nouveau pays'" :visible.sync="dialogueOuvert" width="420px">
      <el-form :model="form" label-position="top">
        <el-form-item label="Code (ex. SN)" required>
          <el-input v-model="form.code" maxlength="4" :disabled="!!paysActuel" />
        </el-form-item>
        <el-form-item label="Nom" required><el-input v-model="form.nom" /></el-form-item>
        <el-form-item label="Devise locale" required>
          <el-select v-model="form.devise_locale_id" style="width:100%">
            <el-option v-for="d in devises" :key="d._id" :value="d._id" :label="`${d.code} — ${d.nom}`" />
          </el-select>
        </el-form-item>
        <el-form-item label="Export sans suffixe (pays historique)">
          <el-switch v-model="form.est_pays_historique_sans_suffixe" />
        </el-form-item>
        <el-form-item label="Actif" v-if="paysActuel">
          <el-switch v-model="form.actif" />
        </el-form-item>
      </el-form>
      <p class="sanaa-text-muted">
        Les moyens de paiement (Wave, Orange Money, Espèces, Mobile Money) sont attribués automatiquement à
        tout pays et ne se configurent plus manuellement.
      </p>
      <span slot="footer">
        <el-button @click="dialogueOuvert = false">Annuler</el-button>
        <el-button type="primary" @click="enregistrer">{{ paysActuel ? 'Enregistrer' : 'Créer' }}</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import paysApi from '@/services/pays.api';
import referentielsApi from '@/services/referentiels.api';

function formeVide() {
  return { code: '', nom: '', devise_locale_id: '', est_pays_historique_sans_suffixe: false, actif: true };
}

export default {
  name: 'Pays',
  data() {
    return {
      chargement: false,
      pays: [],
      devises: [],
      dialogueOuvert: false,
      paysActuel: null,
      form: formeVide(),
    };
  },
  async mounted() {
    const { data } = await referentielsApi.listerDevises();
    this.devises = data.data;
    this.charger();
  },
  methods: {
    async charger() {
      this.chargement = true;
      try {
        const { data } = await paysApi.lister();
        this.pays = data.data;
        this.$store.commit('paysContexte/DEFINIR_LISTE', data.data);
      } finally {
        this.chargement = false;
      }
    },
    ouvrirCreation() {
      this.paysActuel = null;
      this.form = formeVide();
      this.dialogueOuvert = true;
    },
    ouvrirEdition(p) {
      this.paysActuel = p;
      this.form = {
        code: p.code,
        nom: p.nom,
        devise_locale_id: p.devise_locale_id ? p.devise_locale_id._id : '',
        est_pays_historique_sans_suffixe: p.est_pays_historique_sans_suffixe,
        actif: p.actif,
      };
      this.dialogueOuvert = true;
    },
    async enregistrer() {
      try {
        if (this.paysActuel) {
          await paysApi.modifier(this.paysActuel._id, this.form);
          this.$store.dispatch('notifications/succes', 'Pays modifié.');
        } else {
          await paysApi.creer(this.form);
          this.$store.dispatch('notifications/succes', 'Pays créé.');
        }
        this.dialogueOuvert = false;
        this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || "Échec de l'enregistrement");
      }
    },
    async supprimer(p) {
      try {
        await this.$confirm(`Supprimer définitivement « ${p.nom} » ?`, 'Confirmation', { type: 'warning' });
      } catch (e) {
        return;
      }
      try {
        await paysApi.supprimer(p._id);
        this.$store.dispatch('notifications/succes', 'Pays supprimé.');
        this.charger();
      } catch (err) {
        this.$store.dispatch('notifications/erreur', err.response?.data?.error?.message || 'Suppression impossible');
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.sanaa-grid--pays { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
.pays-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.pays-card__moyens { margin-bottom: 10px; }
.pays-card__actions { display: flex; gap: 8px; margin-top: 10px; }
.sanaa-text-muted { color: var(--sanaa-text-muted); font-size: 0.85rem; }
</style>
