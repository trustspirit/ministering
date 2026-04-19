import { describe, expect, it } from 'vitest';
import { memberRepository } from '@/repositories/MemberRepository';
import { householdRepository } from '@/repositories/HouseholdRepository';
import { ministryRepository } from '@/repositories/MinistryRepository';

/**
 * Smoke tests: the anon client can execute read queries against the local
 * Supabase stack without network or schema errors. Rows returned may be
 * empty (RLS restricts writes to authenticated users with specific roles).
 */

describe('Repository smoke (local Supabase)', () => {
  it('memberRepository.listActive() returns array', async () => {
    const members = await memberRepository.listActive();
    expect(Array.isArray(members)).toBe(true);
  });

  it('householdRepository.list() returns array', async () => {
    const households = await householdRepository.list();
    expect(Array.isArray(households)).toBe(true);
  });

  it('ministryRepository.listByOrganization("RS") returns array', async () => {
    const ministries = await ministryRepository.listByOrganization('RS');
    expect(Array.isArray(ministries)).toBe(true);
  });

  it('ministryRepository.getExistingNumbers returns numbers', async () => {
    const nums = await ministryRepository.getExistingNumbers('RS');
    expect(Array.isArray(nums)).toBe(true);
    nums.forEach((n) => expect(typeof n).toBe('number'));
  });
});
