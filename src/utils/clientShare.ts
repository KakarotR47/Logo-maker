import { BrandBrief, ColorPalette, LogoDocument } from '../types/logo';

export interface ClientSharePayload {
  v: 1;
  doc: LogoDocument;
  brief: BrandBrief;
  palette: ColorPalette;
  designerNote?: string;
  createdAt: string;
}

export type ClientApprovalStatus = 'pending' | 'approved' | 'changes-requested';

const SHARE_STORAGE_PREFIX = 'forma-client-share-v1-';
const APPROVAL_STORAGE_PREFIX = 'forma-client-approval-v1-';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64Url: string): Uint8Array {
  const norm = b64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (norm.length % 4)) % 4;
  const padded = norm + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deflateBytes(input: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const stream = new CompressionStream('deflate-raw');
    const writer = stream.writable.getWriter();
    const copy = new Uint8Array(input.length);
    copy.set(input);
    await writer.write(copy);
    await writer.close();
    const buffer = await new Response(stream.readable).arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

async function inflateBytes(input: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const stream = new DecompressionStream('deflate-raw');
    const writer = stream.writable.getWriter();
    const copy = new Uint8Array(input.length);
    copy.set(input);
    await writer.write(copy);
    await writer.close();
    const buffer = await new Response(stream.readable).arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

export async function encodeClientShareToken(payload: ClientSharePayload): Promise<string> {
  const json = JSON.stringify(payload);
  const rawBytes = new TextEncoder().encode(json);
  const compressed = await deflateBytes(rawBytes);

  const token = compressed
    ? `z.${bytesToBase64Url(compressed)}`
    : `u.${bytesToBase64Url(rawBytes)}`;

  // If payload contains large custom vector uploads exceeding URL safety threshold,
  // persist cleanly into localStorage and return a compact reference token.
  if (token.length > 6200 && typeof localStorage !== 'undefined') {
    const shortId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    try {
      localStorage.setItem(`${SHARE_STORAGE_PREFIX}${shortId}`, json);
      return `ref.${shortId}`;
    } catch {
      // Fall back to direct URL token if localStorage quota fails
    }
  }

  return token;
}

export async function decodeClientShareToken(token: string): Promise<ClientSharePayload | null> {
  if (!token || typeof token !== 'string') return null;
  try {
    if (token.startsWith('ref.')) {
      const refId = token.slice(4);
      if (typeof localStorage === 'undefined') return null;
      const saved = localStorage.getItem(`${SHARE_STORAGE_PREFIX}${refId}`);
      if (!saved) return null;
      return JSON.parse(saved) as ClientSharePayload;
    }

    if (token.startsWith('z.')) {
      const bytes = base64UrlToBytes(token.slice(2));
      const inflated = await inflateBytes(bytes);
      if (!inflated) return null;
      const json = new TextDecoder().decode(inflated);
      return JSON.parse(json) as ClientSharePayload;
    }

    if (token.startsWith('u.')) {
      const bytes = base64UrlToBytes(token.slice(2));
      const json = new TextDecoder().decode(bytes);
      return JSON.parse(json) as ClientSharePayload;
    }

    // Legacy raw base64url JSON attempt
    const bytes = base64UrlToBytes(token);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as ClientSharePayload;
  } catch {
    return null;
  }
}

export async function createClientShareUrl(
  payload: ClientSharePayload,
  baseOrigin?: string
): Promise<{ url: string; token: string; isCompactRef: boolean }> {
  const token = await encodeClientShareToken(payload);
  const origin =
    baseOrigin ??
    (typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'http://localhost:3000/');
  const urlObj = new URL(origin, 'http://localhost:3000');
  urlObj.searchParams.set('client', token);
  return {
    url: urlObj.toString(),
    token,
    isCompactRef: token.startsWith('ref.'),
  };
}

export async function parseClientShareFromSearch(
  search: string
): Promise<{ payload: ClientSharePayload; token: string } | null> {
  const params = new URLSearchParams(search);
  const token = params.get('client');
  if (!token) return null;
  const payload = await decodeClientShareToken(token);
  if (!payload) return null;
  return { payload, token };
}

export function loadClientApprovalState(tokenKey: string): {
  status: ClientApprovalStatus;
  comment: string;
  updatedAt?: string;
} {
  try {
    const raw = localStorage.getItem(`${APPROVAL_STORAGE_PREFIX}${tokenKey.slice(0, 48)}`);
    if (!raw) return { status: 'pending', comment: '' };
    return JSON.parse(raw) as {
      status: ClientApprovalStatus;
      comment: string;
      updatedAt?: string;
    };
  } catch {
    return { status: 'pending', comment: '' };
  }
}

export function saveClientApprovalState(
  tokenKey: string,
  state: { status: ClientApprovalStatus; comment: string }
) {
  try {
    localStorage.setItem(
      `${APPROVAL_STORAGE_PREFIX}${tokenKey.slice(0, 48)}`,
      JSON.stringify({ ...state, updatedAt: new Date().toISOString() })
    );
  } catch {
    // Ignore storage quota issues
  }
}
