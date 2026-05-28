import { getUserWallet } from '../database/wallets.json.js';
import { addTransaction } from '../database/transactions.json.js';
import { generateCode } from '../utils/generateCode.js';
import { DAILY_LIMIT_PG } from '../config.js';
import { checkSpam } from '../security/antiSpam.js';

export async function run(user, args, sock) {
  if (args.length < 2) return '❌ Usage : $send @numero 10';
  
  let target = args[0];
  const amount = parseInt(args[1]);
  
  target = target.replace('@', '').replace(/[^0-9]/g, '');
  const targetId = `${target}@s.whatsapp.net`;
  
  if (isNaN(amount) || amount <= 0) return '❌ Montant invalide';
  if (targetId === user) return '❌ Tu ne peux pas t\'envoyer des PG à toi-même';
  
  if (!checkSpam(user)) return '❌ Trop de requêtes. Attends quelques secondes.';
  
  const senderWallet = getUserWallet(user);
  if (senderWallet.balance < amount) return `❌ Solde insuffisant. Tu as ${senderWallet.balance} PG`;
  if (senderWallet.dailySent + amount > DAILY_LIMIT_PG) return `❌ Limite quotidienne : ${DAILY_LIMIT_PG} PG max`;
  
  const code = generateCode();
  addTransaction(user, targetId, amount, 'pending', code);
  
  await sock.sendMessage(user, { text: `🔐 Code de confirmation : ${code}\nEnvoi de ${amount} PG à ${target}\nRéponds avec : $confirm ${code}` });
  
  return null;
}