import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAdminUsers, type AdminDeps } from './handler.ts';

const BISHOP = { id: '11111111-1111-4111-8111-111111111111', role: 'bishopric' as const };
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const NEW_ID = '33333333-3333-4333-8333-333333333333';
const HASH = 'a'.repeat(56);

function fakeDeps() {
  return {
    getCaller: vi.fn<AdminDeps['getCaller']>(async (token) => (token === 'bishop-token' ? BISHOP : null)),
    findUserByEmail: vi.fn<AdminDeps['findUserByEmail']>(async () => null),
    generateLink: vi.fn<AdminDeps['generateLink']>(async () => ({ userId: NEW_ID, tokenHash: HASH })),
    getUser: vi.fn<AdminDeps['getUser']>(async (id) =>
      id === OTHER_ID ? { email: 'other@test.local', confirmed: true } : null,
    ),
    setProfile: vi.fn<AdminDeps['setProfile']>(async () => {}),
    listBishopricIds: vi.fn<AdminDeps['listBishopricIds']>(async () => [BISHOP.id]),
    deleteUser: vi.fn<AdminDeps['deleteUser']>(async () => {}),
    log: vi.fn<NonNullable<AdminDeps['log']>>(),
  };
}

type Deps = ReturnType<typeof fakeDeps>;

const auth = 'Bearer bishop-token';
const createBody = { action: 'create', email: '  New.Person@Test.Local ', displayName: '  새 사람 ', role: 'eq_president' };

function mutationCalls(deps: Deps) {
  return (
    deps.generateLink.mock.calls.length + deps.setProfile.mock.calls.length + deps.deleteUser.mock.calls.length
  );
}

describe('handleAdminUsers — who may call', () => {
  let deps: Deps;
  beforeEach(() => {
    deps = fakeDeps();
  });

  it('answers 401 without an Authorization header and changes nothing', async () => {
    const res = await handleAdminUsers({ authHeader: null, body: createBody }, deps);
    expect(res.status).toBe(401);
    expect(deps.getCaller).not.toHaveBeenCalled();
    expect(mutationCalls(deps)).toBe(0);
  });

  it('answers 401 for a header that is not a bearer token', async () => {
    const res = await handleAdminUsers({ authHeader: 'Basic abc', body: createBody }, deps);
    expect(res.status).toBe(401);
    expect(mutationCalls(deps)).toBe(0);
  });

  it('answers 401 when the token does not belong to a signed-in user', async () => {
    const res = await handleAdminUsers({ authHeader: 'Bearer forged', body: createBody }, deps);
    expect(res.status).toBe(401);
    expect(deps.getCaller).toHaveBeenCalledWith('forged');
    expect(mutationCalls(deps)).toBe(0);
  });

  it.each(['viewer', 'eq_president', 'rs_president'] as const)(
    'answers 403 to a %s for every action and changes nothing',
    async (role) => {
      deps.getCaller.mockResolvedValue({ id: OTHER_ID, role });
      for (const body of [
        createBody,
        { action: 'reset', userId: OTHER_ID },
        { action: 'delete', userId: BISHOP.id },
      ]) {
        const res = await handleAdminUsers({ authHeader: auth, body }, deps);
        expect(res.status).toBe(403);
      }
      expect(mutationCalls(deps)).toBe(0);
    },
  );

  it('ignores a role or caller id claimed in the body', async () => {
    deps.getCaller.mockResolvedValue({ id: OTHER_ID, role: 'viewer' });
    const res = await handleAdminUsers(
      { authHeader: auth, body: { ...createBody, callerRole: 'bishopric', callerId: BISHOP.id, caller: BISHOP } },
      deps,
    );
    expect(res.status).toBe(403);
    expect(mutationCalls(deps)).toBe(0);
  });
});

