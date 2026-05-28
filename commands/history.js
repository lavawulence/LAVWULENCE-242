import { loadTransactions } from '../database/transactions.json.js';

export async function run(user, args, sock) {
  const transactions = loadTransactions();
  const userTxs = transactions.filter(tx => 
    (tx.from === user || tx.to === user) && tx.status === 'completed'
  ).slice(-10);
  
  if (userTxs.length === 0) return '📭 Aucune transaction récente';
  
  let history = '📜 *Dernières transactions*\n\n';
  userTxs.reverse().forEach(tx => {
    const direction = tx.from === user ? '📤 Envoyé' : '📥 Reçu';
    const other = tx.from === user ? tx.to : tx.from;
    history += `${direction} ${tx.amount} PG → ${other.split('@')[0]}\n`;
  });
  
  return history;
}