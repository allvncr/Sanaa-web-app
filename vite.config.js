const { defineConfig } = require('vite');
const vue2Plugin = require('@vitejs/plugin-vue2');
const createVuePlugin = vue2Plugin.default || vue2Plugin;
const path = require('path');

module.exports = defineConfig({
  plugins: [createVuePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    // Bibliothèques stables séparées du code de l'application : après chaque
    // déploiement, le navigateur ne retélécharge que le code qui a changé.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Les graphiques (ApexCharts) restent à part : chargés seulement sur le Dashboard.
          if (id.includes('node_modules') && !/apexcharts/.test(id)) return 'vendor';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
