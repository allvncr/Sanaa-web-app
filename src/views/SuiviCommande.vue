<template>
  <div class="suivi">
    <div class="suivi__brand">
      <h1>SANAA</h1>
      <p>Suivez votre commande</p>
    </div>

    <div class="suivi__carte">
      <el-form :model="form" label-position="top" @submit.native.prevent="chercher">
        <el-form-item label="Numéro de commande">
          <el-input v-model="form.numero" placeholder="ex. CI-2026-000148" @keyup.enter.native="chercher" />
        </el-form-item>
        <el-form-item label="Votre numéro de téléphone">
          <el-input v-model="form.telephone" placeholder="Celui utilisé lors de la commande" @keyup.enter.native="chercher" />
        </el-form-item>
        <el-button type="primary" round class="suivi__submit" :loading="chargement" @click="chercher">
          Voir ma commande
        </el-button>
      </el-form>

      <el-alert v-if="erreur" :title="erreur" type="error" show-icon :closable="false" class="suivi__erreur" />

      <div v-if="resultat" class="suivi__resultat">
        <h2>Commande {{ resultat.numero }}</h2>
        <p class="suivi__date">Passée le {{ resultat.creee_le | dateFr }}</p>

        <el-alert
          v-if="resultat.probleme"
          :title="resultat.probleme"
          type="warning"
          show-icon
          :closable="false"
          style="margin-bottom:18px"
        />
        <ul v-else class="suivi__etapes">
          <li v-for="e in resultat.etapes" :key="e.cle" :class="{ 'is-atteinte': e.atteinte }">
            <span class="suivi__puce" />
            <span class="suivi__etape-texte">
              {{ e.libelle }}
              <span v-if="e.atteinte && e.date" class="suivi__etape-date">{{ e.date | dateFr }}</span>
            </span>
          </li>
        </ul>

        <div class="suivi__articles">
          <h3>Votre/vos bijou(x)</h3>
          <ul>
            <li v-for="(a, i) in resultat.articles" :key="i">
              {{ a.produit }}<template v-if="a.couleur"> — {{ a.couleur }}</template>
              <template v-if="a.quantite > 1"> ×{{ a.quantite }}</template>
            </li>
          </ul>
        </div>

        <!-- Réservé pour une prochaine version : mise en avant de produits,
             réductions... une fois que ce point de suivi devient un véritable
             espace client (voir échange du 26/09/2026). Volontairement vide
             pour l'instant. -->
      </div>
    </div>

    <p class="suivi__aide">
      Besoin d'aide ? Contactez-nous sur WhatsApp avec votre numéro de commande.
    </p>
  </div>
</template>

<script>
import suiviApi from '@/services/suivi.api';

export default {
  name: 'SuiviCommande',
  data() {
    return {
      form: { numero: this.$route.query.numero || '', telephone: '' },
      chargement: false,
      erreur: '',
      resultat: null,
    };
  },
  mounted() {
    if (this.form.numero && this.form.telephone) this.chercher();
  },
  methods: {
    async chercher() {
      this.erreur = '';
      this.resultat = null;
      if (!this.form.numero.trim() || !this.form.telephone.trim()) {
        this.erreur = 'Merci de renseigner le numéro de commande et le téléphone.';
        return;
      }
      this.chargement = true;
      try {
        const { data } = await suiviApi.suivre(this.form.numero.trim(), this.form.telephone.trim());
        this.resultat = data.data;
      } catch (err) {
        this.erreur = err.response?.data?.error?.message || 'Impossible de joindre le serveur. Réessayez plus tard.';
      } finally {
        this.chargement = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.suivi {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px;
  background: linear-gradient(155deg, var(--sanaa-accent-1), var(--sanaa-accent-2));
}

.suivi__brand {
  text-align: center;
  margin-bottom: 24px;
  h1 {
    font-family: var(--sanaa-font-display);
    font-size: 2.2rem;
    letter-spacing: 0.12em;
    color: #fff;
  }
  p { color: rgba(255, 255, 255, 0.85); margin-top: 4px; }
}

.suivi__carte {
  width: 100%;
  max-width: 480px;
  background: var(--sanaa-surface);
  border-radius: var(--sanaa-radius-md);
  padding: 28px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
}

.suivi__submit { width: 100%; margin-top: 4px; }
.suivi__erreur { margin-top: 16px; }

.suivi__resultat { margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--sanaa-border); }
.suivi__resultat h2 { margin: 0 0 2px; }
.suivi__date { color: var(--sanaa-text-muted); font-size: 0.85rem; margin: 0 0 20px; }

.suivi__etapes {
  list-style: none;
  margin: 0 0 24px;
  padding: 0;
  li {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 6px 0;
    color: var(--sanaa-text-muted);
  }
  li.is-atteinte { color: var(--sanaa-text); font-weight: 600; }
}
.suivi__puce {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
  background: var(--sanaa-border);
}
.is-atteinte .suivi__puce { background: var(--sanaa-success, #4caf50); }
.suivi__etape-date { display: block; font-weight: 400; font-size: 0.78rem; color: var(--sanaa-text-muted); }

.suivi__articles h3 { font-size: 0.9rem; margin: 0 0 8px; color: var(--sanaa-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.suivi__articles ul { margin: 0; padding-left: 18px; }

.suivi__aide { color: rgba(255, 255, 255, 0.85); margin-top: 28px; font-size: 0.85rem; text-align: center; }
</style>
