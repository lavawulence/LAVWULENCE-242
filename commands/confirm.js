import { getPendingTransactions, confirmTransaction } from '../database/transactions.json.js';
import { getUserWallet, updateBalance } from '../database/wallets.json.js';
import { DAILY_LIMIT_PG } from '../config.js';

export async function run(user, args, sock) {
  if (args.length < 1) return '❌ Usage : $confirm CODE';
  
  const code = args[0];
  const pendingTxs = getPendingTransactions(user);
  const tx = pendingTxs.find(t => t.code === code);
  
  if (!tx) return '❌ Code invalide ou transaction inexistante';
  
  const senderWallet = getUserWallet(tx.from);
  
  if (senderWallet.balance < tx.amount) return '❌ Solde insuffisant annulé';
  if (senderWallet.dailySent + tx.amount > DAILY_LIMIT_PG) return '❌ Limite quotidienne dépassée';
  
  updateBalance(tx.from, -tx.amount);
  updateBalance(tx.to, tx.amount);
  
  confirmTransaction(tx.id);
  
  await sock.sendMessage(tx.from, { text: `✅ ${tx.amount} PG envoyés à ${tx.to.split('@')[0]}` });
  await sock.sendMessage(tx.to, { text: `🔥 Tu as reçu ${tx.amount} PG de ${tx.from.split('@')[0]}` });
  
  return `✅ Transaction confirmée : ${tx.amount} PG envoyés`;
}