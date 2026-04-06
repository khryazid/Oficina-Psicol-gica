import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/server';

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isJwtLike(value: string): boolean {
  return value.split('.').length === 3;
}

function extractTokenFromCookieValue(rawValue: string): string | null {
  const decodedValue = safeDecodeURIComponent(rawValue);

  if (isJwtLike(decodedValue)) {
    return decodedValue;
  }

  try {
    const parsedValue: unknown = JSON.parse(decodedValue);
    if (typeof parsedValue === 'string' && isJwtLike(parsedValue)) {
      return parsedValue;
    }

    if (parsedValue && typeof parsedValue === 'object') {
      const accessToken = Reflect.get(parsedValue as Record<string, unknown>, 'access_token');
      if (typeof accessToken === 'string' && isJwtLike(accessToken)) {
        return accessToken;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function extractAdminAccessToken(request: Request): string | null {
  const authorizationHeader = request.headers.get('authorization');

  if (authorizationHeader?.startsWith('Bearer ')) {
    const token = authorizationHeader.slice('Bearer '.length).trim();
    if (token.length > 0) {
      return token;
    }
  }

  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  for (const cookiePart of cookieHeader.split(';')) {
    const trimmedCookie = cookiePart.trim();
    const separatorIndex = trimmedCookie.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const cookieName = trimmedCookie.slice(0, separatorIndex);
    const cookieValue = trimmedCookie.slice(separatorIndex + 1);

    if (cookieName === 'sb-access-token' || cookieName.includes('auth-token')) {
      const token = extractTokenFromCookieValue(cookieValue);
      if (token) {
        return token;
      }
    }
  }

  return null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const segments = token.split('.');
  if (segments.length !== 3) {
    return null;
  }

  const payload = segments[1];
  const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
  const remainder = normalizedPayload.length % 4;
  const paddedPayload = remainder === 0 ? normalizedPayload : `${normalizedPayload}${'='.repeat(4 - remainder)}`;

  try {
    const jsonText = typeof atob === 'function'
      ? atob(paddedPayload)
      : Buffer.from(paddedPayload, 'base64').toString('utf8');
    const parsedPayload: unknown = JSON.parse(jsonText);
    if (parsedPayload && typeof parsedPayload === 'object') {
      return parsedPayload as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

function extractRoleValue(source: Record<string, unknown> | null | undefined): string | null {
  if (!source) {
    return null;
  }

  const directRole = Reflect.get(source, 'role');
  if (typeof directRole === 'string' && directRole.length > 0) {
    return directRole;
  }

  const appMetadata = Reflect.get(source, 'app_metadata');
  if (appMetadata && typeof appMetadata === 'object') {
    const nestedRole = Reflect.get(appMetadata as Record<string, unknown>, 'role');
    if (typeof nestedRole === 'string' && nestedRole.length > 0) {
      return nestedRole;
    }
  }

  const userMetadata = Reflect.get(source, 'user_metadata');
  if (userMetadata && typeof userMetadata === 'object') {
    const nestedRole = Reflect.get(userMetadata as Record<string, unknown>, 'role');
    if (typeof nestedRole === 'string' && nestedRole.length > 0) {
      return nestedRole;
    }
  }

  return null;
}

function getRoleFromUser(user: User): string | null {
  const metadataRole = user.app_metadata.role;
  if (typeof metadataRole === 'string' && metadataRole.length > 0) {
    return metadataRole;
  }

  const userMetadataRole = user.user_metadata.role;
  if (typeof userMetadataRole === 'string' && userMetadataRole.length > 0) {
    return userMetadataRole;
  }

  return null;
}

function hasAdminRole(token: string, user: User): boolean {
  const payload = decodeJwtPayload(token);
  const payloadRole = extractRoleValue(payload);

  return payloadRole === 'psicologo' || getRoleFromUser(user) === 'psicologo';
}

function unauthorizedResponse(message: string, status: 401 | 403): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function ensureAdminSession(request: Request): Promise<NextResponse | null> {
  const token = extractAdminAccessToken(request);
  if (!token) {
    return unauthorizedResponse('Sesión administrativa requerida', 401);
  }

  if (decodeJwtPayload(token) === null) {
    return unauthorizedResponse('Sesión administrativa inválida', 401);
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return unauthorizedResponse('Sesión administrativa inválida', 401);
  }

  if (!hasAdminRole(token, data.user)) {
    return unauthorizedResponse('Permisos insuficientes', 403);
  }

  return null;
}

export function hasAdminClaim(request: NextRequest): boolean {
  const token = extractAdminAccessToken(request);
  if (!token) {
    return false;
  }

  const payload = decodeJwtPayload(token);
  const payloadRole = extractRoleValue(payload);
  return payloadRole === 'psicologo';
}