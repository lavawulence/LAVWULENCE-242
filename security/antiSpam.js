const userRequests = new Map();

export function checkSpam(userId, limit = 3, windowMs = 5000) {
  const now = Date.now();
  const requests = userRequests.get(userId) || [];
  const recent = requests.filter(t => now - t < windowMs);
  
  if (recent.length >= limit) return false;
  
  recent.push(now);
  userRequests.set(userId, recent);
  return true;
}

export function resetSpam(userId) {
  userRequests.delete(userId);
}