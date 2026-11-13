import { beforeAll, describe, expect, it } from 'vitest';
import { supabase } from '@/shared/lib/supabase';
import { memberRepository } from '@/repositories/MemberRepository';
import { householdRepository } from '@/repositories/HouseholdRepository';
import { ministryRepository } from '@/repositories/MinistryRepository';

/**
 * Smoke tests: the app's client, signed in as the seed viewer, can execute the
 * repositories' read queries against the local Supabase stack without network or
 * schema errors. (The ministries table is not readable by anonymous clients.)
 */

describe('Repository smoke (local Supabase)', () => {
  beforeAll(async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: 'viewer@test.local',
      password: 'password',
    });
    if (error) throw new Error(`Cannot sign in as viewer@test.local: ${error.message}. Run 'npx supabase db reset'.`);
  });

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
