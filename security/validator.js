export function validateAmount(amount) {
  return !isNaN(amount) && amount > 0 && amount <= 1000;
}

export function validatePhone(phone) {
  return /^[0-9]{10,15}$/.test(phone);
}

export function isValidTransaction(from, to, amount, senderBalance, dailySent, dailyLimit) {
  if (from === to) return false;
  if (amount <= 0) return false;
  if (senderBalance < amount) return false;
  if (dailySent + amount > dailyLimit) return false;
  return true;
}p