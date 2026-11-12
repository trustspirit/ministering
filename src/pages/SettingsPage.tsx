import { useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Button, Dialog, EmptyState, Select, Spinner, TextField, useToast } from 'trust-ui-react';
import { useAuth } from '@/features/auth/useAuth';
import { adminErrorMessage } from '@/features/settings/adminErrorMessage';
import { useAdminUsers } from '@/features/settings/hooks/useAdminUsers';
import { useAppUsers, type AppUser } from '@/features/settings/hooks/useAppUsers';
import {
  isLastBishopricError,
  useUpdateDisplayName,
  useUpdateProfileRole,
} from '@/features/settings/hooks/useProfileMutations';
import { AddUserDialog } from '@/features/settings/ui/AddUserDialog';
import { UserLinkDialog } from '@/features/settings/ui/UserLinkDialog';
import { usePermission } from '@/shared/auth/usePermission';
import { T } from '@/shared/copy';
import '@/shared/ui/subbar.css';
import type { Database } from '@/types/database.types';
import './SettingsPage.css';

type Role = Database['public']['Enums']['user_role'];

const S = T.settings;
const ROLE_OPTIONS = (Object.keys(T.role) as Role[]).map((value) => ({ value, label: T.role[value] }));
// The only bishopric cannot be given another role (the database refuses it too).
const LAST_BISHOPRIC_OPTIONS = ROLE_OPTIONS.map((o) => ({ ...o, disabled: o.value !== 'bishopric' }));

