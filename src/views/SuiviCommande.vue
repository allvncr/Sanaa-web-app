<template>
  <div class="suivi">
    <div class="suivi__brand">
      <h1>SANAA</h1>
      <p>Suivez votre commande</p>
    </div>

    <div class="suivi__carte">
      <template v-if="!resultat">
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
      </template>

      <div v-else class="suivi__resultat">
        <button type="button" class="suivi__nouvelle-recherche" @click="nouvelleRecherche">
          <i class="el-icon-arrow-left" /> Suivre un autre colis
        </button>

        <div class="suivi__colis-entete">
          <div class="suivi__colis-icone"><i class="el-icon-box" /></div>
          <div>
            <h2>Commande {{ resultat.numero }}</h2>
            <p class="suivi__date">Passée le {{ resultat.creee_le | dateFr }}</p>
          </div>
        </div>

        <el-alert
          v-if="resultat.probleme"
          :title="resultat.probleme"
          type="warning"
          show-icon
          :closable="false"
          class="suivi__probleme"
        />

        <template v-else>
          <div class="suivi__eta" :class="{ 'is-livree': livree }">
            <span class="suivi__eta-label">{{ livree ? 'Livrée' : 'Livraison estimée' }}</span>
            <strong class="suivi__eta-date">{{ dateEtaAffichee }}</strong>
          </div>

          <div class="suivi__barre">
            <div class="suivi__barre-fond" />
            <div class="suivi__barre-remplie" :style="{ width: pourcentageProgres + '%' }" />
            <div
              v-for="(e, i) in resultat.etapes"
              :key="e.cle"
              class="suivi__barre-point"
              :class="{ 'is-atteinte': e.atteinte }"
              :style="{ left: (i / (resultat.etapes.length - 1)) * 100 + '%' }"
            />
          </div>

          <ul class="suivi__etapes">
            <li v-for="e in resultat.etapes" :key="e.cle" :class="{ 'is-atteinte': e.atteinte }">
              <span class="suivi__puce" />
              <span class="suivi__etape-texte">
                {{ e.libelle }}
                <span v-if="e.atteinte && e.date" class="suivi__etape-date">{{ e.date | dateFr }}</span>
                <span v-else-if="e.date_estimee" class="suivi__etape-date suivi__etape-date--estimee">
                  Estimé le {{ e.date_estimee | dateFr }}
                </span>
              </span>
            </li>
          </ul>
        </template>

        <div class="suivi__articles">
          <h3>Votre/vos bijou(x)</h3>
          <ul class="suivi__liste-articles">
            <li v-for="(a, i) in resultat.articles" :key="i">
              <div class="suivi__article-ligne">
                <div class="suivi__article-titre">
                  {{ a.produit }}<template v-if="a.couleur"> — {{ a.couleur }}</template>
                </div>
                <strong class="suivi__article-prix">{{ fmt(a.sous_total) }}</strong>
              </div>
              <div v-if="a.quantite > 1" class="suivi__article-detail">{{ a.quantite }} × {{ fmt(a.prix_unitaire) }}</div>
              <div v-if="a.detail" class="suivi__article-detail">{{ a.detail }}</div>
              <div v-if="a.personnalisation" class="suivi__article-detail">Personnalisation : « {{ a.personnalisation }} »</div>
            </li>
          </ul>
        </div>

        <div v-if="resultat.finances" class="suivi__paiement">
          <h3>Paiement</h3>
          <div class="suivi__paiement-ligne">
            <span>Total des bijoux</span>
            <span>{{ fmt(resultat.finances.total) }}</span>
          </div>
          <div v-if="resultat.finances.reduction > 0" class="suivi__paiement-ligne suivi__paiement-ligne--vert">
            <span>Réduction</span>
            <span>− {{ fmt(resultat.finances.reduction) }}</span>
          </div>
          <div v-if="resultat.finances.reduction > 0" class="suivi__paiement-ligne suivi__paiement-ligne--gras">
            <span>Total à payer</span>
            <span>{{ fmt(resultat.finances.total_net) }}</span>
          </div>

          <template v-if="resultat.finances.paiements.length">
            <div v-for="(p, i) in resultat.finances.paiements" :key="i" class="suivi__paiement-ligne suivi__paiement-ligne--vert">
              <span>
                {{ p.type === 'avance' ? 'Avance versée' : 'Paiement reçu' }}
                <small>{{ p.date | dateFr }}<template v-if="p.moyen"> · {{ p.moyen }}</template></small>
              </span>
              <span>− {{ fmt(p.montant) }}</span>
            </div>
          </template>
          <div v-else class="suivi__paiement-ligne suivi__paiement-ligne--discret">
            <span>Aucune avance enregistrée</span>
            <span>{{ fmt(0) }}</span>
          </div>

          <template v-if="resultat.finances.frais_livraison > 0">
            <div class="suivi__paiement-ligne suivi__paiement-ligne--gras">
              <span>Reste à payer sur la commande</span>
              <span>{{ fmt(resultat.finances.reste_a_payer) }}</span>
            </div>
            <div class="suivi__paiement-ligne">
              <span>Frais de livraison <small>à régler à la livraison, en plus du solde</small></span>
              <span>+ {{ fmt(resultat.finances.frais_livraison) }}</span>
            </div>
          </template>

          <div class="suivi__reste" :class="{ 'is-regle': montantAPrevoir === 0 }">
            <template v-if="montantAPrevoir === 0">
              <i class="el-icon-circle-check" /> Commande entièrement réglée
            </template>
            <template v-else>
              <span class="suivi__reste-label">{{ resultat.finances.frais_livraison > 0 ? 'Total à prévoir à la livraison' : livree ? 'Reste à payer' : 'Reste à payer à la livraison' }}</span>
              <strong class="suivi__reste-montant">{{ fmt(montantAPrevoir) }}</strong>
            </template>
          </div>
        </div>

        <div v-if="resultat.client" class="suivi__livraison">
          <h3>Livraison</h3>
          <p v-if="resultat.client.nom">{{ resultat.client.nom }}</p>
          <p v-if="resultat.client.telephone_whatsapp"><i class="el-icon-phone" /> {{ resultat.client.telephone_whatsapp }}</p>
          <p v-if="resultat.client.adresse"><i class="el-icon-location-outline" /> {{ resultat.client.adresse }}</p>
        </div>
      </div>
    </div>

    <p class="suivi__aide">
      Besoin d'aide ? Contactez-nous sur WhatsApp avec votre numéro de commande.
    </p>
  </div>
