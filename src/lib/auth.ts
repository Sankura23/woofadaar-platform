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

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}

export function isPetParent(payload: JWTPayload): payload is PetParentJWTPayload {
  return payload.userType === 'pet-parent'
}

export function isPartner(payload: JWTPayload): payload is PartnerJWTPayload {
  return payload.userType === 'partner'
}