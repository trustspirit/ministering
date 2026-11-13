import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  Cleanup,
  collectKeys,
  newClient,
  newShareToken,
  runId,
  signedInClient,
} from './helpers';

/**
 * Security-critical database behaviour, exercised over HTTP with real user tokens against the local stack
 * (seed accounts bishop@/rs@/eq@/viewer@test.local). Every test creates the rows it needs, uses unique names and
 * does not depend on the order of the others.
 */

let bishop: SupabaseClient;
let rs: SupabaseClient;
let eq: SupabaseClient;
let viewer: SupabaseClient;
let anon: SupabaseClient;
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
  anon = newClient();
});

afterAll(async () => {
  if (bishop) await cleanup.run(bishop);
});

function uniq(label: string) {
  counter += 1;
  return `ITEST ${label} ${rid}-${counter}`;
}

async function mkMinistry(organization: 'RS' | 'EQ') {
  const number = 800000 + Math.floor(Math.random() * 100000);
  const { data, error } = await bishop
    .from('ministries')
    .insert({ organization, number, name: uniq('ministry') })
    .select('id')
    .single();
  if (error) throw new Error(`mkMinistry: ${error.message}`);
  cleanup.ministries.push(data.id);
  return data.id as string;
}

async function mkHousehold(address: string | null = '서울 테스트구 1') {
  const { data, error } = await bishop
    .from('households')
    .insert({ name: uniq('household'), address, memo: 'SECRET-HOUSEHOLD-MEMO', lat: 37.5, lng: 127.0 })
    .select('id, name')
    .single();
  if (error) throw new Error(`mkHousehold: ${error.message}`);
  cleanup.households.push(data.id);
  return data as { id: string; name: string };
}

async function mkMember(
  extra: Partial<{
    gender: 'M' | 'F';
    household_id: string;
    household_role: 'husband' | 'wife' | 'child' | 'other';
    address: string | null;
    birth_date: string;
  }> = {},
) {
  const { data, error } = await bishop
    .from('members')
    .insert({
      full_name: uniq('member'),
      gender: 'F',
      birth_date: '1985-05-05',
      phone: '010-0000-0000',
      memo: 'SECRET-MEMO',
      address: '서울 테스트구 2',
      lat: 37.5,
      lng: 127.0,
      personality: 'passive',
      active_status: 'less_active',
      ...extra,
    })
    .select('id, full_name')
    .single();
  if (error) throw new Error(`mkMember: ${error.message}`);
  cleanup.members.push(data.id);
  return data as { id: string; full_name: string };
}

const ALLOWED_COLUMNS = 'id, organization, number, name, created_at, updated_at';

describe('ministries.share_token column privilege', () => {
  let rsMinistry: string;
  beforeAll(async () => {
    rsMinistry = await mkMinistry('RS');
  });

  it.each([
    ['viewer', () => viewer],
    ['the other organization president', () => eq],
    ['the same organization president', () => rs],
    ['bishopric', () => bishop],
  ])('%s cannot select share_token', async (_label, who) => {
    const { data, error } = await who().from('ministries').select('share_token').eq('id', rsMinistry);
    expect(data).toBeNull();
    expect(error?.code).toBe('42501');
    const star = await who().from('ministries').select('*').eq('id', rsMinistry);
    expect(star.error?.code).toBe('42501');
  });

  it('allows the other columns', async () => {
    for (const who of [viewer, eq]) {
      const { data, error } = await who.from('ministries').select(ALLOWED_COLUMNS).eq('id', rsMinistry);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    }
  });

  it('refuses anonymous access to the table', async () => {
    const { error } = await anon.from('ministries').select('id').limit(1);
    expect(error?.code).toBe('42501');
  });
});

