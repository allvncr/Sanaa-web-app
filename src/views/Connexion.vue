<template>
  <div class="connexion">
    <div class="connexion__panel">
      <div class="connexion__brand">
        <h1>SANAA</h1>
        <p>Bijoux personnalisés — Gestion globale</p>
      </div>

      <el-form :model="form" :rules="regles" ref="formulaire" @submit.native.prevent="soumettre" label-position="top">
        <el-form-item label="Adresse email" prop="email">
          <el-input v-model="form.email" placeholder="vous@sanaa.com" autofocus />
        </el-form-item>
        <el-form-item label="Mot de passe" prop="mot_de_passe">
          <el-input v-model="form.mot_de_passe" type="password" show-password placeholder="••••••••" />
        </el-form-item>

        <el-alert v-if="erreur" :title="erreur" type="error" show-icon :closable="false" class="connexion__erreur" />

        <el-button type="primary" native-type="submit" :loading="chargement" class="connexion__submit" round>
          Se connecter
        </el-button>
      </el-form>
    </div>

    <div class="connexion__visuel hide-mobile">
      <div class="connexion__visuel-inner">
        <p class="connexion__quote">« Chaque lien. Chaque nom. Chaque émotion. »</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Connexion',
  data() {
    return {
      form: { email: '', mot_de_passe: '' },
      regles: {
        email: [{ required: true, message: 'Email requis', trigger: 'blur' }],
        mot_de_passe: [{ required: true, message: 'Mot de passe requis', trigger: 'blur' }],
      },
      chargement: false,
      erreur: '',
    };
  },
  methods: {
    async soumettre() {
      this.erreur = '';
      const valide = await this.$refs.formulaire.validate().catch(() => false);
      if (!valide) return;
      this.chargement = true;
      try {
        await this.$store.dispatch('auth/connexion', this.form);
        const redirect = this.$route.query.redirect || { name: 'dashboard' };
        this.$router.push(redirect);
      } catch (err) {
        if (err.response) {
          this.erreur = err.response.data?.error?.message || 'Identifiants invalides';
        } else {
          // Pas de réponse du serveur (CORS, backend hors ligne, réseau) — un
          // message générique "identifiants invalides" serait trompeur ici.
          this.erreur = "Impossible de joindre le serveur. Vérifiez votre connexion ou réessayez plus tard.";
        }
      } finally {
        this.chargement = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.connexion {
  min-height: 100vh;
  display: flex;
  background: var(--sanaa-bg);
}

.connexion__panel {
  flex: 1;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px;
  margin: 0 auto;

  @media (max-width: 640px) { padding: 24px; max-width: 100%; }
}

.connexion__brand {
  margin-bottom: 32px;
  text-align: center;

  h1 {
    font-family: var(--sanaa-font-display);
    font-size: 2.4rem;
    letter-spacing: 0.12em;
    color: var(--sanaa-accent-2-dark);
  }
  p {
    color: var(--sanaa-text-muted);
    margin-top: 4px;
    font-size: 0.85rem;
    letter-spacing: 0.04em;
  }
}

.connexion__erreur { margin-bottom: 14px; }

.connexion__submit {
  width: 100%;
  margin-top: 8px;
}

.connexion__visuel {
  flex: 1;
  background: linear-gradient(155deg, var(--sanaa-accent-1), var(--sanaa-accent-2));
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.connexion__visuel-inner { max-width: 420px; padding: 40px; }
.connexion__quote {
  font-family: var(--sanaa-font-display);
  font-size: 1.8rem;
  color: #fff;
  text-align: center;
  line-height: 1.4;
}
</style>
