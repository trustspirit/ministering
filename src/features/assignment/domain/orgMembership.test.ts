import { isOrgMember, memberOrganization } from './orgMembership';

const t = new Date('2026-11-12');

describe('memberOrganization', () => {
  it('returns EQ for a male who is exactly 18', () => {
    expect(memberOrganization({ gender: 'M', birth_date: '2008-11-12' }, t)).toBe('EQ');
  });
  it('returns null for a 17-year-old male', () => {
    expect(memberOrganization({ gender: 'M', birth_date: '2008-11-13' }, t)).toBeNull();
  });
  it('returns RS for an adult female', () => {
    expect(memberOrganization({ gender: 'F', birth_date: '1990-01-01' }, t)).toBe('RS');
  });
  it('returns null for a girl under 18', () => {
    expect(memberOrganization({ gender: 'F', birth_date: '2014-01-01' }, t)).toBeNull();
  });
});

describe('isOrgMember', () => {
  it('is false for a woman in EQ', () => {
    expect(isOrgMember({ gender: 'F', birth_date: '1990-01-01' }, 'EQ', t)).toBe(false);
  });
  it('is true for a woman in RS', () => {
    expect(isOrgMember({ gender: 'F', birth_date: '1990-01-01' }, 'RS', t)).toBe(true);
  });
});
