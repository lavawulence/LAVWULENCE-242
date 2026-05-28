import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import { BOT_PREFIX, BOT_SECRET } from './config.js';
import { handleCommand } from './commands/index.js';
import { isAuthorized, authorizeUser } from './security/antiFake.js';
import { isDeviceValid, generateDeviceFingerprint, checkMultipleAccounts } from './security/deviceFingerprint.js';

let sock;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      console.log('✅ LA VAWULENCE est en ligne');
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    
    if (!text.startsWith(BOT_PREFIX)) return;

    // 🔐 CODE SECRET : LAVAWULE
    if (!isAuthorized(sender)) {
      const code = text.slice(1).trim();
      if (code === BOT_SECRET) {   // BOT_SECRET = "LAVAWULE"
        authorizeUser(sender);
        await sock.sendMessage(sender, { text: '✅ Accès authorisé. Tu peux maintenant utiliser les commandes.' });
      } else {
        await sock.sendMessage(sender, { text: `🔐 Code incorrect. Envoie : $${BOT_SECRET}` });
      }
      return;
    }

    // Device fingerprint (anti-multi-comptes)
    const userAgent = msg.pushName || 'unknown';
    const platform = 'whatsapp';
    const fingerprint = generateDeviceFingerprint(sender, userAgent, platform, sender.split('@')[0]);
    
    const deviceCheck = isDeviceValid(sender, fingerprint);
    if (!deviceCheck.valid) {
      await sock.sendMessage(sender, { text: deviceCheck.reason });
      return;
    }
    
    const multiCheck = checkMultipleAccounts(fingerprint, sender);
    if (multiCheck.hasMultipleAccounts) {
      await sock.sendMessage(sender, { 
        text: `⚠️ Détection de comptes multiples !\nComptes liés : ${multiCheck.accounts.map(a => a.split('@')[0]).join(', ')}\nAction bloquée.` 
      });
      return;
    }

    // Exécuter la commande normale
    const args = text.slice(1).trim().split(/\s+/);
    const command = args[0].toLowerCase();
    const response = await handleCommand(sender, command, args.slice(1), sock, msg);
    if (response) await sock.sendMessage(sender, { text: response });
  });
}

startBot();