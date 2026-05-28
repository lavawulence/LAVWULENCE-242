import * as ping from './ping.js';
import * as wallet from './wallet.js';
import * as send from './send.js';
import * as confirm from './confirm.js';
import * as proof from './proof.js';
import * as history from './history.js';

const commands = {
  ping: ping,
  wallet: wallet,
  solde: wallet,
  send: send,
  confirm: confirm,
  proof: proof,
  history: history
};

export async function handleCommand(user, cmd, args, sock, msg) {
  const fn = commands[cmd];
  if (!fn) return '❌ Commande inconnue. $ping, $wallet, $send, $confirm, $proof, $history';
  return await fn.run(user, args, sock, msg);
}