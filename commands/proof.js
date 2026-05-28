import { updateBalance } from '../database/wallets.json.js';
import { PROOF_REWARD } from '../config.js';
import { checkSpam } from '../security/antiSpam.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const proofs = new Map();

export async function run(user, args, sock, msg) {
  if (!checkSpam(user)) return '❌ Trop de preuves. Attends un peu.';
  
  const hasMedia = msg.message?.imageMessage || 
                   msg.message?.videoMessage || 
                   msg.message?.documentMessage;
  
  if (!hasMedia) {
    return `📸 Envoie une photo, vidéo ou document comme preuve\n+${PROOF_REWARD} PG à la clé`;
  }
  
  const lastProof = proofs.get(user);
  if (lastProof && Date.now() - lastProof < 3600000) {
    return '❌ Une preuve par heure maximum';
  }
  
  try {
    let mediaType = null;
    let mediaData = null;
    
    if (msg.message.imageMessage) {
      mediaType = 'image';
      mediaData = msg.message.imageMessage;
    } else if (msg.message.videoMessage) {
      mediaType = 'video';
      mediaData = msg.message.videoMessage;
    } else if (msg.message.documentMessage) {
      mediaType = 'document';
      mediaData = msg.message.documentMessage;
    }
    
    const userPhone = user.split('@')[0];
    const proofsDir = path.join(__dirname, '../proofs_storage', userPhone);
    if (!fs.existsSync(proofsDir)) {
      fs.mkdirSync(proofsDir, { recursive: true });
    }
    
    const buffer = await downloadMediaMessage(
      { message: { [mediaType + 'Message']: mediaData } },
      'buffer',
      {}
    );
    
    const ext = mediaType === 'image' ? 'jpg' : mediaType === 'video' ? 'mp4' : 'bin';
    const filename = `${Date.now()}_${mediaType}.${ext}`;
    const filepath = path.join(proofsDir, filename);
    fs.writeFileSync(filepath, buffer);
    
    const proofId = Date.now() + Math.random().toString(36);
    const proofsStorePath = path.join(__dirname, '../database/proofs.json');
    const proofsStore = JSON.parse(fs.readFileSync(proofsStorePath, 'utf-8') || '{}');
    proofsStore[proofId] = {
      id: proofId,
      user,
      filepath,
      mediaType,
      timestamp: Date.now(),
      verified: true
    };
    fs.writeFileSync(proofsStorePath, JSON.stringify(proofsStore, null, 2));
    
    proofs.set(user, Date.now());
    updateBalance(user, PROOF_REWARD);
    
    return `✅ Preuve validée ! +${PROOF_REWARD} PG\n📁 Stockée localement\n🔒 ID: ${proofId}`;
    
  } catch (error) {
    console.error('Erreur sauvegarde preuve:', error);
    return '❌ Erreur lors de l\'enregistrement de la preuve. Réessaie.';
  }
}