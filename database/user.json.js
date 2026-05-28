import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const usersPath = path.join(__dirname, 'users.json');

export function loadUsers() {
  if (!fs.existsSync(usersPath)) return {};
  return JSON.parse(fs.readFileSync(usersPath));
}

export function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

export function getUser(userId) {
  const users = loadUsers();
  if (!users[userId]) {
    users[userId] = {
      id: userId,
      createdAt: Date.now(),
      authenticated: true,
      totalReceived: 0,
      totalSent: 0
    };
    saveUsers(users);
  }
  return users[userId];
}