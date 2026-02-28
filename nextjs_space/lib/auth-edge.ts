import { jwtVerify } from 'jose';

export type AuthRole = 'ADMIN' | 'NUTRITIONIST' | 'PATIENT';

export type AuthPayload = {
  userId: string;
  role: AuthRole;
};

export const AUTH_COOKIE_NAME = 'nutrition_session';

export async function verifyAuthTokenEdge(token: string | undefined): Promise<AuthPayload | null> {
  if (!token) return null;
  
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    
    return {
      userId: payload.userId as string,
      role: payload.role as AuthRole,
    };
  } catch {
    return null;
  }
}
