<template>
  <span class="sanaa-badge-statut" :class="classe">{{ libelle }}</span>
</template>

<script>
import { classeStatut } from '@/utils/format';

export default {
  name: 'StatutBadge',
  props: {
    statut: { type: String, required: true },
    libelles: { type: Object, default: () => ({}) },
  },
  computed: {
    classe() {
      return classeStatut(this.statut);
    },
    libelle() {
      return this.libelles[this.statut] || this.statut;
    },
  },
};
</script>