describe('handleAdminUsers — create', () => {
  let deps: Deps;
  beforeEach(() => {
    deps = fakeDeps();
  });

  it('creates a passwordless account with an invite link and the chosen role and name', async () => {
    const res = await handleAdminUsers({ authHeader: auth, body: createBody }, deps);
    expect(res.status).toBe(200);
    expect(deps.findUserByEmail).toHaveBeenCalledWith('new.person@test.local');
    expect(deps.generateLink).toHaveBeenCalledTimes(1);
    expect(deps.generateLink).toHaveBeenCalledWith({
      type: 'invite',
      email: 'new.person@test.local',
      displayName: '새 사람',
    });
    expect(deps.setProfile).toHaveBeenCalledTimes(1);
    expect(deps.setProfile).toHaveBeenCalledWith(NEW_ID, { role: 'eq_president', displayName: '새 사람' });
    expect(Object.keys(res.body as object).sort()).toEqual(['tokenHash', 'type', 'userId']);
    expect(res.body).toEqual({ userId: NEW_ID, tokenHash: HASH, type: 'invite' });
  });

  it.each([
    ['a malformed email', { email: 'not-an-email' }, 'invalid_email'],
    ['an email with spaces inside', { email: 'a b@test.local' }, 'invalid_email'],
    ['a missing email', { email: undefined }, 'invalid_email'],
    ['an empty name', { displayName: '   ' }, 'invalid_name'],
    ['a name over 50 characters', { displayName: '가'.repeat(51) }, 'invalid_name'],
    ['an unknown role', { role: 'admin' }, 'invalid_role'],
  ])('answers 400 for %s', async (_label, patch, code) => {
    const res = await handleAdminUsers({ authHeader: auth, body: { ...createBody, ...patch } }, deps);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: code });
    expect(mutationCalls(deps)).toBe(0);
  });

  it('answers 400 for an unknown action or a body that is not an object', async () => {
    for (const body of [{ action: 'promote', userId: OTHER_ID }, null, 'create', []]) {
      const res = await handleAdminUsers({ authHeader: auth, body }, deps);
      expect(res.status).toBe(400);
    }
    expect(mutationCalls(deps)).toBe(0);
  });

  it('answers 409 when the email already has an account, without touching it', async () => {
    deps.findUserByEmail.mockResolvedValue({ id: OTHER_ID });
    const res = await handleAdminUsers({ authHeader: auth, body: createBody }, deps);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'email_exists' });
    expect(mutationCalls(deps)).toBe(0);
  });

  it('answers 409 when the auth server reports the email as already registered', async () => {
    deps.generateLink.mockRejectedValue(new Error('A user with this email address has already been registered'));
    const res = await handleAdminUsers({ authHeader: auth, body: createBody }, deps);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'email_exists' });
    expect(deps.setProfile).not.toHaveBeenCalled();
  });

  it('removes the new account again when its profile cannot be set (no half-created users)', async () => {
    deps.setProfile.mockRejectedValue(new Error('update failed: secret details'));
    const res = await handleAdminUsers({ authHeader: auth, body: createBody }, deps);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'internal_error' });
    expect(deps.deleteUser).toHaveBeenCalledWith(NEW_ID);
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });

  it('answers 500 with a fixed code when the auth server fails, never its raw text', async () => {
    deps.generateLink.mockRejectedValue(new Error('Database error saving new user: relation does not exist'));
    const res = await handleAdminUsers({ authHeader: auth, body: createBody }, deps);
    expect(res).toEqual({ status: 500, body: { error: 'internal_error' } });
    expect(deps.setProfile).not.toHaveBeenCalled();
  });
});

describe('handleAdminUsers — reset', () => {
  let deps: Deps;
  beforeEach(() => {
    deps = fakeDeps();
  });

  it('makes a recovery link for someone who has accepted their invitation', async () => {
    const res = await handleAdminUsers({ authHeader: auth, body: { action: 'reset', userId: OTHER_ID } }, deps);
    expect(deps.getUser).toHaveBeenCalledWith(OTHER_ID);
    expect(deps.generateLink).toHaveBeenCalledTimes(1);
    expect(deps.generateLink).toHaveBeenCalledWith({ type: 'recovery', email: 'other@test.local' });
    expect(res).toEqual({ status: 200, body: { userId: OTHER_ID, tokenHash: HASH, type: 'recovery' } });
    expect(deps.setProfile).not.toHaveBeenCalled();
  });

  it('re-issues the invitation for someone who never opened theirs, so the old invite link stops working', async () => {
    deps.getUser.mockResolvedValue({ email: 'other@test.local', confirmed: false });
    const res = await handleAdminUsers({ authHeader: auth, body: { action: 'reset', userId: OTHER_ID } }, deps);
    expect(deps.generateLink).toHaveBeenCalledWith({ type: 'invite', email: 'other@test.local' });
    expect(res).toEqual({ status: 200, body: { userId: OTHER_ID, tokenHash: HASH, type: 'invite' } });
    expect(deps.setProfile).not.toHaveBeenCalled();
  });

  it('answers 400 for an unknown or malformed user id', async () => {
    for (const userId of ['44444444-4444-4444-8444-444444444444', 'not-a-uuid', undefined, 42]) {
      const res = await handleAdminUsers({ authHeader: auth, body: { action: 'reset', userId } }, deps);
      expect(res.status).toBe(400);
    }
    expect(mutationCalls(deps)).toBe(0);
  });
});

