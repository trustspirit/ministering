import { describe, expect, it } from 'vitest';
import { buildPasswordLink, parsePasswordLink } from './passwordLink';

const HASH = '0123456789abcdef'.repeat(3) + '01234567'; // 56 hex characters, like GoTrue's hashed_token

describe('passwordLink', () => {
  it('builds the set-password address and reads it back', () => {
    const link = buildPasswordLink('https://x', HASH, 'invite');
    expect(link).toBe(`https://x/set-password?token_hash=${HASH}&type=invite`);
    expect(parsePasswordLink(new URL(link).search)).toEqual({ tokenHash: HASH, type: 'invite' });
    expect(parsePasswordLink(new URL(buildPasswordLink('https://x', HASH, 'recovery')).search)).toEqual({
      tokenHash: HASH,
      type: 'recovery',
    });
  });

  it.each([
    ['another OTP type', `?token_hash=${HASH}&type=signup`],
    ['a magic-link type', `?token_hash=${HASH}&type=magiclink`],
    ['no type', `?token_hash=${HASH}`],
    ['no token', '?type=invite'],
    ['an empty token', '?token_hash=&type=invite'],
    ['a short token', '?token_hash=abc&type=invite'],
    ['a token with other characters', `?token_hash=${HASH.slice(0, 55)}%26&type=invite`],
    ['an upper-case token', `?token_hash=${HASH.toUpperCase()}&type=invite`],
    ['a repeated parameter', `?token_hash=${HASH}&type=invite&type=recovery`],
    ['nothing at all', ''],
  ])('rejects %s', (_label, search) => {
    expect(parsePasswordLink(search)).toBeNull();
  });
});