</template>

<script>
import suiviApi from '@/services/suivi.api';
import { formaterDate, formaterMontant } from '@/utils/format';

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
  computed: {
    etapeLivraison() {
      return this.resultat && this.resultat.etapes ? this.resultat.etapes.find((e) => e.cle === 'livree') : null;
    },
    livree() {
      return !!(this.etapeLivraison && this.etapeLivraison.atteinte);
    },
    // Ce que le client doit sortir le jour de la livraison : solde + frais de
    // livraison du pays (qui ne sont pas inclus dans le solde de la commande).
    montantAPrevoir() {
      const f = this.resultat && this.resultat.finances;
      if (!f) return 0;
      return f.frais_livraison > 0 ? f.a_prevoir_livraison : f.reste_a_payer;
    },
    dateEtaAffichee() {
      if (!this.etapeLivraison) return '';
      return formaterDate(this.livree ? this.etapeLivraison.date : this.etapeLivraison.date_estimee);
    },
    pourcentageProgres() {
      if (!this.resultat || !this.resultat.etapes) return 0;
      const total = this.resultat.etapes.length;
      if (total <= 1) return 0;
      const atteintes = this.resultat.etapes.filter((e) => e.atteinte).length;
      return Math.max(0, ((atteintes - 1) / (total - 1)) * 100);
    },
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
    fmt(montant) {
      const devise = this.resultat && this.resultat.finances ? this.resultat.finances.devise : '';
      return formaterMontant(montant, devise);
    },
    nouvelleRecherche() {
      this.resultat = null;
      this.erreur = '';
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

.suivi__nouvelle-recherche {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  color: var(--sanaa-accent-2-dark);
  font-size: 0.85rem;
  padding: 0 0 18px;
}

.suivi__colis-entete { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
.suivi__colis-icone {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 14px;
  background: var(--sanaa-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  color: var(--sanaa-accent-2-dark);
}
.suivi__resultat h2 { margin: 0; font-size: 1.1rem; }
.suivi__date { color: var(--sanaa-text-muted); font-size: 0.85rem; margin: 2px 0 0; }

.suivi__probleme { margin-bottom: 20px; }

.suivi__eta {
  text-align: center;
  padding: 16px;
  border-radius: var(--sanaa-radius-md);
  background: var(--sanaa-bg);
  margin-bottom: 22px;
  &.is-livree { background: rgba(76, 175, 80, 0.12); }
}
.suivi__eta-label { display: block; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--sanaa-text-muted); }
.suivi__eta-date { display: block; font-size: 1.3rem; margin-top: 4px; color: var(--sanaa-text); }
.is-livree .suivi__eta-date { color: var(--sanaa-success, #4caf50); }

.suivi__barre {
  position: relative;
  height: 4px;
  margin: 0 6px 30px;
}
.suivi__barre-fond, .suivi__barre-remplie {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 4px;
}
.suivi__barre-fond { width: 100%; background: var(--sanaa-border); }
.suivi__barre-remplie { background: var(--sanaa-success, #4caf50); transition: width 0.3s; }
.suivi__barre-point {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--sanaa-border);
  transform: translate(-50%, -50%);
  &.is-atteinte { background: var(--sanaa-success, #4caf50); }
}

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
.suivi__etape-date--estimee { font-style: italic; }

.suivi__articles h3, .suivi__livraison h3 {
  font-size: 0.9rem;
  margin: 0 0 8px;
  color: var(--sanaa-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.suivi__liste-articles { margin: 0; padding: 0; list-style: none; }
.suivi__liste-articles li:not(:last-child) { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed var(--sanaa-border); }
.suivi__article-ligne { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.suivi__article-prix { white-space: nowrap; }
.suivi__article-titre { font-weight: 600; }

.suivi__paiement {
  margin-top: 22px;
  padding: 16px;
  border-radius: var(--sanaa-radius-md);
  background: var(--sanaa-bg);
  h3 { font-size: 0.9rem; margin: 0 0 10px; color: var(--sanaa-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
}
.suivi__paiement-ligne {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 5px 0;
  font-size: 0.92rem;
  small { display: block; color: var(--sanaa-text-muted); font-size: 0.75rem; }
  &--vert { color: var(--sanaa-success, #4caf50); }
  &--gras { font-weight: 700; border-top: 1px solid var(--sanaa-border); margin-top: 4px; padding-top: 8px; }
  &--discret { color: var(--sanaa-text-muted); }
}
.suivi__reste {
  margin-top: 12px;
  padding: 14px;
  border-radius: var(--sanaa-radius-md);
  background: var(--sanaa-accent-2-dark);
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  &.is-regle { justify-content: center; background: rgba(76, 175, 80, 0.15); color: var(--sanaa-success, #4caf50); font-weight: 600; gap: 6px; }
}
.suivi__reste-label { font-size: 0.85rem; opacity: 0.9; }
.suivi__reste-montant { font-size: 1.25rem; white-space: nowrap; }
.suivi__article-detail { color: var(--sanaa-text-muted); font-size: 0.85rem; margin-top: 2px; }

.suivi__livraison {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--sanaa-border);
  p { margin: 0 0 4px; display: flex; align-items: center; gap: 6px; }
}

.suivi__aide { color: rgba(255, 255, 255, 0.85); margin-top: 28px; font-size: 0.85rem; text-align: center; }
</style>
