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
    ['dot segments collapse to //', '/.//evil.example'],
    ['parent segment', '/x/..//evil.example'],
    ['encoded dot', '/%2e//evil.example'],
    ['encoded dots', '/%2e%2e//evil.example'],
    ['leading parent', '/..//evil.example'],
    ['tab between slashes', '/./\t/evil.example'],
    ['double slash in path', '/roster//x'],
    ['empty', ''],
    ['null', null],
    ['undefined', undefined],
  ])('falls back to / for %s', (_name, value) => {
    expect(safeRedirect(value)).toBe('/');
  });

  it('allows // inside the query', () => {
    expect(safeRedirect('/roster?next=//x')).toBe('/roster?next=//x');
  });

  it.each(['/Login', '/S/abc', '/%6Cogin', '/SET-PASSWORD', '/%ZZ'])('falls back for %s', (value) => {
    expect(safeRedirect(value)).toBe('/');
  });

  it.each(['/login', '/login?redirect=/roster', '/s/abc', '/set-password', '/set-password?x=1'])(
    'never returns to %s after signing in',
    (value) => {
      expect(safeRedirect(value)).toBe('/');
    },
  );
});
