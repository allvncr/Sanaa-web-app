import api from './api';

export default {
  login(email, mot_de_passe) {
    return api.post('/auth/login', { email, mot_de_passe });
  },
  refresh(refreshToken) {
    return api.post('/auth/refresh', { refreshToken });
  },
  logout() {
    return api.post('/auth/logout');
  },
  me() {
    return api.get('/auth/me');
  },
};