describe('get_ministry_share_token / set_ministry_share_token', () => {
  let rsMinistry: string;
  let eqMinistry: string;
  beforeAll(async () => {
    [rsMinistry, eqMinistry] = await Promise.all([mkMinistry('RS'), mkMinistry('EQ')]);
  });

  it('lets the right president and the bishopric set and read the token', async () => {
    const t1 = newShareToken();
    const t2 = newShareToken();
    const t3 = newShareToken();
    const t4 = newShareToken();

    expect((await rs.rpc('set_ministry_share_token', { p_ministry_id: rsMinistry, p_token: t1 })).error).toBeNull();
    const got1 = await rs.rpc('get_ministry_share_token', { p_ministry_id: rsMinistry });
    expect(got1.error).toBeNull();
    expect(got1.data).toBe(t1);

    expect((await bishop.rpc('set_ministry_share_token', { p_ministry_id: rsMinistry, p_token: t2 })).error).toBeNull();
    expect((await bishop.rpc('get_ministry_share_token', { p_ministry_id: rsMinistry })).data).toBe(t2);

    expect((await eq.rpc('set_ministry_share_token', { p_ministry_id: eqMinistry, p_token: t3 })).error).toBeNull();
    expect((await eq.rpc('get_ministry_share_token', { p_ministry_id: eqMinistry })).data).toBe(t3);

    expect((await bishop.rpc('set_ministry_share_token', { p_ministry_id: eqMinistry, p_token: t4 })).error).toBeNull();
    expect((await bishop.rpc('get_ministry_share_token', { p_ministry_id: eqMinistry })).data).toBe(t4);
  });

  it('refuses viewer and the other president with 42501', async () => {
    const token = newShareToken();
    for (const [who, ministry] of [
      [viewer, rsMinistry],
      [viewer, eqMinistry],
      [eq, rsMinistry],
      [rs, eqMinistry],
    ] as const) {
      const get = await who.rpc('get_ministry_share_token', { p_ministry_id: ministry });
      expect(get.error?.code).toBe('42501');
      expect(get.data).toBeNull();
      const set = await who.rpc('set_ministry_share_token', { p_ministry_id: ministry, p_token: token });
      expect(set.error?.code).toBe('42501');
    }
  });

  it('refuses anonymous callers', async () => {
    const get = await anon.rpc('get_ministry_share_token', { p_ministry_id: rsMinistry });
    expect(get.error).not.toBeNull();
    const set = await anon.rpc('set_ministry_share_token', { p_ministry_id: rsMinistry, p_token: newShareToken() });
    expect(set.error).not.toBeNull();
  });

  it('rejects malformed tokens with 22023 and accepts NULL', async () => {
    const valid = newShareToken();
    await rs.rpc('set_ministry_share_token', { p_ministry_id: rsMinistry, p_token: valid });

    const short = await rs.rpc('set_ministry_share_token', { p_ministry_id: rsMinistry, p_token: valid.slice(0, 63) });
    expect(short.error?.code).toBe('22023');
    const upper = await rs.rpc('set_ministry_share_token', { p_ministry_id: rsMinistry, p_token: valid.toUpperCase() });
    expect(upper.error?.code).toBe('22023');
    // a rejected write leaves the stored token untouched
    expect((await rs.rpc('get_ministry_share_token', { p_ministry_id: rsMinistry })).data).toBe(valid);

    const cleared = await rs.rpc('set_ministry_share_token', { p_ministry_id: rsMinistry, p_token: null });
    expect(cleared.error).toBeNull();
    expect((await rs.rpc('get_ministry_share_token', { p_ministry_id: rsMinistry })).data).toBeNull();
  });
});

