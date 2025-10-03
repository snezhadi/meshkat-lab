// Minimal auth utilities for admin functionality
import crypto from 'crypto';

export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function isAllowlisted(email: string): boolean {
  // For admin-only setup, allow all emails
  return true;
}

export function isTokenExpired(token: string): boolean {
  // For admin-only setup, tokens don't expire
  return false;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  
  const maskedLocal = local.length > 2 
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : local;
  
  return `${maskedLocal}@${domain}`;
}

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid credentials',
  USER_NOT_FOUND: 'User not found',
  TOKEN_EXPIRED: 'Token expired',
  UNAUTHORIZED: 'Unauthorized',
} as const;

export class AuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AuthError';
  }
}
