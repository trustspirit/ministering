import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Cleanup, newShareToken, runId, signedInClient } from './helpers';

/** A household's name and address each live in one place, and every reader sees the current value. */

let bishop: SupabaseClient;
const cleanup = new Cleanup();
const rid = runId();
let counter = 0;
const uniq = (label: string) => `ITEST ${label} ${rid}-${++counter}`;

beforeAll(async () => {
  bishop = await signedInClient('bishop');
});

afterAll(async () => {
  if (bishop) await cleanup.run(bishop);
});

async function mkHousehold(address: string) {
  const { data, error } = await bishop.from('households').insert({ address, lat: 37.5, lng: 127.0 }).select('id').single();
  if (error) throw new Error(`mkHousehold: ${error.message}`);
  cleanup.households.push(data.id);
  return data.id as string;
}

async function mkMember(householdId: string, fields: { gender: 'M' | 'F'; household_role: string; birth_date: string }) {
  const full_name = uniq('member');
  const { data, error } = await bishop
    .from('members')
    .insert({ full_name, household_id: householdId, ...fields })
    .select('id')
    .single();
  if (error) throw new Error(`mkMember: ${error.message}`);
  cleanup.members.push(data.id);
  return { id: data.id as string, full_name };
}

async function listed(householdId: string) {
  const { data, error } = await bishop.from('household_list').select('name, address').eq('id', householdId).single();
  if (error) throw new Error(`listed: ${error.message}`);
  return data;
}

describe('household name and address have a single source', () => {
  it('the name follows the husband, and renaming him renames the household', async () => {
    const hh = await mkHousehold('서울 테스트구 1');
    await mkMember(hh, { gender: 'F', household_role: 'wife', birth_date: '1980-01-01' });
    const husband = await mkMember(hh, { gender: 'M', household_role: 'husband', birth_date: '1979-01-01' });
    expect((await listed(hh)).name).toBe(`${husband.full_name} 가정`);

    const renamed = uniq('renamed');
    await bishop.from('members').update({ full_name: renamed }).eq('id', husband.id);
    expect((await listed(hh)).name).toBe(`${renamed} 가정`);
  });

  it('without husband or wife the oldest adult names the household; empty households read 새 가정', async () => {
    const hh = await mkHousehold('서울 테스트구 2');
    expect((await listed(hh)).name).toBe('새 가정');
    await mkMember(hh, { gender: 'M', household_role: 'child', birth_date: '2015-01-01' });
    const adult = await mkMember(hh, { gender: 'F', household_role: 'other', birth_date: '1990-01-01' });
    expect((await listed(hh)).name).toBe(`${adult.full_name} 가정`);
  });

  it('members carry no address of their own', async () => {
    const { error } = await bishop.from('members').select('address').limit(1);
    expect(error).not.toBeNull();
  });

  it("the share page shows a sister's household address and the derived household name", async () => {
    const hh = await mkHousehold('서울 테스트구 3');
    const sister = await mkMember(hh, { gender: 'F', household_role: 'wife', birth_date: '1970-01-01' });
    const token = newShareToken();
    const { data: ministry, error } = await bishop
      .from('ministries')
      .insert({ organization: 'RS', number: 800000 + Math.floor(Math.random() * 99999) })
      .select('id')
      .single();
    if (error) throw new Error(`ministry: ${error.message}`);
    cleanup.ministries.push(ministry.id);
    await bishop.rpc('set_ministry_share_token', { p_ministry_id: ministry.id, p_token: token });
    await bishop.from('ministry_member_recipients').insert({ ministry_id: ministry.id, member_id: sister.id });
    await bishop.from('households').update({ address: '서울 테스트구 33' }).eq('id', hh);

    const { data } = await bishop.rpc('get_ministry_share', { p_token: token });
    expect(data.recipients).toEqual([
      { type: 'member', name: sister.full_name, phone: null, address: '서울 테스트구 33' },
    ]);
  });
});
