import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const transactionsPath = path.join(__dirname, 'transactions.json');

export function loadTransactions() {
  if (!fs.existsSync(transactionsPath)) return [];
  return JSON.parse(fs.readFileSync(transactionsPath));
}

export function saveTransactions(transactions) {
  fs.writeFileSync(transactionsPath, JSON.stringify(transactions, null, 2));
}

export function addTransaction(from, to, amount, status = 'pending', code = null) {
  const transactions = loadTransactions();
  const tx = {
    id: Date.now() + Math.random().toString(36),
    from,
    to,
    amount,
    status,
    code,
    timestamp: Date.now()
  };
  transactions.push(tx);
  saveTransactions(transactions);
  return tx;
}

export function getPendingTransactions(userId) {
  return loadTransactions().filter(tx => tx.to === userId && tx.status === 'pending');
}

export function confirmTransaction(txId) {
  const transactions = loadTransactions();
  const tx = transactions.find(t => t.id === txId);
  if (tx && tx.status === 'pending') {
    tx.status = 'completed';
    saveTransactions(transactions);
    return tx;
  }
  return null;
}