describe('get_ministry_share (anonymous)', () => {
  it('returns NULL for null, short and unknown tokens', async () => {
    for (const p_token of [null, newShareToken().slice(0, 31), newShareToken()]) {
      const { data, error } = await anon.rpc('get_ministry_share', { p_token });
      expect(error).toBeNull();
      expect(data).toBeNull();
    }
  });

  it('returns exactly the allow-listed keys for an RS ministry and hides soft-deleted members', async () => {
    const ministry = await mkMinistry('RS');
    const token = newShareToken();
    await bishop.rpc('set_ministry_share_token', { p_ministry_id: ministry, p_token: token });

    const companion = await mkMember({ gender: 'F', birth_date: '1980-01-01' });
    const goneCompanion = await mkMember({ gender: 'F', birth_date: '1981-01-01' });
    const recipient = await mkMember({ gender: 'F', birth_date: '1950-01-01' });
    const goneRecipient = await mkMember({ gender: 'F', birth_date: '1951-01-01' });
    await bishop.from('ministry_companions').insert([
      { ministry_id: ministry, member_id: companion.id },
      { ministry_id: ministry, member_id: goneCompanion.id },
    ]);
    await bishop.from('ministry_member_recipients').insert([
      { ministry_id: ministry, member_id: recipient.id },
      { ministry_id: ministry, member_id: goneRecipient.id },
    ]);
    expect((await bishop.rpc('soft_delete_member', { p_member_id: goneCompanion.id })).error).toBeNull();
    expect((await bishop.rpc('soft_delete_member', { p_member_id: goneRecipient.id })).error).toBeNull();

    const { data, error } = await anon.rpc('get_ministry_share', { p_token: token });
    expect(error).toBeNull();
    expect(Object.keys(data).sort()).toEqual(['companions', 'name', 'number', 'organization', 'recipients']);
    expect(data.organization).toBe('RS');
    expect(data.companions).toHaveLength(1);
    expect(data.companions[0].name).toBe(companion.full_name);
    expect(Object.keys(data.companions[0]).sort()).toEqual(['name', 'phone']);
    expect(data.recipients).toHaveLength(1);
    expect(data.recipients[0].name).toBe(recipient.full_name);
    expect(Object.keys(data.recipients[0]).sort()).toEqual(['address', 'name', 'phone', 'type']);
    expect(data.recipients[0].type).toBe('member');

    const text = JSON.stringify(data);
    expect(text).not.toContain(goneCompanion.full_name);
    expect(text).not.toContain(goneRecipient.full_name);
    assertNoLeaks(data);
  });

  it('returns exactly the allow-listed keys for an EQ ministry and hides soft-deleted household members', async () => {
    const ministry = await mkMinistry('EQ');
    const token = newShareToken();
    await bishop.rpc('set_ministry_share_token', { p_ministry_id: ministry, p_token: token });

    const household = await mkHousehold('서울 테스트구 99');
    const husband = await mkMember({ gender: 'M', household_id: household.id, household_role: 'husband', birth_date: '1970-01-01' });
    const gone = await mkMember({ gender: 'M', household_id: household.id, household_role: 'child', birth_date: '2000-01-01' });
    const companion = await mkMember({ gender: 'M', birth_date: '1982-02-02' });
    await bishop.from('ministry_household_recipients').insert({ ministry_id: ministry, household_id: household.id });
    await bishop.from('ministry_companions').insert({ ministry_id: ministry, member_id: companion.id });
    expect((await bishop.rpc('soft_delete_member', { p_member_id: gone.id })).error).toBeNull();

    const { data, error } = await anon.rpc('get_ministry_share', { p_token: token });
    expect(error).toBeNull();
    expect(Object.keys(data).sort()).toEqual(['companions', 'name', 'number', 'organization', 'recipients']);
    expect(data.organization).toBe('EQ');
    expect(data.recipients).toHaveLength(1);
    const rec = data.recipients[0];
    expect(Object.keys(rec).sort()).toEqual(['address', 'members', 'name', 'type']);
    expect(rec.type).toBe('household');
    expect(rec.name).toBe(household.name);
    expect(rec.address).toBe('서울 테스트구 99');
    expect(rec.members).toHaveLength(1);
    expect(rec.members[0].name).toBe(husband.full_name);
    expect(Object.keys(rec.members[0]).sort()).toEqual(['age', 'gender', 'name', 'phone']);
    expect(JSON.stringify(data)).not.toContain(gone.full_name);
    assertNoLeaks(data);
  });

  function assertNoLeaks(payload: unknown) {
    const keys = collectKeys(payload);
    for (const forbidden of ['memo', 'status', 'active_status', 'personality', 'id', 'lat', 'lng', 'share_token', 'household_id']) {
      expect(keys.has(forbidden), `payload must not contain key "${forbidden}"`).toBe(false);
    }
    const text = JSON.stringify(payload);
    expect(text).not.toContain('SECRET-MEMO');
    expect(text).not.toContain('SECRET-HOUSEHOLD-MEMO');
  }
});

