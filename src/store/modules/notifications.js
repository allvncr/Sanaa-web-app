import { Message } from 'element-ui';

export default {
  namespaced: true,
  actions: {
    succes(_, message) {
      Message({ message, type: 'success', duration: 2500 });
    },
    erreur(_, message) {
      Message({ message, type: 'error', duration: 4000 });
    },
    avertir(_, { message }) {
      Message({ message, type: 'warning', duration: 3500 });
    },
  },
};
