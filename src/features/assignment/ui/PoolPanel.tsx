import { useMemo, useState, type DragEvent } from 'react';
import clsx from 'clsx';
import { EmptyState, TextField } from 'trust-ui-react';
import type { Household } from '@/features/households/types';
import { T } from '@/shared/copy';
import {
  ministryOf,
  pooledIds,
  unassignedCandidates,
  unassignedRecipients,
  type AssignRole,
} from '../domain/board';
import { dragOf, overKey, useDragStore, useDropHandler } from '../dnd';
import { useWorkspaceStore } from '../store';
import { useWorkspace } from '../workspaceContext';
import { HouseholdCard } from './HouseholdCard';
import { PersonCard } from './PersonCard';
import { PoolAddDialog } from './PoolAddDialog';

const byName = (a: string, b: string) => a.localeCompare(b, 'ko');

function CountPill({ n }: { n: number }) {
  return <span className={n > 0 ? 'aw-wn' : undefined}>{n}</span>;
}

export function PoolPanel({ households }: { households: Household[] }) {
  const { org, board, canEdit, members, familyOf, actions } = useWorkspace();
  const [adding, setAdding] = useState<AssignRole | null>(null);
  const search = useWorkspaceStore((s) => s.search);
  const setSearch = useWorkspaceStore((s) => s.setSearch);
  const over = useDragStore((s) => s.over === overKey.pool);
  const setOver = useDragStore((s) => s.setOver);
  const handleDrop = useDropHandler(org);

  const candidates = useMemo(
    () => [...unassignedCandidates(board, members)].sort((a, b) => byName(a.full_name, b.full_name)),
    [board, members],
  );
  const recipients = useMemo(
    () =>
      [...unassignedRecipients(board, members, households)].sort((a, b) =>
        byName('full_name' in a ? a.full_name : a.name, 'full_name' in b ? b.full_name : b.name),
      ),
    [board, members, households],
  );

  const q = search.trim();
  const match = (text: string) => !q || text.includes(q);
  const shownCandidates = candidates.filter((m) => match(m.full_name));
  const shownRecipients = recipients.filter((r) =>
    'full_name' in r
      ? match(r.full_name)
      : match(r.name) || (familyOf.get(r.id) ?? []).some((m) => match(m.full_name)),
  );

  /** Only cards that are currently assigned on this board can be dropped back to unassign them. */
  const isAssigned = (e: DragEvent) => {
    const item = dragOf(e);
    if (!item) return false;
    const roles: AssignRole[] =
      org === 'EQ'
        ? [item.kind === 'member' ? 'companion' : 'recipient']
        : item.from
          ? [item.from]
          : ['companion', 'recipient'];
    return roles.some((role) => ministryOf(board, item.id, role));
  };

  const companionNoun = T.assign.companionNoun[org];
  const recipientNoun = T.assign.recipientNoun[org];
  const emptyText = (role: AssignRole) =>
    q
      ? T.assign.searchNone
      : pooledIds(board, role).size === 0
        ? canEdit
          ? T.pool.empty
          : T.pool.emptyViewer
        : role === 'companion'
          ? T.assign.poolEmptyCandidates[org]
          : T.assign.poolEmptyRecipients[org];
  const addButton = (role: AssignRole, noun: string) =>
    canEdit && (
      <button
        type="button"
        className="aw-ph-add"
        aria-label={T.pool.addTitle[role](noun)}
        onClick={() => setAdding(role)}
      >
        + {T.pool.add}
      </button>
    );

  return (
    <aside
      className={clsx('aw-pool', over && 'aw-pool--over')}
      aria-label={T.assign.poolLabel}
      onDragOver={
        canEdit
          ? (e) => {
              if (!isAssigned(e)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setOver(overKey.pool);
            }
          : undefined
      }
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null);
      }}
      onDrop={
        canEdit
          ? (e) => {
              e.preventDefault();
              handleDrop(e, { type: 'pool' });
            }
          : undefined
      }
    >
      <div className="aw-search">
        <TextField
          type="search"
          size="sm"
          shape="square"
          fullWidth
          placeholder={T.assign.search}
          aria-label={T.assign.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <section className="aw-plist aw-plist--cand">
        <h4 className="aw-ph">
          <span>{T.assign.warnUnassignedCandidates(companionNoun)}</span>
          <CountPill n={candidates.length} />
          {addButton('companion', companionNoun)}
        </h4>
        {shownCandidates.length === 0 && (
          <EmptyState className="app-empty" headingLevel={4} title={emptyText('companion')} />
        )}
        {shownCandidates.map((m) => (
          <PersonCard
            key={m.id}
            member={m}
            role="companion"
            onRemove={() => void actions.removeFromPool('companion', m.id)}
            removeLabel={T.pool.remove(m.full_name)}
          />
        ))}
      </section>
      <section className="aw-plist aw-plist--tgt">
        <h4 className="aw-ph">
          <span>{T.assign.warnUnassignedRecipients(recipientNoun)}</span>
          <CountPill n={recipients.length} />
          {addButton('recipient', recipientNoun)}
        </h4>
        {shownRecipients.length === 0 && (
          <EmptyState className="app-empty" headingLevel={4} title={emptyText('recipient')} />
        )}
        {shownRecipients.map((r) =>
          'full_name' in r ? (
            <PersonCard
              key={r.id}
              member={r}
              role="recipient"
              onRemove={() => void actions.removeFromPool('recipient', r.id)}
              removeLabel={T.pool.remove(r.full_name)}
            />
          ) : (
            <HouseholdCard
              key={r.id}
              household={r}
              members={familyOf.get(r.id) ?? []}
              onRemove={() => void actions.removeFromPool('recipient', r.id)}
              removeLabel={T.pool.remove(r.name)}
            />
          ),
        )}
      </section>
      <PoolAddDialog role={adding} households={households} onClose={() => setAdding(null)} />
    </aside>
  );
}
