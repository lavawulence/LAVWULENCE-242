const authorizedUsers = new Map();

export function isAuthorized(user) {
  return authorizedUsers.get(user) === true;
}

export function authorizeUser(user) {
  authorizedUsers.set(user, true);
}

export function revokeUser(user) {
  authorizedUsers.delete(user);
}