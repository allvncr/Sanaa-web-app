<template>
  <svg
    v-if="chemin"
    class="sparkline"
    :viewBox="`0 0 ${largeur} ${hauteur}`"
    preserveAspectRatio="none"
    role="img"
    aria-hidden="true"
  >
    <path :d="aire" :fill="couleur" fill-opacity="0.14" />
    <path :d="chemin" fill="none" :stroke="couleur" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
    <circle :cx="dernier.x" :cy="dernier.y" r="2.6" :fill="couleur" />
  </svg>
</template>

<script>
// Mini-courbe de tendance pour les cartes KPI : un simple tracé SVG (pas de
// bibliothèque de graphiques par carte, donc léger même avec une dizaine de cartes).
export default {
  name: 'Sparkline',
  props: {
    valeurs: { type: Array, default: () => [] },
    couleur: { type: String, default: '#CEA77B' },
  },
  data() {
    return { largeur: 120, hauteur: 34 };
  },
  computed: {
    nombres() {
      return this.valeurs.map((v) => Number(v) || 0);
    },
    points() {
      const n = this.nombres;
      if (n.length < 2) return [];
      const max = Math.max(...n);
      const min = Math.min(...n);
      const ecart = max - min || 1;
      const marge = 3;
      return n.map((v, i) => ({
        x: (i / (n.length - 1)) * this.largeur,
        y: marge + (1 - (v - min) / ecart) * (this.hauteur - 2 * marge),
      }));
    },
    chemin() {
      if (!this.points.length) return '';
      return this.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    },
    aire() {
      return `${this.chemin} L${this.largeur},${this.hauteur} L0,${this.hauteur} Z`;
    },
    dernier() {
      return this.points[this.points.length - 1];
    },
  },
};
</script>

<style scoped>
.sparkline {
  display: block;
  width: 100%;
  height: 34px;
  margin-top: 4px;
}
</style>
