import type { Board, BoardMinistry } from './board';
import { NEW_MINISTRY, type Op } from './resolveDrop';

export function applyOps(board: Board, ops: Op[], newMinistry: { id: string; number: number }): Board {
  let ministries: BoardMinistry[] = board.ministries;
  let created = false;
  const resolve = (id: string) => (id === NEW_MINISTRY && created ? newMinistry.id : id);

  for (const op of ops) {
    if (op.type === 'createMinistry') {
      created = true;
      ministries = [
        ...ministries,
        {
          id: newMinistry.id,
          number: newMinistry.number,
          name: null,
          companionIds: [],
          recipientIds: [],
        },
      ];
      continue;
    }
    const ministryId = resolve(op.ministryId);
    const key = op.role === 'companion' ? 'companionIds' : 'recipientIds';
    ministries = ministries.map((m) => {
      if (m.id !== ministryId) return m;
      if (op.type === 'remove') return { ...m, [key]: m[key].filter((id) => id !== op.targetId) };
      return m[key].includes(op.targetId) ? m : { ...m, [key]: [...m[key], op.targetId] };
    });
  }
  return { ...board, ministries };
}
