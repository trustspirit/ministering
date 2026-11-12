const FALLBACK = '/';
// Routes that make no sense as a post-login destination.
const EXCLUDED = /^\/(login|set-password|s)(\/|$)/;

/**
 * The address to open after signing in, taken from the untrusted `redirect` query value.
 * Only a same-origin path (with its query and hash) is accepted; anything else becomes `/`.
 * The result always starts with exactly one `/`, so it can never be read as a protocol-relative URL.
 */
export function safeRedirect(value: string | null | undefined): string {
  if (!value) return FALLBACK;
  // Backslashes are read as slashes by browsers; control characters are stripped by URL parsing.
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return FALLBACK;
  // No route here needs an empty path segment, and URL parsing can turn `/.//x` into `//x`.
  if (value.split(/[?#]/, 1)[0].includes('//')) return FALLBACK;
  try {
    const origin = window.location.origin;
    const url = new URL(value, origin);
    if (url.origin !== origin) return FALLBACK;
    if (url.pathname.startsWith('//')) return FALLBACK;
    if (EXCLUDED.test(decodeURIComponent(url.pathname).toLowerCase())) return FALLBACK;
    return url.pathname + url.search + url.hash;
  } catch {
    return FALLBACK;
  }
}
