import { describe, expect, it } from 'vitest';
import { safeRedirect } from './safeRedirect';

describe('safeRedirect', () => {
  it('keeps same-site paths, query and hash', () => {
    expect(safeRedirect('/roster')).toBe('/roster');
    expect(safeRedirect('/assignments/eq?x=1#y')).toBe('/assignments/eq?x=1#y');
  });

  it.each([
    ['protocol-relative', '//evil.example'],
    ['backslash after slash', '/\\evil.example'],
    ['backslash before slash', '\\/evil.example'],
    ['absolute url', 'https://evil.example/x'],
    ['javascript url', 'javascript:alert(1)'],
    ['CR LF', decodeURIComponent('/a%0d%0ab')],
    ['tab inside', '/\t/evil.example'],
    ['empty', ''],
    ['null', null],
    ['undefined', undefined],
  ])('falls back to / for %s', (_name, value) => {
    expect(safeRedirect(value)).toBe('/');
  });

  it.each(['/login', '/login?redirect=/roster', '/s/abc', '/set-password', '/set-password?x=1'])(
    'never returns to %s after signing in',
    (value) => {
      expect(safeRedirect(value)).toBe('/');
    },
  );
});