describe('handleAdminUsers — delete', () => {
  let deps: Deps;
  beforeEach(() => {
    deps = fakeDeps();
  });

  it('refuses to delete the caller themselves', async () => {
    const res = await handleAdminUsers({ authHeader: auth, body: { action: 'delete', userId: BISHOP.id } }, deps);
    expect(res).toEqual({ status: 403, body: { error: 'cannot_delete_self' } });
    expect(deps.deleteUser).not.toHaveBeenCalled();
  });

  it('deletes another user once', async () => {
    const res = await handleAdminUsers({ authHeader: auth, body: { action: 'delete', userId: OTHER_ID } }, deps);
    expect(res).toEqual({ status: 200, body: { ok: true } });
    expect(deps.deleteUser).toHaveBeenCalledTimes(1);
    expect(deps.deleteUser).toHaveBeenCalledWith(OTHER_ID);
  });

  it('refuses to delete the last remaining bishopric account', async () => {
    deps.listBishopricIds.mockResolvedValue([OTHER_ID]);
    const res = await handleAdminUsers({ authHeader: auth, body: { action: 'delete', userId: OTHER_ID } }, deps);
    expect(res).toEqual({ status: 409, body: { error: 'last_bishopric' } });
    expect(deps.deleteUser).not.toHaveBeenCalled();
  });

  it('deletes a bishopric member while another one remains', async () => {
    deps.listBishopricIds.mockResolvedValue([BISHOP.id, OTHER_ID]);
    const res = await handleAdminUsers({ authHeader: auth, body: { action: 'delete', userId: OTHER_ID } }, deps);
    expect(res.status).toBe(200);
    expect(deps.deleteUser).toHaveBeenCalledWith(OTHER_ID);
  });

  it('answers 400 for an unknown user', async () => {
    const res = await handleAdminUsers(
      { authHeader: auth, body: { action: 'delete', userId: '44444444-4444-4444-8444-444444444444' } },
      deps,
    );
    expect(res.status).toBe(400);
    expect(deps.deleteUser).not.toHaveBeenCalled();
  });
});

describe('handleAdminUsers — what leaves the function', () => {
  it('never puts a password, an action link or a service key in any response', async () => {
    const deps = fakeDeps();
    const bodies: unknown[] = [];
    const run = async (authHeader: string | null, body: unknown) =>
      bodies.push((await handleAdminUsers({ authHeader, body }, deps)).body);
    await run(auth, createBody);
    await run(auth, { action: 'reset', userId: OTHER_ID });
    await run(auth, { action: 'delete', userId: OTHER_ID });
    await run(null, createBody);
    await run(auth, { action: 'create', email: 'x' });
    deps.generateLink.mockRejectedValue(
      Object.assign(new Error('action_link service_role password failure'), { code: 'unexpected_failure' }),
    );
    await run(auth, createBody);
    const text = JSON.stringify(bodies);
    for (const word of ['password', 'action_link', 'service_role']) expect(text).not.toContain(word);
  });

  it('logs failures without the error text, tokens or hashes', async () => {
    const deps = fakeDeps();
    deps.generateLink.mockRejectedValue(new Error(`boom ${HASH} bishop-token`));
    await handleAdminUsers({ authHeader: auth, body: createBody }, deps);
    const logged = JSON.stringify(deps.log.mock.calls);
    expect(deps.log).toHaveBeenCalled();
    expect(logged).not.toContain(HASH);
    expect(logged).not.toContain('bishop-token');
    expect(logged).not.toContain('boom');
  });
});
