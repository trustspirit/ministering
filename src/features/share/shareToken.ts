const TOKEN_SHAPE = /^[0-9a-f]{64}$/;

/** 32 random bytes as 64 lowercase hex characters (256 bits). */
export function generateShareToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** True for tokens this app generates; anything else is never sent to the server. */
export function isShareTokenShape(token: string | undefined): token is string {
  return token !== undefined && TOKEN_SHAPE.test(token);
}

export function shareUrl(token: string): string {
  return `${window.location.origin}/s/${token}`;
}
