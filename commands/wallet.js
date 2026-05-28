import { getUserWallet } from '../database/wallets.json.js';

export async function run(user, args, sock) {
  const wallet = getUserWallet(user);
  return `💰 Ton solde : ${wallet.balance} PG\n📊 Envoyé aujourd'hui : ${wallet.dailySent}/100 PG`;
}