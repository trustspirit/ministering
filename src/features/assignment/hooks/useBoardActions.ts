import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from 'trust-ui-react';
import { ministryRepository } from '@/repositories/MinistryRepository';
import type { Organization } from '@/features/ministries/types';
import { nextMinistryNumber } from '@/features/ministries/domain/nextMinistryNumber';
import { T } from '@/shared/copy';
import type { Board } from '../domain/board';
import { applyOps } from '../domain/applyOps';
import type { Op } from '../domain/resolveDrop';
import { executeOps } from './executeOps';
import { createSerialQueue } from './serialQueue';
import { assignmentBoardKey } from './useAssignmentBoard';

const TMP_PREFIX = 'tmp-';

export interface BoardActions {
  /** Resolves (never rejects) after a handled failure: the board is restored, a toast shown and the board refetched. */
  perform(ops: Op[]): Promise<void>;
  renameMinistry(id: string, name: string | null): Promise<void>;
  deleteMinistry(id: string): Promise<void>;
  pending: boolean;
}

export function useBoardActions(org: Organization): BoardActions {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [pendingCount, setPendingCount] = useState(0);
  const seq = useRef(0);
  const queueRef = useRef<ReturnType<typeof createSerialQueue>>();
  queueRef.current ??= createSerialQueue();
  const queue = queueRef.current;
  const key = assignmentBoardKey(org);

  const enqueue = (job: () => Promise<void>): Promise<void> => {
    setPendingCount((n) => n + 1);
    return queue(job).finally(() => setPendingCount((n) => n - 1));
  };

  // Awaits the refetch so the cache has converged to server truth before the next job runs.
  const refetch = () => qc.invalidateQueries({ queryKey: key });

  const perform = (ops: Op[]): Promise<void> => {
    if (ops.length === 0) return Promise.resolve();
    return enqueue(async () => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Board>(key);
      if (previous) {
        const tmpId = `${TMP_PREFIX}${Date.now()}-${seq.current++}`;
        const number = nextMinistryNumber(previous.ministries.map((m) => m.number));
        qc.setQueryData<Board>(key, applyOps(previous, ops, { id: tmpId, number }));
      }
      try {
        if (ops.some((op) => op.type !== 'createMinistry' && op.ministryId.startsWith(TMP_PREFIX))) {
          throw new Error('Op references an unsaved ministry');
        }
        await executeOps(ops, org, ministryRepository);
      } catch {
        qc.setQueryData(key, previous);
        toast({ variant: 'danger', message: T.saveFailed });
      }
      await refetch();
    });
  };

  const simple = (run: () => Promise<unknown>): Promise<void> =>
    enqueue(async () => {
      try {
        await run();
      } catch {
        toast({ variant: 'danger', message: T.saveFailed });
      }
      await refetch();
    });

  const renameMinistry = (id: string, name: string | null) => {
    const trimmed = name?.trim();
    return simple(() => ministryRepository.update(id, { name: trimmed ? trimmed : null }));
  };

  const deleteMinistry = (id: string) => simple(() => ministryRepository.remove(id));

  return { perform, renameMinistry, deleteMinistry, pending: pendingCount > 0 };
}
