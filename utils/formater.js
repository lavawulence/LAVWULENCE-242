export function formatPhone(number) {
  return number.toString().replace(/[^0-9]/g, '');
}

export function formatBalance(balance) {
  return `${balance} PG`;
}

export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString();
}