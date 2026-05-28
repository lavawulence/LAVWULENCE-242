import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const devicesPath = path.join(__dirname, '../database/devices.json');

export function loadDevices() {
  if (!fs.existsSync(devicesPath)) return {};
  return JSON.parse(fs.readFileSync(devicesPath));
}

export function saveDevices(devices) {
  fs.writeFileSync(devicesPath, JSON.stringify(devices, null, 2));
}

export function generateDeviceFingerprint(userId, userAgent, platform, phoneNumber) {
  const data = `${userId}|${userAgent}|${platform}|${phoneNumber}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function isDeviceValid(userId, fingerprint) {
  const devices = loadDevices();
  
  for (const [existingUserId, existingFingerprint] of Object.entries(devices)) {
    if (existingFingerprint === fingerprint && existingUserId !== userId) {
      return {
        valid: false,
        reason: `❌ Ce téléphone est déjà lié au compte ${existingUserId.split('@')[0]}`
      };
    }
  }
  
  if (!devices[userId]) {
    devices[userId] = fingerprint;
    saveDevices(devices);
  }
  
  if (devices[userId] !== fingerprint) {
    return {
      valid: false,
      reason: '❌ Appareil non reconnu. Réauthentification requise.'
    };
  }
  
  return { valid: true };
}

export function checkMultipleAccounts(fingerprint, currentUserId) {
  const devices = loadDevices();
  const accounts = [];
  
  for (const [userId, fp] of Object.entries(devices)) {
    if (fp === fingerprint && userId !== currentUserId) {
      accounts.push(userId);
    }
  }
  
  return {
    hasMultipleAccounts: accounts.length > 0,
    accounts
  };
}