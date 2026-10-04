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
 */
export function messageCommande(commande, { lien, devise = '', jourLivraison = '', fraisLivraison = 0 } = {}) {
  const client = commande.client_id || {};
  const prenom = client.nom ? String(client.nom).trim().split(/\s+/)[0] : '';
  const salut = prenom ? `Bonjour ${prenom},` : 'Bonjour,';
  const reste = Number(commande.reste_a_payer) || 0;
  const frais = Number(fraisLivraison) || 0;
  // Les frais de livraison du pays ne sont pas inclus dans le solde de la
  // commande : on les ajoute explicitement pour que le client sache le total à
  // prévoir le jour de la livraison.
  let rappelSolde = '';
  if (reste > 0 && frais > 0) {
    rappelSolde = ` Le solde restant à régler est de ${formaterMontant(reste, devise)}, auquel s'ajoutent ${formaterMontant(frais, devise)} de frais de livraison, soit ${formaterMontant(reste + frais, devise)} au total à prévoir à la livraison.`;
  } else if (reste > 0) {
    rappelSolde = ` Le solde restant à régler est de ${formaterMontant(reste, devise)}.`;
  } else if (frais > 0) {
    rappelSolde = ` Votre commande est entièrement réglée, il ne restera que les frais de livraison de ${formaterMontant(frais, devise)} à régler à la livraison.`;
  }
  const numero = commande.numero;

  let corps;
  if (commande.statut_commande === 'Annulee') {
    return `${salut} votre commande ${numero} a été annulée. N'hésitez pas à nous écrire pour toute question.\n\nL'équipe SANAA`;
  }
  switch (commande.statut_livraison) {
    case 'Livree':
      return `${salut} votre commande ${numero} a bien été livrée. Merci pour votre confiance, nous espérons que votre bijou vous plaît !\n\nL'équipe SANAA`;
    case 'Retour_echec':
      corps = `nous n'avons pas pu vous livrer la commande ${numero}. Pouvez-vous nous dire quand vous serez disponible pour une nouvelle livraison ?`;
      break;
    case 'En_livraison':
      corps = `votre commande ${numero} est en cours de livraison${jourLivraison ? ` (prévue le ${jourLivraison})` : ''}.${rappelSolde}`;
      break;
    case 'Recue_en_pays':
      corps = `bonne nouvelle, votre commande ${numero} est arrivée dans votre pays ! Nous vous contactons très vite pour organiser la livraison.${rappelSolde}`;
      break;
    default:
      if (commande.statut_fabrication === 'Terminee') corps = `votre bijou (commande ${numero}) est terminé et part bientôt vers votre pays.`;
      else if (commande.statut_fabrication === 'En_fabrication') corps = `votre commande ${numero} est en cours de fabrication.`;
      else corps = `nous avons bien confirmé votre commande ${numero}. Merci pour votre confiance !`;
  }
  return `${salut} ${corps}\n\nSuivez votre commande ici : ${lien}\n(Votre numéro de téléphone vous sera demandé.)\n\nL'équipe SANAA`;
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
