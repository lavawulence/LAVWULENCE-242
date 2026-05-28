// Liste des numéros admin (sans @s.whatsapp.net)
export const adminNumbers = [
  '242044106402'   // Ton numéro
];

// Vérifie si un utilisateur est admin
export function isAdmin(userId) {
  const phone = userId.split('@')[0];
  return adminNumbers.includes(phone);
}

// Pour les commandes spéciales admin (optionnel, pour plus tard)
export function getAdminCommands() {
  return {
    '$addpg': 'Ajouter des PG à un utilisateur (admin seulement)',
    '$removepg': 'Retirer des PG à un utilisateur',
    '$block': 'Bloquer un utilisateur',
    '$unblock': 'Débloquer un utilisateur'
  };
}