export default function SettingsPage() {
  const perm = usePermission();
  const { user, profileLoaded } = useAuth();
  const { toast } = useToast();
  const usersQuery = useAppUsers();
  const updateRole = useUpdateProfileRole();
  const updateName = useUpdateDisplayName();
  const { deleteUser } = useAdminUsers();

  const [pendingRole, setPendingRole] = useState<{ user: AppUser; role: Role } | null>(null);
  const [editing, setEditing] = useState<{ userId: string; draft: string } | null>(null);
  // Each opening mounts a fresh dialog (empty form, no link from the previous time). The key changes only on
  // opening, so a closing dialog stays mounted and the native <dialog> can hand focus back to its opener.
  const [addOpen, setAddOpen] = useState(false);
  const [linkFor, setLinkFor] = useState<AppUser | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const openAdd = () => {
    setDialogKey((k) => k + 1);
    setAddOpen(true);
  };
  const openLink = (u: AppUser) => {
    setDialogKey((k) => k + 1);
    setLinkFor(u);
  };
  const [pendingDelete, setPendingDelete] = useState<AppUser | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  // After a reload the profile arrives a moment after the session; deciding earlier would send a bishopric home.
  if (!profileLoaded) {
    return (
      <div className="app-loading">
        <Spinner size="sm" label={T.loading} showLabel />
      </div>
    );
  }
  if (!perm.canManageUsers) return <Navigate to="/" replace />;

  const users = usersQuery.data;
  const bishopricCount = users?.filter((u) => u.role === 'bishopric').length ?? 0;

  const confirmRole = async () => {
    if (!pendingRole) return;
    const { user: target, role } = pendingRole;
    setPendingRole(null);
    try {
      await updateRole.mutateAsync({ userId: target.user_id, role });
      toast({ variant: 'success', message: S.roleSaved });
    } catch (err) {
      toast({ variant: 'danger', message: isLastBishopricError(err) ? S.lastBishopricRole : S.roleFailed });
    }
  };

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.draft.trim()) return;
    try {
      await updateName.mutateAsync({ userId: editing.userId, displayName: editing.draft.trim() });
      setEditing(null);
      toast({ variant: 'success', message: S.nameSaved });
    } catch {
      toast({ variant: 'danger', message: S.nameFailed });
    }
  };

  const nameOf = (u: AppUser) => u.display_name ?? S.noName;

  const confirmDelete = async () => {
    if (!pendingDelete || deleteUser.isPending) return;
    const target = pendingDelete;
    try {
      await deleteUser.mutateAsync({ userId: target.user_id });
      toast({ variant: 'success', message: S.deleted });
      setPendingDelete(null);
      // The row (and the button that opened the confirmation) is gone; keep keyboard focus on the page.
      setTimeout(() => addButtonRef.current?.focus(), 0);
    } catch (err) {
      toast({ variant: 'danger', message: adminErrorMessage(err) });
      setPendingDelete(null);
    }
  };

  let body;
  if (!users) {
    body = usersQuery.isError ? (
      <p className="st-msg">{S.loadFailed}</p>
    ) : (
      <div className="app-loading">
        <Spinner size="sm" label={T.loading} showLabel />
      </div>
    );
  } else if (users.length === 0) {
    body = <EmptyState className="app-empty" headingLevel={2} title={S.empty} />;
  } else {
    body = (
      <div className="st-table" role="table" aria-label={S.tableLabel}>
        <div className="st-row st-head" role="row">
          <div role="columnheader" className="st-c-name">{S.columns.name}</div>
          <div role="columnheader" className="st-c-email">{S.columns.email}</div>
          <div role="columnheader" className="st-c-role">{S.columns.role}</div>
          <div role="columnheader" className="st-c-act">{S.columns.actions}</div>
        </div>
        {users.map((u) => {
          const isEditing = editing?.userId === u.user_id;
          const isLastBishopric = u.role === 'bishopric' && bishopricCount === 1;
          return (
            <div className="st-row" role="row" key={u.user_id}>
              <div role="cell" className="st-c-name">
                {isEditing ? (
                  <form className="st-edit" onSubmit={saveName}>
                    <TextField
                      size="sm"
                      fullWidth
                      aria-label={S.nameLabel(u.email)}
                      autoFocus
                      value={editing.draft}
                      onChange={(e) => setEditing({ userId: u.user_id, draft: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditing(null);
                      }}
                    />
                    <Button type="submit" size="sm" shape="square" disabled={updateName.isPending || !editing.draft.trim()}>
                      {S.saveName}
                    </Button>
                    <Button type="button" size="sm" shape="square" variant="ghost" onClick={() => setEditing(null)}>
                      {S.cancelName}
                    </Button>
                  </form>
                ) : (
                  <>
                    <b className="st-name">{nameOf(u)}</b>
                    {u.user_id === user?.id && <span className="st-me">{S.me}</span>}
                    {u.invite_pending && (
                      <span className="st-nopw" title={S.invitePendingHint}>
                        {S.invitePending}
                      </span>
                    )}
                  </>
                )}
              </div>
              <div role="cell" className="st-c-email" title={u.email}>
                {u.email}
              </div>
              <div
                role="cell"
                className="st-c-role"
                title={isLastBishopric ? S.lastBishopricHint : undefined}
              >
                <Select
                  size="sm"
                  fullWidth
                  aria-label={S.roleOf(nameOf(u))}
                  value={u.role}
                  options={isLastBishopric ? LAST_BISHOPRIC_OPTIONS : ROLE_OPTIONS}
                  disabled={updateRole.isPending}
                  onChange={(v) => {
                    if (v !== u.role) setPendingRole({ user: u, role: v as Role });
                  }}
                />
              </div>
              <div role="cell" className="st-c-act">
                {!isEditing && (
                  <button
                    type="button"
                    className="st-link"
                    aria-label={S.editNameOf(nameOf(u))}
                    onClick={() => setEditing({ userId: u.user_id, draft: u.display_name ?? '' })}
                  >
                    {S.editName}
                  </button>
                )}
                <button
                  type="button"
                  className="st-link"
                  aria-label={S.resetLinkOf(nameOf(u))}
                  onClick={() => openLink(u)}
                >
                  {S.resetLink}
                </button>
                {u.user_id !== user?.id && (
                  <button
                    type="button"
                    className="st-link st-link--danger"
                    aria-label={S.deleteOf(nameOf(u))}
                    onClick={() => setPendingDelete(u)}
                  >
                    {S.delete}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="st">
      <div className="aw-sub">
        <span className="aw-sum">
          <span>
            {S.countUsers} <b>{users?.length ?? 0}</b>
          </span>
        </span>
      </div>

      <div className="st-tools" role="group" aria-label={S.toolsLabel}>
        <p className="st-hint">{S.ownRoleWarning}</p>
        <div className="st-acts">
          <Button ref={addButtonRef} size="sm" shape="square" onClick={openAdd}>
            {S.addUser}
          </Button>
        </div>
      </div>

      <div className="st-scroll">{body}</div>

      <Dialog open={pendingRole !== null} onClose={() => setPendingRole(null)} size="sm">
        <Dialog.Title onClose={() => setPendingRole(null)}>{S.roleDialogTitle}</Dialog.Title>
        <Dialog.Content>
          {pendingRole && (
            <p className="st-dialog-text">
              {pendingRole.user.user_id === user?.id
                ? S.roleConfirmSelf(T.role[pendingRole.role])
                : S.roleConfirm(nameOf(pendingRole.user), T.role[pendingRole.role])}
            </p>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="ghost" size="sm" shape="square" onClick={() => setPendingRole(null)}>
            {S.roleCancel}
          </Button>
          <Button size="sm" shape="square" onClick={() => void confirmRole()}>
            {S.roleChange}
          </Button>
        </Dialog.Actions>
      </Dialog>

      <AddUserDialog key={`add-${dialogKey}`} open={addOpen} onClose={() => setAddOpen(false)} />
      <UserLinkDialog key={`link-${dialogKey}`} user={linkFor} onClose={() => setLinkFor(null)} />

      <Dialog open={pendingDelete !== null} onClose={() => !deleteUser.isPending && setPendingDelete(null)} size="sm">
        <Dialog.Title onClose={() => !deleteUser.isPending && setPendingDelete(null)}>{S.deleteTitle}</Dialog.Title>
        <Dialog.Content>
          {pendingDelete && (
            <p className="st-dialog-text">{S.deleteConfirm(nameOf(pendingDelete), pendingDelete.email)}</p>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            variant="ghost"
            size="sm"
            shape="square"
            disabled={deleteUser.isPending}
            onClick={() => setPendingDelete(null)}
          >
            {S.cancel}
          </Button>
          <Button
            variant="danger"
            size="sm"
            shape="square"
            loading={deleteUser.isPending}
            disabled={deleteUser.isPending}
            onClick={() => void confirmDelete()}
          >
            {deleteUser.isPending ? S.deleting : S.delete}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </div>
  );
}
