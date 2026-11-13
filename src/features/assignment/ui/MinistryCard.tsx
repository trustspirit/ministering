import { useMemo, useRef, useState, type DragEvent } from 'react';
import clsx from 'clsx';
import { Button, Dialog, Menu } from 'trust-ui-react';
import type { Organization } from '@/features/ministries/types';
import { T } from '@/shared/copy';
import {
  isPendingMinistry,
  ministryLabel,
  ministryWarnings,
  type AssignRole,
  type BoardMinistry,
} from '../domain/board';
import { dragOf, overKey, useDragStore, useDropHandler } from '../dnd';
import { useWorkspaceStore } from '../store';
import { useWorkspace, WorkspaceContext } from '../workspaceContext';
import { HouseholdCard } from './HouseholdCard';
import { onActivateKey } from './keyboard';
import { PersonCard } from './PersonCard';
import { ShareDialog } from '@/features/share/ui/ShareDialog';

function Warning({ text, soft }: { text: string; soft?: boolean }) {
  return (
    <div className={clsx('aw-gw', soft && 'aw-gw--soft')} role="status">
      <span aria-hidden="true">{T.warnMark} </span>
      <span>{text}</span>
    </div>
  );
}

export function MinistryCard({
  ministry,
  org,
  canEdit,
}: {
  ministry: BoardMinistry;
  org: Organization;
  canEdit: boolean;
}) {
  const workspace = useWorkspace();
  const { memberById, householdById, familyOf, actions } = workspace;
  // An optimistic card (not yet saved) is shown but takes no drops or edits until the refetch replaces it.
  const pending = isPendingMinistry(ministry.id);
  const editable = canEdit && !pending;
  const innerWorkspace = useMemo(
    () => (pending ? { ...workspace, canEdit: false } : workspace),
    [pending, workspace],
  );
  const hot = useWorkspaceStore((s) => s.hotMinistryId === ministry.id);
  const setHot = useWorkspaceStore((s) => s.setHotMinistryId);
  const toggleHot = useWorkspaceStore((s) => s.toggleHotMinistry);
  const over = useDragStore((s) => s.over);
  const setOver = useDragStore((s) => s.setOver);
  const handleDrop = useDropHandler(org);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sharing, setSharing] = useState(false);
  const editDone = useRef(false);

  const label = ministryLabel(ministry);
  const warnings = ministryWarnings(ministry);
  const companionNoun = T.assign.companionNoun[org];
  const recipientNoun = T.assign.recipientNoun[org];

  /** EQ: the item's kind decides the zone, wherever it is dropped. RS: the zone under the pointer. */
  const zoneAt = (e: DragEvent): AssignRole | null => {
    const item = dragOf(e);
    if (!item) return null;
    if (org === 'EQ') return item.kind === 'member' ? 'companion' : 'recipient';
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-zone]');
    return (el?.dataset.zone as AssignRole | undefined) ?? null;
  };

  const remove = (role: AssignRole, targetId: string) =>
    void actions.perform([{ type: 'remove', role, ministryId: ministry.id, targetId }]);

  const finishRename = (value: string | null) => {
    if (editDone.current) return;
    editDone.current = true;
    setEditing(false);
    if (value === null) return;
    const name = value.trim() || null;
    if (name !== ministry.name) void actions.renameMinistry(ministry.id, name);
  };

  const zoneClass = (zone: AssignRole) =>
    clsx('aw-zone', over === overKey.zone(ministry.id, zone) && 'aw-zone--over');

  return (
    <>
      <section
        className={clsx(
          'aw-mcard',
          warnings.tooFewCompanions && 'aw-mcard--bad',
          hot && 'aw-mcard--hot',
          pending && 'aw-mcard--pending',
        )}
        aria-label={label}
        aria-busy={pending || undefined}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.aw-chip')) setHot(ministry.id);
          else toggleHot(ministry.id);
        }}
        onDragOver={
          editable
            ? (e) => {
                if (!dragOf(e)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                const zone = zoneAt(e);
                setOver(zone ? overKey.zone(ministry.id, zone) : null);
              }
            : undefined
        }
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null);
        }}
        onDrop={
          editable
            ? (e) => {
                e.preventDefault();
                handleDrop(e, { type: 'ministry', ministryId: ministry.id, zone: zoneAt(e) });
              }
            : undefined
        }
      >
        <h3>
          {editing ? (
            <input
              className="aw-rename"
              aria-label={T.assign.renameLabel}
              defaultValue={ministry.name ?? ''}
              placeholder={T.ministry.defaultLabel(ministry.number)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') finishRename(e.currentTarget.value);
                if (e.key === 'Escape') finishRename(null);
              }}
              onBlur={(e) => finishRename(e.currentTarget.value)}
            />
          ) : (
            <span
              className="aw-mtitle"
              role="button"
              tabIndex={0}
              aria-pressed={hot}
              onKeyDown={onActivateKey(() => toggleHot(ministry.id))}
            >
              {label}
            </span>
          )}
          {editable && !editing && (
            <span className="aw-mtools" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="aw-shr"
                title={T.assign.shareTitle}
                onClick={() => setSharing(true)}
              >
                {T.assign.share}
              </button>
              <Menu>
                <Menu.Trigger>
                  <button type="button" className="aw-menu" aria-label={T.assign.menu} title={T.assign.menu}>
                    ⋯
                  </button>
                </Menu.Trigger>
                <Menu.Content align="end">
                  <Menu.Item
                    onClick={() => {
                      editDone.current = false;
                      setEditing(true);
                    }}
                  >
                    {T.assign.rename}
                  </Menu.Item>
                  <Menu.Item danger onClick={() => setConfirmDelete(true)}>
                    {T.assign.delete}
                  </Menu.Item>
                </Menu.Content>
              </Menu>
            </span>
          )}
        </h3>
        {warnings.tooFewCompanions && <Warning text={T.assign.warnTooFewCompanions} />}
        {warnings.noRecipients && <Warning text={T.assign.warnNoRecipients[org]} soft />}

        <WorkspaceContext.Provider value={innerWorkspace}>
          <div className={zoneClass('companion')} data-zone="companion">
            <p className="aw-lab">{T.assign.zoneCompanions(companionNoun)}</p>
            {ministry.companionIds.length === 0 ? (
              <div className="aw-drop-hint">{T.assign.emptyCompanions(companionNoun)}</div>
            ) : (
              ministry.companionIds.map((id) => {
                const m = memberById.get(id);
                return m ? (
                  <PersonCard key={id} member={m} role="companion" onRemove={() => remove('companion', id)} />
                ) : null;
              })
            )}
          </div>

          <div className={zoneClass('recipient')} data-zone="recipient">
            <p className="aw-lab">{T.assign.zoneRecipients(recipientNoun)}</p>
            {ministry.recipientIds.length === 0 ? (
              <div className="aw-drop-hint">{T.assign.emptyRecipients[org]}</div>
            ) : (
              ministry.recipientIds.map((id) => {
                if (org === 'EQ') {
                  const h = householdById.get(id);
                  return h ? (
                    <HouseholdCard
                      key={id}
                      household={h}
                      members={familyOf.get(id) ?? []}
                      onRemove={() => remove('recipient', id)}
                    />
                  ) : null;
                }
                const m = memberById.get(id);
                return m ? (
                  <PersonCard key={id} member={m} role="recipient" onRemove={() => remove('recipient', id)} />
                ) : null;
              })
            )}
          </div>
        </WorkspaceContext.Provider>
      </section>

      {editable && <ShareDialog ministry={ministry} open={sharing} onClose={() => setSharing(false)} />}

      {canEdit && (
        <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} size="sm">
          <Dialog.Title onClose={() => setConfirmDelete(false)}>{T.assign.delete}</Dialog.Title>
          <Dialog.Content>
            <p className="aw-dialog-text">{T.assign.deleteConfirm(label)}</p>
          </Dialog.Content>
          <Dialog.Actions>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              {T.assign.cancel}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setConfirmDelete(false);
                if (hot) setHot(null);
                void actions.deleteMinistry(ministry.id);
              }}
            >
              {T.assign.confirmDelete}
            </Button>
          </Dialog.Actions>
        </Dialog>
      )}
    </>
  );
}
