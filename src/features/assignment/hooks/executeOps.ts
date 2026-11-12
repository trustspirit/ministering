import type { MinistryRepository } from '@/repositories/MinistryRepository';
import type { Organization } from '@/features/ministries/types';
import { nextMinistryNumber } from '@/features/ministries/domain/nextMinistryNumber';
import { NEW_MINISTRY, type Op } from '../domain/resolveDrop';

const MAX_CREATE_ATTEMPTS = 3;

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === '23505';
}

async function createMinistry(org: Organization, repo: MinistryRepository): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const numbers = await repo.getExistingNumbers(org);
      const ministry = await repo.create({
        organization: org,
        number: nextMinistryNumber(numbers),
      });
      return ministry.id;
    } catch (err) {
      if (!isUniqueViolation(err) || attempt >= MAX_CREATE_ATTEMPTS) throw err;
    }
  }
}

/** Executes ops in order; throws on the first failure (later ops are not run). */
export async function executeOps(
  ops: Op[],
  org: Organization,
  repo: MinistryRepository,
): Promise<void> {
  let newId: string | null = null;
  const resolve = (id: string): string => {
    if (id !== NEW_MINISTRY) return id;
    if (!newId) throw new Error('Op references a new ministry that was not created');
    return newId;
  };

  for (const op of ops) {
    if (op.type === 'createMinistry') {
      newId = await createMinistry(org, repo);
      continue;
    }
    const ministryId = resolve(op.ministryId);
    if (op.role === 'companion') {
      await (op.type === 'add' ? repo.addCompanion : repo.removeCompanion).call(
        repo,
        ministryId,
        op.targetId,
      );
    } else if (org === 'EQ') {
      await (op.type === 'add' ? repo.addHouseholdRecipient : repo.removeHouseholdRecipient).call(
        repo,
        ministryId,
        op.targetId,
      );
    } else {
      await (op.type === 'add' ? repo.addMemberRecipient : repo.removeMemberRecipient).call(
        repo,
        ministryId,
        op.targetId,
      );
    }
  }
}
