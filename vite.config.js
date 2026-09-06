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
