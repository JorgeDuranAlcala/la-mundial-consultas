import { createHmac, timingSafeEqual } from 'crypto';

export interface JwtPayload {
  sub: number;
  username?: string;
  roles?: string[];
  companiaId?: number;
}

function base64UrlEncode(value: string | Buffer): string {
  const buf = typeof value === 'string' ? Buffer.from(value) : value;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecodeToBuffer(value: string): Buffer {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const normalized = padded.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64');
}

function parseExpiresIn(expiresIn: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiresIn.trim());
  if (!match) return 8 * 3600;
  const amount = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 3600;
    case 'd':
      return amount * 86400;
    default:
      return 8 * 3600;
  }
}

export function signJwt(payload: JwtPayload, secret: string, expiresIn = '8h'): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    sub: payload.sub,
    username: payload.username,
    roles: payload.roles,
    companiaId: payload.companiaId,
    iat: now,
    exp: now + parseExpiresIn(expiresIn),
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedBody}`;
  const signature = createHmac('sha256', secret).update(data).digest();
  return `${data}.${base64UrlEncode(signature)}`;
}

export function verifyJwt(token: string, secret: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Token inválido');
  }

  const [encodedHeader, encodedBody, encodedSignature] = parts;
  const data = `${encodedHeader}.${encodedBody}`;
  const expected = createHmac('sha256', secret).update(data).digest();
  const actual = base64UrlDecodeToBuffer(encodedSignature);

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error('Firma de token inválida');
  }

  const body = JSON.parse(base64UrlDecodeToBuffer(encodedBody).toString('utf8')) as Record<
    string,
    unknown
  >;

  if (!body.exp || Number(body.exp) < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expirado');
  }

  return {
    sub: Number(body.sub),
    username: body.username as string | undefined,
    roles: Array.isArray(body.roles) ? body.roles.map(String) : [],
    companiaId: body.companiaId ? Number(body.companiaId) : undefined,
  };
}
