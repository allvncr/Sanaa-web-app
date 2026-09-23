<template>
  <div v-if="total > 0" class="pagination-barre">
    <span class="pagination-barre__resume">
      {{ debut }}–{{ fin }} sur {{ total }}
    </span>
    <el-pagination
      background
      layout="prev, pager, next, sizes"
      :page-sizes="[10, 20, 50, 100]"
      :current-page="page"
      :page-size="limite"
      :total="total"
      @current-change="(p) => $emit('update:page', p)"
      @size-change="(l) => $emit('update:limite', l)"
    />
  </div>
</template>

<script>
// Barre de pagination réutilisée par les tableaux (Commandes, Clients,
// Utilisateurs...) : le composant est purement d'affichage, la page vue reste
// propriétaire de `page`/`limite`/`total` et recharge ses données au changement.
export default {
  name: 'PaginationBarre',
  props: {
    page: { type: Number, required: true },
    limite: { type: Number, required: true },
    total: { type: Number, required: true },
  },
  computed: {
    debut() {
      return this.total === 0 ? 0 : (this.page - 1) * this.limite + 1;
    },
    fin() {
      return Math.min(this.page * this.limite, this.total);
    },
  },
};
</script>

<style scoped>
.pagination-barre {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}
.pagination-barre__resume {
  font-size: 0.85rem;
  color: var(--sanaa-text-muted);
}
</style>
