const FALLBACK = '/';
// Routes that make no sense as a post-login destination.
const EXCLUDED = /^\/(login|set-password|s)(\/|$)/;

/**
 * The address to open after signing in, taken from the untrusted `redirect` query value.
 * Only a same-origin path (with its query and hash) is accepted; anything else becomes `/`.
 */
export function safeRedirect(value: string | null | undefined): string {
  if (!value) return FALLBACK;
  // Backslashes are read as slashes by browsers; control characters are stripped by URL parsing.
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return FALLBACK;
  try {
    const origin = window.location.origin;
    const url = new URL(value, origin);
    if (url.origin !== origin) return FALLBACK;
    if (EXCLUDED.test(url.pathname)) return FALLBACK;
    return url.pathname + url.search + url.hash;
  } catch {
    return FALLBACK;
  }
}