describe('soft_delete_member', () => {
  it('refuses viewer with 42501 and leaves the member', async () => {
    const m = await mkMember();
    const { error } = await viewer.rpc('soft_delete_member', { p_member_id: m.id });
    expect(error?.code).toBe('42501');
    const { data } = await bishop.from('members').select('id').eq('id', m.id);
    expect(data).toHaveLength(1);
  });

  it('refuses anonymous callers', async () => {
    const m = await mkMember();
    const { error } = await anon.rpc('soft_delete_member', { p_member_id: m.id });
    expect(error).not.toBeNull();
  });

  it('deletes for the bishopric and removes the member from companion and recipient rows', async () => {
    const rsMinistry = await mkMinistry('RS');
    const companion = await mkMember();
    const recipient = await mkMember();
    await bishop.from('ministry_companions').insert({ ministry_id: rsMinistry, member_id: companion.id });
    await bishop.from('ministry_member_recipients').insert({ ministry_id: rsMinistry, member_id: recipient.id });

    expect((await bishop.rpc('soft_delete_member', { p_member_id: companion.id })).error).toBeNull();
    expect((await bishop.rpc('soft_delete_member', { p_member_id: recipient.id })).error).toBeNull();

    const members = await bishop.from('members').select('id').in('id', [companion.id, recipient.id]);
    expect(members.data).toEqual([]);
    const companions = await bishop.from('ministry_companions').select('member_id').eq('ministry_id', rsMinistry);
    expect(companions.data).toEqual([]);
    const recipients = await bishop.from('ministry_member_recipients').select('member_id').eq('ministry_id', rsMinistry);
    expect(recipients.data).toEqual([]);
  });

  it('also works for a president', async () => {
    const m = await mkMember();
    expect((await rs.rpc('soft_delete_member', { p_member_id: m.id })).error).toBeNull();
  });

  it('reports P0002 for a missing and for an already-deleted id', async () => {
    const missing = await bishop.rpc('soft_delete_member', { p_member_id: '00000000-0000-4000-8000-000000000000' });
    expect(missing.error?.code).toBe('P0002');

    const m = await mkMember();
    expect((await bishop.rpc('soft_delete_member', { p_member_id: m.id })).error).toBeNull();
    const again = await bishop.rpc('soft_delete_member', { p_member_id: m.id });
    expect(again.error?.code).toBe('P0002');
  });
});

describe('role guards on app_user_profiles', () => {
  async function roleOf(email: string) {
    const { data } = await bishop.rpc('get_app_users');
    return (data as { email: string; role: string }[]).find((u) => u.email === email)?.role;
  }

  it('the only bishopric cannot change their own role (P0001 last_bishopric)', async () => {
    const { data: session } = await bishop.auth.getUser();
    const id = session.user!.id;
    const { error } = await bishop.from('app_user_profiles').update({ role: 'viewer' }).eq('user_id', id);
    expect(error?.code).toBe('P0001');
    expect(error?.message).toBe('last_bishopric');
    expect(await roleOf('bishop@test.local')).toBe('bishopric');
  });

  it('a non-bishopric cannot change roles (42501)', async () => {
    for (const [client, email] of [
      [rs, 'rs@test.local'],
      [viewer, 'viewer@test.local'],
      [eq, 'eq@test.local'],
    ] as const) {
      const { data: session } = await client.auth.getUser();
      const before = await roleOf(email);
      const { error } = await client
        .from('app_user_profiles')
        .update({ role: 'bishopric' })
        .eq('user_id', session.user!.id);
      expect(error?.code).toBe('42501');
      expect(await roleOf(email)).toBe(before);
    }
  });

  it('a non-bishopric cannot list users (42501)', async () => {
    const { error } = await viewer.rpc('get_app_users');
    expect(error?.code).toBe('42501');
  });
});

describe('app_user_profiles.display_name constraint', () => {
  const RS_NAME = '상호부조회장';
  const setOwnName = async (name: string | null) => {
    const { data: session } = await rs.auth.getUser();
    return rs.from('app_user_profiles').update({ display_name: name }).eq('user_id', session.user!.id);
  };
  afterAll(async () => {
    if (rs) await setOwnName(RS_NAME);
  });

  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['51 characters', '가'.repeat(51)],
    ['a control character', 'Kim\u0007'],
    ['a newline', 'Kim\nLee'],
    ['DEL', 'Kim\u007f'],
    ['a bidi override', 'Kim\u202eLee'],
    ['a bidi isolate', 'Kim\u2066Lee'],
  ])('refuses %s with a check violation', async (_label, name) => {
    const { error } = await setOwnName(name);
    expect(error?.code).toBe('23514');
  });

  it('accepts 1 and 50 characters, Korean text, and NULL', async () => {
    for (const name of ['가', '가'.repeat(50), 'Kim 김 Lee', null]) {
      const { error } = await setOwnName(name);
      expect(error, `name ${JSON.stringify(name)}`).toBeNull();
    }
  });
});

describe('public signup', () => {
  it('is refused', async () => {
    const { data, error } = await anon.auth.signUp({
      email: `itest-${rid}@example.com`,
      password: 'a-long-enough-password-1',
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe('signup_disabled');
    expect(data.user).toBeNull();
  });
});
