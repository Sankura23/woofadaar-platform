import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

export interface JWTPayload {
  userId: string
  email: string
}

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