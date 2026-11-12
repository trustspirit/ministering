import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from 'trust-ui-react';
import { ministryRepository } from '@/repositories/MinistryRepository';
import type { Organization } from '@/features/ministries/types';
import { nextMinistryNumber } from '@/features/ministries/domain/nextMinistryNumber';
import { T } from '@/shared/copy';
import { isPendingMinistry, PENDING_MINISTRY_PREFIX, type Board } from '../domain/board';
import { applyOps } from '../domain/applyOps';
import type { Op } from '../domain/resolveDrop';
import { executeOps } from './executeOps';
import { createSerialQueue } from './serialQueue';
import { assignmentBoardKey } from './useAssignmentBoard';

export interface BoardActions {
  /** Resolves (never rejects) after a handled failure: the board is restored, a toast shown and the board refetched. */
  perform(ops: Op[]): Promise<void>;
  renameMinistry(id: string, name: string | null): Promise<void>;
  deleteMinistry(id: string): Promise<void>;
  /** `null` switches the public link off. Resolves true when the change was saved (a failure toasts and resolves false). */
  setShareToken(id: string, token: string | null): Promise<boolean>;
  pending: boolean;
}

export function useBoardActions(org: Organization): BoardActions {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [pendingCount, setPendingCount] = useState(0);
  const seq = useRef(0);
  const queueRef = useRef<ReturnType<typeof createSerialQueue> | undefined>(undefined);
  queueRef.current ??= createSerialQueue();
  const queue = queueRef.current;
  // Stable across renders (only org/client/toast change them), so consumers can memoise on them.
  const operations = useMemo(() => {
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
          const tmpId = `${PENDING_MINISTRY_PREFIX}${Date.now()}-${seq.current++}`;
          const number = nextMinistryNumber(previous.ministries.map((m) => m.number));
          qc.setQueryData<Board>(key, applyOps(previous, ops, { id: tmpId, number }));
        }
        try {
          if (ops.some((op) => op.type !== 'createMinistry' && isPendingMinistry(op.ministryId))) {
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

    const setShareToken = (id: string, token: string | null): Promise<boolean> => {
      let saved = false;
      return enqueue(async () => {
        try {
          await ministryRepository.setShareToken(id, token);
          saved = true;
        } catch {
          toast({ variant: 'danger', message: T.saveFailed });
        }
        await refetch();
      }).then(() => saved);
    };

    return { perform, renameMinistry, deleteMinistry, setShareToken };
  }, [qc, toast, org, queue]);

  const pending = pendingCount > 0;
  return useMemo(() => ({ ...operations, pending }), [operations, pending]);
}
