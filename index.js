import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import { BOT_PREFIX, BOT_SECRET } from './config.js';
import { handleCommand } from './commands/index.js';
import { isAuthorized, authorizeUser } from './security/antiFake.js';
import { isDeviceValid, generateDeviceFingerprint, checkMultipleAccounts } from './security/deviceFingerprint.js';
import fs from 'fs';
import http from 'http';

let sock;
let pairingCodeRequested = false;

// Serveur HTTP pour que Render ne stoppe pas le bot
const server = http.createServer((req, res) => res.end('✅ LA VAWULENCE est en ligne'));
server.listen(process.env.PORT || 3000, () => {
  console.log('🌐 HTTP server on port', process.env.PORT || 3000);
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    browser: ['LA VAWULENCE', 'Chrome', '1.0.0']
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr, pairingCode } = update;
    
    if (qr) {
      console.log('📱 QR CODE (scanne avec WhatsApp) :');
      console.log(qr);
    }
    
    if (pairingCode) {
      console.log(`\n🔐 CODE D'ASSOCIATION : ${pairingCode}`);
      console.log(`📱 WhatsApp → Paramètres → Appareils liés → Lier avec un numéro\n`);
    }
    
    if (connection === 'open') {
      console.log('✅ LA VAWULENCE est en ligne');
      
      try {
        if (fs.existsSync('./database/bot_avatar.jpg')) {
          const avatarBuffer = fs.readFileSync('./database/bot_avatar.jpg');
          await sock.updateProfilePicture(avatarBuffer);
          console.log('📸 Photo de profil mise à jour');
        }
      } catch (err) {
        console.log('⚠️ Photo non modifiée');
      }
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

    // 🔐 CODE SECRET LAVAWULE
    if (!isAuthorized(sender)) {
      const code = text.slice(1).trim();
      if (code === BOT_SECRET) {
        authorizeUser(sender);
        await sock.sendMessage(sender, { text: '✅ Accès authorisé. Tu peux maintenant utiliser les commandes.' });
      } else {
        await sock.sendMessage(sender, { text: `🔐 Code incorrect. Envoie : $${BOT_SECRET}` });
      }
      return;
    }

    // Device fingerprint
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

    const args = text.slice(1).trim().split(/\s+/);
    const command = args[0].toLowerCase();
    const response = await handleCommand(sender, command, args.slice(1), sock, msg);
    if (response) await sock.sendMessage(sender, { text: response });
  });

  // 🔐 DEMANDE DU PAIRING CODE (version compatible Render)
  if (!pairingCodeRequested) {
    pairingCodeRequested = true;
    const phoneNumber = '242044106402';
    console.log(`📞 Demande du code pour le numéro : ${phoneNumber}`);
    try {
      const code = await sock.requestPairingCode(phoneNumber);
      console.log(`✅ Code reçu : ${code}`);
    } catch (err) {
      console.log(`❌ Erreur pairing code : ${err.message}`);
    }
  }
}

startBot();