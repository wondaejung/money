export const AUTH_COOKIE_NAME = "money_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

function getSigningSecret(): string {
  return process.env.SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "";
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLen);
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getSigningKey(): Promise<CryptoKey | null> {
  const secret = getSigningSecret();
  if (!secret) return null;

  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
}

export async function createSessionToken(email: string): Promise<string | null> {
  const key = await getSigningKey();
  if (!key) return null;

  const exp = Date.now() + SESSION_MAX_AGE_SEC * 1000;
  const payloadB64 = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ email, exp })),
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64),
  );

  return `${payloadB64}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(
  token: string,
): Promise<{ email: string } | null> {
  if (!isAuthConfigured()) return null;

  const [payloadB64, signatureB64] = token.split(".");
  if (!payloadB64 || !signatureB64) return null;

  const key = await getSigningKey();
  if (!key) return null;

  const signatureBytes = new Uint8Array(fromBase64Url(signatureB64));

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(payloadB64),
  );
  if (!valid) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payloadB64)),
    ) as { email?: string; exp?: number };

    if (
      typeof payload.email !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp < Date.now() ||
      payload.email !== process.env.ADMIN_EMAIL
    ) {
      return null;
    }

    return { email: payload.email };
  } catch {
    return null;
  }
}
