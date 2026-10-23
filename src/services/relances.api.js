import api from './api';

export default {
  lister(params) {
    return api.get('/relances', { params });
  },
  enregistrer(corps) {
    return api.post('/relances', corps);
  },
};
