import { describe, expect, it } from 'vitest';
import type { MinistryRepository } from '@/repositories/MinistryRepository';
import type { Ministry } from '@/features/ministries/types';
import { NEW_MINISTRY } from '../domain/resolveDrop';
import { executeOps } from './executeOps';

type Call = [string, ...unknown[]];

function fakeRepo(opts: {
  numbers?: number[][];
  failOn?: Record<string, unknown>;
  createFailures?: unknown[];
} = {}) {
  const calls: Call[] = [];
  let numbersCall = 0;
  const createFailures = [...(opts.createFailures ?? [])];
  const rec =
    (name: string) =>
    async (...args: unknown[]) => {
      calls.push([name, ...args]);
      if (opts.failOn && name in opts.failOn) throw opts.failOn[name];
    };
  const repo = {
    getExistingNumbers: async (org: string) => {
      calls.push(['getExistingNumbers', org]);
      const list = opts.numbers ?? [[1, 2]];
      return list[Math.min(numbersCall++, list.length - 1)];
    },
    create: async (input: unknown) => {
      calls.push(['create', input]);
      if (createFailures.length) throw createFailures.shift();
      return { id: 'new-id' } as Ministry;
    },
    addCompanion: rec('addCompanion'),
    removeCompanion: rec('removeCompanion'),
    addMemberRecipient: rec('addMemberRecipient'),
    removeMemberRecipient: rec('removeMemberRecipient'),
    addHouseholdRecipient: rec('addHouseholdRecipient'),
    removeHouseholdRecipient: rec('removeHouseholdRecipient'),
  } as unknown as MinistryRepository;
  return { repo, calls };
}

describe('executeOps', () => {
  it('runs remove then add in order', async () => {
    const { repo, calls } = fakeRepo();
    await executeOps(
      [
        { type: 'remove', role: 'companion', ministryId: 'A', targetId: 'x' },
        { type: 'add', role: 'companion', ministryId: 'B', targetId: 'x' },
      ],
      'EQ',
      repo,
    );
    expect(calls).toEqual([
      ['removeCompanion', 'A', 'x'],
      ['addCompanion', 'B', 'x'],
    ]);
  });

  it('creates a ministry with the next number and uses its id for NEW recipients', async () => {
    const { repo, calls } = fakeRepo({ numbers: [[1, 2]] });
    await executeOps(
      [
        { type: 'createMinistry' },
        { type: 'add', role: 'recipient', ministryId: NEW_MINISTRY, targetId: 'h' },
      ],
      'EQ',
      repo,
    );
    expect(calls).toEqual([
      ['getExistingNumbers', 'EQ'],
      ['create', { organization: 'EQ', number: 3 }],
      ['addHouseholdRecipient', 'new-id', 'h'],
    ]);
  });

  it('adds RS recipients as member recipients', async () => {
    const { repo, calls } = fakeRepo();
    await executeOps(
      [{ type: 'add', role: 'recipient', ministryId: 'M', targetId: 'm1' }],
      'RS',
      repo,
    );
    expect(calls).toEqual([['addMemberRecipient', 'M', 'm1']]);
  });

  it('rejects on unique violation and skips later ops', async () => {
    const err = { code: '23505' };
    const { repo, calls } = fakeRepo({ failOn: { addCompanion: err } });
    await expect(
      executeOps(
        [
          { type: 'add', role: 'companion', ministryId: 'A', targetId: 'x' },
          { type: 'add', role: 'companion', ministryId: 'A', targetId: 'y' },
        ],
        'EQ',
        repo,
      ),
    ).rejects.toBe(err);
    expect(calls).toEqual([['addCompanion', 'A', 'x']]);
  });

  it('retries create after a unique violation, recomputing the number', async () => {
    const { repo, calls } = fakeRepo({
      numbers: [[1, 2], [1, 2, 3]],
      createFailures: [{ code: '23505' }],
    });
    await executeOps([{ type: 'createMinistry' }], 'EQ', repo);
    expect(calls).toEqual([
      ['getExistingNumbers', 'EQ'],
      ['create', { organization: 'EQ', number: 3 }],
      ['getExistingNumbers', 'EQ'],
      ['create', { organization: 'EQ', number: 4 }],
    ]);
  });
  it('rejects when create keeps failing with a unique violation for 3 attempts', async () => {
    const err = { code: '23505' };
    const { repo, calls } = fakeRepo({ createFailures: [err, err, err, err] });
    await expect(executeOps([{ type: 'createMinistry' }], 'EQ', repo)).rejects.toBe(err);
    expect(calls.filter((c) => c[0] === 'create')).toHaveLength(3);
  });

  it('does not retry create on a non-unique error', async () => {
    const err = new Error('network');
    const { repo, calls } = fakeRepo({ createFailures: [err] });
    await expect(executeOps([{ type: 'createMinistry' }], 'EQ', repo)).rejects.toBe(err);
    expect(calls.filter((c) => c[0] === 'create')).toHaveLength(1);
  });

  it('throws without calling the repo when NEW_MINISTRY has no preceding create', async () => {
    const { repo, calls } = fakeRepo();
    await expect(
      executeOps(
        [{ type: 'add', role: 'recipient', ministryId: NEW_MINISTRY, targetId: 'h' }],
        'EQ',
        repo,
      ),
    ).rejects.toThrow();
    expect(calls).toEqual([]);
  });

  it('removes EQ recipients as household recipients', async () => {
    const { repo, calls } = fakeRepo();
    await executeOps(
      [{ type: 'remove', role: 'recipient', ministryId: 'M', targetId: 'h' }],
      'EQ',
      repo,
    );
    expect(calls).toEqual([['removeHouseholdRecipient', 'M', 'h']]);
  });

  it('removes RS recipients as member recipients', async () => {
    const { repo, calls } = fakeRepo();
    await executeOps(
      [{ type: 'remove', role: 'recipient', ministryId: 'M', targetId: 'm1' }],
      'RS',
      repo,
    );
    expect(calls).toEqual([['removeMemberRecipient', 'M', 'm1']]);
  });
});
