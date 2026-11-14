import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Cleanup, runId, signedInClient } from './helpers';

/** The ministry pool: who appears on an organization's assignment board, by role. */

let bishop: SupabaseClient;
let rs: SupabaseClient;
let eq: SupabaseClient;
let viewer: SupabaseClient;
const cleanup = new Cleanup();
const rid = runId();
let counter = 0;
const uniq = (label: string) => `ITEST ${label} ${rid}-${++counter}`;

beforeAll(async () => {
  [bishop, rs, eq, viewer] = await Promise.all([
    signedInClient('bishop'),
    signedInClient('rs'),
    signedInClient('eq'),
    signedInClient('viewer'),
  ]);
});

afterAll(async () => {
  if (bishop) await cleanup.run(bishop);
});

async function mkMinistry(organization: 'RS' | 'EQ') {
  const { data, error } = await bishop
    .from('ministries')
    .insert({ organization, number: 700000 + Math.floor(Math.random() * 100000), name: uniq('ministry') })
    .select('id')
    .single();
  if (error) throw new Error(`mkMinistry: ${error.message}`);
  cleanup.ministries.push(data.id);
  return data.id as string;
}

async function mkHousehold() {
  const { data, error } = await bishop.from('households').insert({ address: null }).select('id').single();
  if (error) throw new Error(`mkHousehold: ${error.message}`);
  cleanup.households.push(data.id);
  return data.id as string;
}

async function mkMember(gender: 'M' | 'F') {
  const { data, error } = await bishop
    .from('members')
    .insert({ full_name: uniq('member'), gender, birth_date: '1980-01-01' })
    .select('id')
    .single();
  if (error) throw new Error(`mkMember: ${error.message}`);
  cleanup.members.push(data.id);
  return data.id as string;
}

async function poolOf(org: 'RS' | 'EQ', role: 'companion' | 'recipient') {
  const { data, error } = await bishop
    .from('ministry_pool')
    .select('member_id, household_id')
    .eq('organization', org)
    .eq('role', role);
  if (error) throw new Error(`poolOf: ${error.message}`);
  return new Set((data ?? []).map((r) => r.member_id ?? r.household_id));
}

describe('ministry pool', () => {
  it('a president adds people to their own organization’s pool, by role', async () => {
    const sister = await mkMember('F');
    expect((await rs.from('ministry_pool').insert({ organization: 'RS', role: 'companion', member_id: sister })).error).toBeNull();
    expect((await poolOf('RS', 'companion')).has(sister)).toBe(true);
    expect((await poolOf('RS', 'recipient')).has(sister)).toBe(false);
  });

  it('EQ recipients are households; a member there is refused', async () => {
    const hh = await mkHousehold();
    const brother = await mkMember('M');
    expect((await eq.from('ministry_pool').insert({ organization: 'EQ', role: 'recipient', household_id: hh })).error).toBeNull();
    const { error } = await eq.from('ministry_pool').insert({ organization: 'EQ', role: 'recipient', member_id: brother });
    expect(error?.code).toBe('23514');
  });

  it('assigning someone puts them in the pool, and unassigning keeps them there', async () => {
    const sister = await mkMember('F');
    const ministry = await mkMinistry('RS');
    await bishop.from('ministry_member_recipients').insert({ ministry_id: ministry, member_id: sister });
    expect((await poolOf('RS', 'recipient')).has(sister)).toBe(true);
    await bishop.from('ministry_member_recipients').delete().eq('member_id', sister);
    expect((await poolOf('RS', 'recipient')).has(sister)).toBe(true);
  });

  it('assigning a companion and an EQ household also fills the pool', async () => {
    const brother = await mkMember('M');
    const hh = await mkHousehold();
    const ministry = await mkMinistry('EQ');
    await bishop.from('ministry_companions').insert({ ministry_id: ministry, member_id: brother });
    await bishop.from('ministry_household_recipients').insert({ ministry_id: ministry, household_id: hh });
    expect((await poolOf('EQ', 'companion')).has(brother)).toBe(true);
    expect((await poolOf('EQ', 'recipient')).has(hh)).toBe(true);
  });

  it('adding someone already in the pool is a unique violation', async () => {
    const sister = await mkMember('F');
    await rs.from('ministry_pool').insert({ organization: 'RS', role: 'recipient', member_id: sister });
    const { error } = await rs.from('ministry_pool').insert({ organization: 'RS', role: 'recipient', member_id: sister });
    expect(error?.code).toBe('23505');
  });

  it('soft deleting a member removes them from every pool', async () => {
    const sister = await mkMember('F');
    await bishop.from('ministry_pool').insert({ organization: 'RS', role: 'companion', member_id: sister });
    expect((await bishop.rpc('soft_delete_member', { p_member_id: sister })).error).toBeNull();
    expect((await poolOf('RS', 'companion')).has(sister)).toBe(false);
  });

  it('rs cannot write the EQ pool; a viewer can read but not write', async () => {
    const brother = await mkMember('M');
    await rs.from('ministry_pool').insert({ organization: 'EQ', role: 'companion', member_id: brother });
    await viewer.from('ministry_pool').insert({ organization: 'EQ', role: 'companion', member_id: brother });
    expect((await poolOf('EQ', 'companion')).has(brother)).toBe(false);
    expect((await viewer.from('ministry_pool').select('id').limit(1)).error).toBeNull();
  });

  it('a president removes someone from the pool', async () => {
    const sister = await mkMember('F');
    await rs.from('ministry_pool').insert({ organization: 'RS', role: 'companion', member_id: sister });
    expect(
      (await rs.from('ministry_pool').delete().eq('organization', 'RS').eq('role', 'companion').eq('member_id', sister)).error,
    ).toBeNull();
    expect((await poolOf('RS', 'companion')).has(sister)).toBe(false);
  });
});
