import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Cleanup, runId, signedInClient } from './helpers';

/** Organization presidency and ministry supervisors, over HTTP with real user tokens (seed accounts). */

let bishop: SupabaseClient;
let rs: SupabaseClient;
let eq: SupabaseClient;
let viewer: SupabaseClient;
const cleanup = new Cleanup();
const rid = runId();
let counter = 0;

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

function uniq(label: string) {
  counter += 1;
  return `ITEST ${label} ${rid}-${counter}`;
}

async function mkMinistry(organization: 'RS' | 'EQ') {
  const number = 700000 + Math.floor(Math.random() * 100000);
  const { data, error } = await bishop
    .from('ministries')
    .insert({ organization, number, name: uniq('ministry') })
    .select('id')
    .single();
  if (error) throw new Error(`mkMinistry: ${error.message}`);
  cleanup.ministries.push(data.id);
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

async function supervisorOf(ministryId: string) {
  const { data, error } = await bishop
    .from('ministries')
    .select('supervisor_member_id')
    .eq('id', ministryId)
    .single();
  if (error) throw new Error(`supervisorOf: ${error.message}`);
  return data.supervisor_member_id as string | null;
}

async function inPresidency(org: 'RS' | 'EQ', memberId: string) {
  const { data, error } = await bishop
    .from('presidency_members')
    .select('member_id')
    .eq('organization', org)
    .eq('member_id', memberId);
  if (error) throw new Error(`inPresidency: ${error.message}`);
  return (data ?? []).length > 0;
}

describe('presidency and ministry supervisor', () => {
  it('eq can add an adult brother to the EQ presidency and assign him to an EQ ministry', async () => {
    const brother = await mkMember('M');
    const ministry = await mkMinistry('EQ');
    expect((await eq.from('presidency_members').insert({ organization: 'EQ', member_id: brother })).error).toBeNull();
    expect(
      (await eq.from('ministries').update({ supervisor_member_id: brother }).eq('id', ministry)).error,
    ).toBeNull();
    expect(await supervisorOf(ministry)).toBe(brother);
  });

  it("rejects a supervisor who is not in that organization's presidency", async () => {
    const sister = await mkMember('F');
    const ministry = await mkMinistry('EQ');
    expect((await rs.from('presidency_members').insert({ organization: 'RS', member_id: sister })).error).toBeNull();
    const { error } = await bishop.from('ministries').update({ supervisor_member_id: sister }).eq('id', ministry);
    expect(error?.code).toBe('23503');
    expect(await supervisorOf(ministry)).toBeNull();
  });

  it('removing a presidency member clears the ministries they supervised', async () => {
    const brother = await mkMember('M');
    const ministry = await mkMinistry('EQ');
    await bishop.from('presidency_members').insert({ organization: 'EQ', member_id: brother });
    await bishop.from('ministries').update({ supervisor_member_id: brother }).eq('id', ministry);
    expect(
      (await eq.from('presidency_members').delete().eq('organization', 'EQ').eq('member_id', brother)).error,
    ).toBeNull();
    expect(await supervisorOf(ministry)).toBeNull();
  });

  it('soft deleting a member removes them from the presidency and clears supervision', async () => {
    const sister = await mkMember('F');
    const ministry = await mkMinistry('RS');
    await bishop.from('presidency_members').insert({ organization: 'RS', member_id: sister });
    await bishop.from('ministries').update({ supervisor_member_id: sister }).eq('id', ministry);
    expect((await bishop.rpc('soft_delete_member', { p_member_id: sister })).error).toBeNull();
    expect(await inPresidency('RS', sister)).toBe(false);
    expect(await supervisorOf(ministry)).toBeNull();
  });

  it('rs cannot write the EQ presidency; viewer cannot write any', async () => {
    const brother = await mkMember('M');
    const sister = await mkMember('F');
    await rs.from('presidency_members').insert({ organization: 'EQ', member_id: brother });
    await viewer.from('presidency_members').insert({ organization: 'RS', member_id: sister });
    expect(await inPresidency('EQ', brother)).toBe(false);
    expect(await inPresidency('RS', sister)).toBe(false);
  });

  it('every signed-in user can read the presidency', async () => {
    const brother = await mkMember('M');
    await bishop.from('presidency_members').insert({ organization: 'EQ', member_id: brother });
    const { data, error } = await viewer.from('presidency_members').select('member_id').eq('member_id', brother);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});
