export function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
}

export function logTransaction(from, to, amount, status) {
  log(`${from} → ${to} : ${amount} PG (${status})`, 'TRANSACTION');
}