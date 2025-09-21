import bcrypt from 'bcryptjs';

// Static users (no database)
export const USERS = [
  {
    email: 'admin@nirmalai.com',
    // Password: "admin123" - hashed
    password: '$2b$10$TuODGcq3ZtkS5DWYs07xdeOeOqvoOIxED98FrB2j/4Ou5qgwp/tE2',
    name: 'Admin User',
  },
  {
    email: 'user@nirmalai.com',
    // Password: "user123" - hashed
    password: '$2b$10$4a4hdJ2yodK3GktXuruXLeotljc9lKuKnQGKA.maQuO3FSHcpi75u',
    name: 'Regular User',
  },
];

// For development, generate hash:
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

export function findUserByEmail(email: string) {
  return USERS.find(user => user.email === email);
}