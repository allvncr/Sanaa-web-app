import Vue from 'vue';
import VueI18n from 'vue-i18n';
import fr from './fr';

Vue.use(VueI18n);

// Français en V0, extensible à l'anglais pour de futurs pays anglophones
// (section 2.1 de l'architecture).
export default new VueI18n({
  locale: 'fr',
  fallbackLocale: 'fr',
  messages: { fr },
});
