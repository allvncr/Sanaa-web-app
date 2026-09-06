<template>
  <div class="sanaa-page">
    <div class="sanaa-page-header">
      <h1>Journal d'activité</h1>
    </div>

    <div class="sanaa-toolbar">
      <el-select v-model="filtres.entite" placeholder="Entité" clearable size="small" style="width:160px" @change="charger">
        <el-option v-for="e in entites" :key="e" :value="e" :label="e" />
      </el-select>
      <el-date-picker
        v-model="filtres.plage"
        type="daterange"
        size="small"
        range-separator="→"
        value-format="yyyy-MM-dd"
        @change="charger"
      />
    </div>

    <div class="sanaa-card sanaa-table-scroll" v-loading="chargement">
      <el-table :data="items" stripe size="small">
        <el-table-column label="Date" min-width="150">
          <template slot-scope="{ row }">{{ row.date | dateHeureFr }}</template>
        </el-table-column>
        <el-table-column label="Utilisateur" min-width="160">
          <template slot-scope="{ row }">{{ row.utilisateur_id ? row.utilisateur_id.nom : 'Système' }}</template>
        </el-table-column>
        <el-table-column prop="entite" label="Entité" min-width="120" />
        <el-table-column label="Action" min-width="120">
          <template slot-scope="{ row }">
            <el-tag size="mini" :type="couleurAction(row.action)">{{ row.action }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-if="meta.total"
        style="margin-top:12px"
        layout="prev, pager, next"
        :page-size="meta.limite"
        :current-page="meta.page"
        :total="meta.total"
        @current-change="onPage"
      />
      <p v-if="!chargement && items.length === 0" class="sanaa-empty">Aucune activité enregistrée.</p>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import dashboardApi from '@/services/dashboard.api';

export default {
  name: 'JournalActivite',
  data() {
    return {
      chargement: false,
      items: [],
      meta: { page: 1, limite: 50, total: 0 },
      filtres: { entite: '', plage: [] },
      entites: ['Commande', 'Client', 'Produit', 'Utilisateur', 'Depense'],
    };
  },
  computed: { ...mapState('paysContexte', { paysActifId: 'paysActifId' }) },
  watch: { paysActifId() { this.charger(); } },
  mounted() { this.charger(); },
  methods: {
    couleurAction(a) {
      return { creation: 'success', modification: '', suppression: 'danger', changement_statut: 'warning' }[a] || '';
    },
    async charger(page = 1) {
      this.chargement = true;
      const [date_de, date_a] = this.filtres.plage && this.filtres.plage.length ? this.filtres.plage : [undefined, undefined];
      try {
        const { data } = await dashboardApi.journalActivite({
          pays_id: this.paysActifId || undefined,
          entite: this.filtres.entite || undefined,
          date_de,
          date_a,
          page,
        });
        this.items = data.data;
        this.meta = data.meta;
      } finally {
        this.chargement = false;
      }
    },
    onPage(page) {
      this.charger(page);
    },
  },
};
</script>
