import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Button, Dialog, EmptyState, Select, Spinner, TextField, useToast } from 'trust-ui-react';
import { useAuth } from '@/features/auth/useAuth';
import { useAppUsers, type AppUser } from '@/features/settings/hooks/useAppUsers';
import { useUpdateDisplayName, useUpdateProfileRole } from '@/features/settings/hooks/useProfileMutations';
import { usePermission } from '@/shared/auth/usePermission';
import { T } from '@/shared/copy';
import '@/shared/ui/subbar.css';
import type { Database } from '@/types/database.types';
import './SettingsPage.css';

type Role = Database['public']['Enums']['user_role'];

const S = T.settings;
const ROLE_OPTIONS = (Object.keys(T.role) as Role[]).map((value) => ({ value, label: T.role[value] }));

export default function SettingsPage() {
  const perm = usePermission();
  const { user, profileLoaded } = useAuth();
  const { toast } = useToast();
  const usersQuery = useAppUsers();
  const updateRole = useUpdateProfileRole();
  const updateName = useUpdateDisplayName();

  const [pendingRole, setPendingRole] = useState<{ user: AppUser; role: Role } | null>(null);
  const [editing, setEditing] = useState<{ userId: string; draft: string } | null>(null);

  // After a reload the profile arrives a moment after the session; deciding earlier would send a bishopric home.
  if (!profileLoaded) {
    return (
      <div className="app-loading">
        <Spinner size="sm" label={S.loading} showLabel />
      </div>
    );
  }
  if (!perm.canManageUsers) return <Navigate to="/" replace />;

  const users = usersQuery.data;

  const confirmRole = async () => {
    if (!pendingRole) return;
    const { user: target, role } = pendingRole;
    setPendingRole(null);
    try {
      await updateRole.mutateAsync({ userId: target.user_id, role });
      toast({ variant: 'success', message: S.roleSaved });
    } catch {
      toast({ variant: 'danger', message: S.roleFailed });
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

  let body;
  if (!users) {
    body = usersQuery.isError ? (
      <p className="st-msg">{S.loadFailed}</p>
    ) : (
      <div className="app-loading">
        <Spinner size="sm" label={S.loading} showLabel />
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
                  </>
                )}
              </div>
              <div role="cell" className="st-c-email" title={u.email}>
                {u.email}
              </div>
              <div role="cell" className="st-c-role">
                <Select
                  size="sm"
                  fullWidth
                  aria-label={S.roleOf(nameOf(u))}
                  value={u.role}
                  options={ROLE_OPTIONS}
                  disabled={updateRole.isPending}
                  onChange={(v) => {
                    if (v !== u.role) setPendingRole({ user: u, role: v as Role });
                  }}
                />
              </div>
              {/* Row actions live here; Task 14 adds its per-row buttons next to this one. */}
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
        {/* Toolbar actions (Task 14: ＋ 사용자 추가) go at the right end, like the roster's .ro-acts. */}
        <div className="st-acts" />
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
    </div>
  );
}
