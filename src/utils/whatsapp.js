import { formaterMontant } from './format';

// Repli quand le pays n'a pas d'indicatif renseigné (écran Pays).
const INDICATIFS_PAR_CODE = {
  CI: '225', TG: '228', BJ: '229', SN: '221', BF: '226', ML: '223', NE: '227', GN: '224',
  CM: '237', GA: '241', CG: '242', CD: '243', FR: '33', BE: '32',
};

// Pays où le 0 initial du numéro local fait partie du numéro international
// (Côte d'Ivoire et Bénin depuis leur passage à 10 chiffres) ; ailleurs ce 0
// est un simple préfixe national qu'il faut retirer.
const GARDENT_LE_ZERO = ['225', '229'];

export function indicatifDuPays(pays) {
  if (!pays) return '';
  return String(pays.indicatif || INDICATIFS_PAR_CODE[pays.code] || '').replace(/\D/g, '');
}

/**
 * Numéro au format attendu par wa.me (chiffres uniquement, indicatif inclus).
 * Un champ client peut contenir plusieurs numéros séparés par "/" : on prend le
 * premier. Retourne '' si le numéro est inexploitable.
 */
export function numeroInternational(telephone, indicatif) {
  const premier = String(telephone || '').split(/[/,;]/)[0].trim();
  if (!premier) return '';
  if (premier.startsWith('+')) return premier.replace(/\D/g, '');

  const chiffres = premier.replace(/\D/g, '');
  if (chiffres.startsWith('00')) return chiffres.slice(2);
  if (!indicatif) return '';
  // Déjà saisi avec l'indicatif, sans le "+".
  if (chiffres.startsWith(indicatif) && chiffres.length >= indicatif.length + 8) return chiffres;
  const national = !GARDENT_LE_ZERO.includes(indicatif) && chiffres.startsWith('0') ? chiffres.slice(1) : chiffres;
  return indicatif + national;
}

/**
 * Message adapté à l'étape où en est la commande, avec le lien de suivi.
 * `commande` vient de l'API (client_id peuplé) ; `options.devise` est le
 * symbole de la devise (ex. "F CFA") et `options.jourLivraison` le jour prévu
 * au calendrier, s'il existe.
 *
 * Ton et mise en forme repris des messages que l'équipe envoyait déjà à la main
 * (retour du 09/10/2026) : vouvoiement chaleureux, emojis, court, avec le lien
 * de suivi et le numéro de commande en dernière ligne.
 */
export function messageCommande(commande, { lien, devise = '', jourLivraison = '', fraisLivraison = 0 } = {}) {
  const client = commande.client_id || {};
  const prenom = client.nom ? String(client.nom).trim().split(/\s+/)[0] : '';
  const salut = prenom ? `Bonjour ${prenom} 😊` : 'Bonjour 😊';
  const numero = commande.numero;
  const reste = Number(commande.reste_a_payer) || 0;
  // Le surplus déjà versé par le client compte comme frais de livraison réglés.
  const surplus = Number(commande.surplus_regle) || 0;
  const frais = Math.max(0, (Number(fraisLivraison) || 0) - surplus);
  const m = (v) => formaterMontant(v, devise);

  // Les frais de livraison ne sont pas inclus dans le solde de la commande : on
  // annonce le total à prévoir le jour de la livraison.
  let paiement = '';
  if (reste > 0 && frais > 0) paiement = `💰 À prévoir à la livraison : ${m(reste)} de solde + ${m(frais)} de frais de livraison, soit ${m(reste + frais)}.`;
  else if (reste > 0) paiement = `💰 Solde à régler à la livraison : ${m(reste)}.`;
  else if (frais > 0) paiement = `✅ Votre commande est déjà réglée, il ne reste que les frais de livraison : ${m(frais)}.`;
  else if (surplus > 0) paiement = '✅ Tout est déjà réglé, rien à payer à la livraison.';

  const suivi = `Suivez votre commande ici 👉 ${lien}\n(votre numéro de téléphone vous sera demandé)`;
  const pied = `Commande ${numero}`;
  const assembler = (...blocs) => blocs.filter(Boolean).join('\n\n');

  if (commande.statut_commande === 'Annulee') {
    return assembler(`${salut}`, `Votre commande a été annulée. Pour toute question, n'hésitez pas à nous écrire 🙏`, pied);
  }
  switch (commande.statut_livraison) {
    case 'Livree':
      return assembler(
        `${salut.replace(' 😊', '')} 🎉`,
        'Votre bijou 💎 vous a bien été livré ! Merci pour votre confiance, nous espérons qu\'il vous plaît ❤️',
        pied,
      );
    case 'Retour_echec':
      return assembler(
        `${salut}`,
        'Nous n\'avons malheureusement pas pu vous livrer votre bijou 💎 😕\nQuand serez-vous disponible pour une nouvelle livraison ? Répondez-nous ici, nous reprogrammons tout de suite 🚚',
        suivi,
        pied,
      );
    case 'En_livraison':
      return assembler(
        `${salut}`,
        `Votre bijou 💎 est en cours de livraison 🚚${jourLivraison ? ` (prévue le ${jourLivraison})` : ''}\nMerci de rester joignable 🙏`,
        paiement,
        suivi,
        pied,
      );
    case 'Recue_en_pays':
      return assembler(
        `${salut} bonne nouvelle !`,
        'Votre bijou 💎 vient d\'arriver chez nous 🎉\nNous programmons votre livraison 🚚 et vous contactons très vite.',
        paiement,
        suivi,
        pied,
      );
    default:
      break;
  }
  if (commande.statut_fabrication === 'Terminee') {
    return assembler(
      `${salut} bonne nouvelle !`,
      'Votre bijou personnalisé 💎 est terminé ✨\nIl est en route vers nous : réception sous 5 jours, puis nous programmons aussitôt votre livraison 🚚',
      suivi,
      `Merci pour votre confiance ❤️\n${pied}`,
    );
  }
  if (commande.statut_fabrication === 'En_fabrication') {
    return assembler(
      `${salut}`,
      'Votre bijou personnalisé 💎 est en cours de fabrication ✨\nNous vous prévenons dès qu\'il est prêt.',
      suivi,
      `Merci pour votre confiance ❤️\n${pied}`,
    );
  }
  return assembler(
    `${salut} merci pour votre commande ✅`,
    'Elle est bien confirmée et part bientôt en fabrication 💎 (environ 7 jours).',
    suivi,
    `Merci pour votre confiance ❤️\n${pied}`,
  );
}

export function lienSuivi(numero) {
  return `${window.location.origin}/suivi?numero=${encodeURIComponent(numero)}`;
}

/** Lien wa.me prêt à ouvrir (null si le numéro du client est inexploitable). */
export function lienWhatsApp(commande, pays, options = {}) {
  const client = commande.client_id || {};
  const numero = numeroInternational(client.telephone_whatsapp, indicatifDuPays(pays));
  if (!numero) return null;
  const devise = options.devise || (pays && pays.devise_locale_id ? pays.devise_locale_id.symbole || pays.devise_locale_id.code : '');
  const fraisLivraison = pays && pays.frais_livraison ? pays.frais_livraison : 0;
  const texte = messageCommande(commande, { lien: lienSuivi(commande.numero), devise, jourLivraison: options.jourLivraison, fraisLivraison });
  return `https://wa.me/${numero}?text=${encodeURIComponent(texte)}`;
}
