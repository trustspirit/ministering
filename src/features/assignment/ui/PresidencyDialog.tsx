import { useMemo, useState } from 'react';
import { Button, Dialog, TextField } from 'trust-ui-react';
import { T } from '@/shared/copy';
import { supervisionCounts } from '../domain/board';
import { isOrgMember } from '../domain/orgMembership';
import { useWorkspace } from '../workspaceContext';

const MAX_CANDIDATES = 30;

/** Adds and removes the organization's presidency members. Candidates are the organization's adult members. */
export function PresidencyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { org, board, members, memberById, actions } = useWorkspace();
  const [query, setQuery] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

  const counts = useMemo(() => supervisionCounts(board), [board]);
  const current = useMemo(
    () =>
      board.presidencyIds
        .map((id) => memberById.get(id))
        .filter((m) => m !== undefined)
        .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ko')),
    [board.presidencyIds, memberById],
  );
  const candidates = useMemo(() => {
    const inPresidency = new Set(board.presidencyIds);
    const q = query.trim().replace(/\s+/g, '');
    return members
      .filter((m) => !inPresidency.has(m.id) && isOrgMember(m, org))
      .filter((m) => !q || m.full_name.replace(/\s+/g, '').includes(q))
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'ko'))
      .slice(0, MAX_CANDIDATES);
  }, [members, board.presidencyIds, org, query]);

  const close = () => {
    setConfirming(null);
    setQuery('');
    onClose();
  };

  const remove = (id: string) => {
    if ((counts.get(id) ?? 0) > 0 && confirming !== id) {
      setConfirming(id);
      return;
    }
    setConfirming(null);
    void actions.removePresident(id);
  };

  const confirmingMember = confirming ? memberById.get(confirming) : undefined;

  return (
    <Dialog open={open} onClose={close} size="sm">
      <Dialog.Title onClose={close}>{T.presidency.dialogTitle[org]}</Dialog.Title>
      <Dialog.Content>
        <div className="aw-pd">
          <h4 className="aw-pd-h">{T.presidency.current}</h4>
          {current.length === 0 ? (
            <p className="aw-pd-empty">{T.presidency.empty}</p>
          ) : (
            <ul className="aw-pd-list">
              {current.map((m) => (
                <li key={m.id}>
                  <span>{m.full_name}</span>
                  <small>{counts.get(m.id) ?? 0}</small>
                  <button
                    type="button"
                    className="aw-pd-act aw-pd-act--rm"
                    aria-label={T.presidency.remove(m.full_name)}
                    onClick={() => remove(m.id)}
                  >
                    {T.presidency.remove('').trim()}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {confirmingMember && (
            <div className="aw-pd-confirm" role="alert">
              <p>{T.presidency.removeConfirm(confirmingMember.full_name, counts.get(confirmingMember.id) ?? 0)}</p>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                {T.presidency.cancel}
              </Button>
              <Button size="sm" variant="danger" onClick={() => remove(confirmingMember.id)}>
                {T.presidency.confirmRemove}
              </Button>
            </div>
          )}

          <h4 className="aw-pd-h">{T.presidency.candidates}</h4>
          <div className="aw-search aw-pd-search">
            <TextField
              type="search"
              size="sm"
              shape="square"
              fullWidth
              placeholder={T.presidency.searchPlaceholder}
              aria-label={T.presidency.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {candidates.length === 0 ? (
            <p className="aw-pd-empty">{T.presidency.noCandidates}</p>
          ) : (
            <ul className="aw-pd-list">
              {candidates.map((m) => (
                <li key={m.id}>
                  <span>{m.full_name}</span>
                  <button
                    type="button"
                    className="aw-pd-act"
                    aria-label={T.presidency.add(m.full_name)}
                    onClick={() => void actions.addPresident(m.id)}
                  >
                    {T.presidency.add('').trim()}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Dialog.Content>
      <Dialog.Actions>
        <Button variant="ghost" size="sm" onClick={close}>
          {T.presidency.close}
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}
