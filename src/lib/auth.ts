import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

export interface PetParentJWTPayload {
  userId: string
  email: string
  userType: 'pet-parent'
}

export interface PartnerJWTPayload {
  partnerId: string
  email: string
  userType: 'partner'
}

export type JWTPayload = PetParentJWTPayload | PartnerJWTPayload

export function verifyToken(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload
    return payload
  } catch (error) {
    return null
  }
}

export async function verifyTokenFromRequest(request: NextRequest): Promise<string | null> {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return null;
    }

    const payload = verifyToken(token);
    if (!payload) {
      return null;
    }

    return isPetParent(payload) ? payload.userId : null;
  } catch (error) {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  // First try Bearer token from Authorization header (localStorage)
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Then try cookies for cookie-based auth
  const cookieToken = request.cookies.get('woofadaar_session')?.value
  if (cookieToken) {
    return cookieToken
  }
  
  return null
}

export function isPetParent(payload: JWTPayload): payload is PetParentJWTPayload {
  return payload.userType === 'pet-parent'
}

export function isPartner(payload: JWTPayload): payload is PartnerJWTPayload {
  return payload.userType === 'partner'
}

// Partner-specific cookie-based authentication
export interface PartnerTokenPayload {
  partnerId: string;
  email: string;
  type: 'partner';
}

export function verifyPartnerToken(token: string): PartnerTokenPayload | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as PartnerTokenPayload;
    if (decoded.type !== 'partner') {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

export function getPartnerFromRequest(request: NextRequest): { partnerId: string; email: string } | null {
  // First try Bearer token from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      if (decoded.userType === 'partner' && decoded.partnerId) {
        return {
          partnerId: decoded.partnerId,
          email: decoded.email
        };
      }
    } catch (error) {
      console.error('JWT verification error:', error);
    }
  }
  
  // Then try cookies for cookie-based auth
  const cookieToken = request.cookies.get('partner-token')?.value;
  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, process.env.JWT_SECRET || 'your-secret-key') as any;
      if (decoded.type === 'partner' && decoded.partnerId) {
        return {
          partnerId: decoded.partnerId,
          email: decoded.email
        };
      }
    } catch (error) {
      console.error('Cookie JWT verification error:', error);
    }
  }
  
  return null;
}