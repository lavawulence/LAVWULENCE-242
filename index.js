import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';

import pino from 'pino';
import fs from 'fs';
import http from 'http';
import qrcode from 'qrcode-terminal';

import { BOT_PREFIX, BOT_SECRET, OWNER_NUMBER } from './config.js';
import { handleCommand } from './commands/index.js';

import {
  isAuthorized,
  authorizeUser
} from './security/antiFake.js';

import {
  isDeviceValid,
  generateDeviceFingerprint,
  checkMultipleAccounts
} from './security/deviceFingerprint.js';


// ==========================
// SERVEUR HTTP RENDER
// ==========================

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('✅ LA VAWULENCE en ligne');
}).listen(PORT, () => {
  console.log(`🌐 Serveur HTTP actif sur le port ${PORT}`);
});


// ==========================
// VARIABLES GLOBALES
// ==========================

let sock;
let pairingRequested = false;


// ==========================
// DEMARRAGE BOT
// ==========================

async function startBot() {

  const { state, saveCreds } = await useMultiFileAuthState('./session');

  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),

    printQRInTerminal: false,

    browser: ['LA VAWULENCE', 'Chrome', '1.0.0']
  });


  // ==========================
  // CONNEXION
  // ==========================

  sock.ev.on('connection.update', async (update) => {

    const {
      connection,
      lastDisconnect,
      qr
    } = update;


    // ==========================
    // QR CODE
    // ==========================

    if (qr) {
      console.log('\n📱 SCANNE CE QR CODE :\n');

      qrcode.generate(qr, {
        small: true
      });
    }


    // ==========================
    // CONNECTÉ
    // ==========================

    if (connection === 'open') {

      console.log('✅ LA VAWULENCE est connecté');


      // ==========================
      // PHOTO PROFIL
      // ==========================

      try {

        if (fs.existsSync('./database/bot_avatar.jpg')) {

          await sock.updateProfilePicture(
            sock.user.id,
            fs.readFileSync('./database/bot_avatar.jpg')
          );

          console.log('📸 Photo profil mise à jour');
        }

      } catch (err) {

        console.log('⚠️ Impossible de modifier la photo');
      }
    }


    // ==========================
    // DECONNEXION
    // ==========================

    if (connection === 'close') {

      const reason =
        lastDisconnect?.error?.output?.statusCode;

      console.log('❌ Déconnecté :', reason);

      if (reason !== DisconnectReason.loggedOut) {

        console.log('🔄 Reconnexion...');

        setTimeout(() => {
          startBot();
        }, 5000);

      } else {

        console.log('🚫 Session supprimée');
      }
    }
  });


  // ==========================
  // SAVE CREDS
  // ==========================

  sock.ev.on('creds.update', saveCreds);


  // ==========================
  // MESSAGES
  // ==========================

  sock.ev.on('messages.upsert', async ({ messages }) => {

    try {

      const msg = messages[0];

      if (!msg.message) return;

      if (msg.key.fromMe) return;

      const sender = msg.key.remoteJid;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        '';

      if (!text.startsWith(BOT_PREFIX)) return;


      // ==========================
      // AUTHORIZATION
      // ==========================

      if (!isAuthorized(sender)) {

        const code = text.slice(1).trim();

        if (code === BOT_SECRET) {

          authorizeUser(sender);

          await sock.sendMessage(sender, {
            text: '✅ Accès autorisé.'
          });

        } else {

          await sock.sendMessage(sender, {
            text: `🔐 Code incorrect.\nEnvoie : ${BOT_PREFIX}${BOT_SECRET}`
          });
        }

        return;
      }


      // ==========================
      // DEVICE SECURITY
      // ==========================

      const fingerprint = generateDeviceFingerprint(
        sender,
        msg.pushName || 'unknown',
        'whatsapp',
        sender.split('@')[0]
      );

      const deviceCheck =
        isDeviceValid(sender, fingerprint);

      if (!deviceCheck.valid) {

        await sock.sendMessage(sender, {
          text: deviceCheck.reason
        });

        return;
      }


      // ==========================
      // MULTI ACCOUNT CHECK
      // ==========================

      const multiCheck =
        checkMultipleAccounts(fingerprint, sender);

      if (multiCheck.hasMultipleAccounts) {

        await sock.sendMessage(sender, {
          text:
            `⚠️ Multi-compte détecté :\n` +
            multiCheck.accounts
              .map(a => a.split('@')[0])
              .join(', ')
        });

        return;
      }


      // ==========================
      // COMMANDES
      // ==========================

      const args =
        text
          .slice(BOT_PREFIX.length)
          .trim()
          .split(/\s+/);

      const command = args.shift().toLowerCase();

      const response = await handleCommand(
        sender,
        command,
        args,
        sock,
        msg
      );

      if (response) {

        await sock.sendMessage(sender, {
          text: response
        });
      }

    } catch (err) {

      console.log('❌ Erreur message :', err);
    }
  });


  // ==========================
  // PAIRING CODE
  // ==========================

  const sessionExists =
    fs.existsSync('./session/creds.json');

  if (!sessionExists && !pairingRequested) {

    pairingRequested = true;

    console.log(
      '\n📞 Génération du code pour :',
      OWNER_NUMBER
    );

    setTimeout(async () => {

      try {

        const code =
          await sock.requestPairingCode(
            OWNER_NUMBER
          );

        console.log(
          `\n🔐 CODE D'ASSOCIATION : ${code}\n`
        );

      } catch (err) {

        console.log(
          '❌ Impossible de générer le pairing code'
        );
      }

    }, 3000);
  }
}


// ==========================
// START
// ==========================

startBot();