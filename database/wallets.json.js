import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const walletsPath = path.join(__dirname, 'wallets.json');

export function loadWallets() {
  if (!fs.existsSync(walletsPath)) return {};
  return JSON.parse(fs.readFileSync(walletsPath));
}

export function saveWallets(wallets) {
  fs.writeFileSync(walletsPath, JSON.stringify(wallets, null, 2));
}

export function getUserWallet(userId) {
  const wallets = loadWallets();
  if (!wallets[userId]) {
    wallets[userId] = {
      balance: 0,
      dailySent: 0,
      lastReset: Date.now()
    };
    saveWallets(wallets);
  }
  
  const wallet = wallets[userId];
  if (Date.now() - wallet.lastReset > 86400000) {
    wallet.dailySent = 0;
    wallet.lastReset = Date.now();
    saveWallets(wallets);
  }
  
  return wallet;
}

export function updateBalance(userId, amount) {
  const wallets = loadWallets();
  if (!wallets[userId]) {
    wallets[userId] = { balance: 0, dailySent: 0, lastReset: Date.now() };
  }
  wallets[userId].balance += amount;
  saveWallets(wallets);
  return wallets[userId].balance;
}