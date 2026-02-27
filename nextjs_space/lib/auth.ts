import jwt from 'jsonwebtoken';

export type AuthRole = 'ADMIN' | 'NUTRITIONIST' | 'PATIENT';

export type AuthPayload = {
  userId: string;
  role: AuthRole;
};

export const AUTH_COOKIE_NAME = 'dtnutrition_session';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is missing in .env');
  return secret;
}

export function signAuthToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyAuthToken(token: string | undefined): AuthPayload | null {
  if (!token) return null;
  try {
    return jwt.verify(token, getJwtSecret()) as AuthPayload;
  } catch {
    return null;
  }
}
