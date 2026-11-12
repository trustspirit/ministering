import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from 'trust-ui-react';
import { ministryRepository } from '@/repositories/MinistryRepository';
import type { Organization } from '@/features/ministries/types';
import { T } from '@/shared/copy';
import type { Board } from '../domain/board';
import { applyOps } from '../domain/applyOps';
import type { Op } from '../domain/resolveDrop';
import { executeOps } from './executeOps';
import { assignmentBoardKey } from './useAssignmentBoard';

export function useBoardActions(org: Organization) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [pendingCount, setPendingCount] = useState(0);
  const seq = useRef(0);
  const key = assignmentBoardKey(org);

  const track = async <R,>(fn: () => Promise<R>): Promise<R> => {
    setPendingCount((n) => n + 1);
    try {
      return await fn();
    } finally {
      setPendingCount((n) => n - 1);
    }
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const perform = async (ops: Op[]): Promise<void> => {
    if (ops.length === 0) return;
    await track(async () => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Board>(key);
      if (previous) {
        const nextNumber =
          previous.ministries.reduce((max, m) => Math.max(max, m.number), 0) + 1;
        const tmpId = `tmp-${Date.now()}-${seq.current++}`;
        qc.setQueryData<Board>(key, applyOps(previous, ops, { id: tmpId, number: nextNumber }));
      }
      try {
        await executeOps(ops, org, ministryRepository);
      } catch {
        qc.setQueryData(key, previous);
        toast({ variant: 'danger', message: T.saveFailed });
      } finally {
        await invalidate();
      }
    });
  };

  const renameMinistry = (id: string, name: string | null): Promise<void> =>
    track(async () => {
      const trimmed = name?.trim();
      try {
        await ministryRepository.update(id, { name: trimmed ? trimmed : null });
      } catch {
        toast({ variant: 'danger', message: T.saveFailed });
      } finally {
        await invalidate();
      }
    });

  const deleteMinistry = (id: string): Promise<void> =>
    track(async () => {
      try {
        await ministryRepository.remove(id);
      } catch {
        toast({ variant: 'danger', message: T.saveFailed });
      } finally {
        await invalidate();
      }
    });

  return { perform, renameMinistry, deleteMinistry, pending: pendingCount > 0 };
}
