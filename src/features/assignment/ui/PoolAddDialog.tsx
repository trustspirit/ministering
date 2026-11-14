import { useMemo, useState } from 'react';
import { Button, Dialog, TextField } from 'trust-ui-react';
import type { Household } from '@/features/households/types';
import { computeAge } from '@/features/members/domain/computeAge';
import type { Member } from '@/features/members/types';
import { GENDER_LABEL, T } from '@/shared/copy';
import { poolAddable, type AssignRole } from '../domain/board';
import { useWorkspace } from '../workspaceContext';

const MAX_SHOWN = 30;
const P = T.pool;
const squash = (s: string) => s.replace(/\s+/g, '');

/** Adds people (or, for EQ recipients, households) that are not on the board yet to the pool for one role. */
export function PoolAddDialog({
  role,
  households,
  onClose,
}: {
  /** null = closed */
  role: AssignRole | null;
  households: Household[];
  onClose: () => void;
}) {
  const { org, board, members, familyOf, actions } = useWorkspace();
  const [query, setQuery] = useState('');

  const noun = role === 'recipient' ? T.assign.recipientNoun[org] : T.assign.companionNoun[org];
  const all = useMemo(
    () => (role ? poolAddable(board, role, members, households) : []),
    [board, role, members, households],
  );
  const shown = useMemo(() => {
    const q = squash(query);
    const text = (r: Member | Household) =>
      'full_name' in r
        ? r.full_name
        : [r.name, r.address ?? '', ...(familyOf.get(r.id) ?? []).map((m) => m.full_name)].join(' ');
    const nameOf = (r: Member | Household) => ('full_name' in r ? r.full_name : r.name);
    return all
      .filter((r) => !q || squash(text(r)).includes(q))
      .sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'ko'));
  }, [all, query, familyOf]);

  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Dialog open={role !== null} onClose={close} size="sm">
      <Dialog.Title onClose={close}>{role ? P.addTitle[role](noun) : ''}</Dialog.Title>
      <Dialog.Content>
        <div className="aw-pd">
          <p className="aw-pd-note">{P.addNote}</p>
          <div className="aw-search aw-pd-search">
            <TextField
              type="search"
              size="sm"
              shape="square"
              fullWidth
              placeholder={P.searchPlaceholder}
              aria-label={P.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {shown.length === 0 ? (
            <p className="aw-pd-empty">{P.none}</p>
          ) : (
            <ul className="aw-pd-list">
              {shown.slice(0, MAX_SHOWN).map((r) => {
                const name = 'full_name' in r ? r.full_name : r.name;
                const meta =
                  'full_name' in r
                    ? `${computeAge(r.birth_date)}·${GENDER_LABEL[r.gender]}`
                    : (r.address ?? '');
                return (
                  <li key={r.id}>
                    <span>{name}</span>
                    <small>{meta}</small>
                    <button
                      type="button"
                      className="aw-pd-act"
                      aria-label={P.addOne(name)}
                      onClick={() => role && void actions.addToPool(role, r.id)}
                    >
                      {P.add}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {shown.length > MAX_SHOWN && <p className="aw-pd-empty">{P.more(shown.length - MAX_SHOWN)}</p>}
        </div>
      </Dialog.Content>
      <Dialog.Actions>
        <Button variant="ghost" size="sm" onClick={close}>
          {P.close}
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}
