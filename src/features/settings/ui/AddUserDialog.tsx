import { useState, type FormEvent } from 'react';
import { Button, Dialog, Select, TextField } from 'trust-ui-react';
import { T } from '@/shared/copy';
import type { Database } from '@/types/database.types';
import { adminErrorMessage } from '../adminErrorMessage';
import { useAdminUsers, type PasswordLinkResult } from '../hooks/useAdminUsers';
import { nameProblem, validateDisplayName } from '../domain/displayName';
import { PasswordLinkView } from './UserLinkDialog';
import './settings-dialogs.css';

type Role = Database['public']['Enums']['user_role'];

const S = T.settings;
const ROLE_OPTIONS = (Object.keys(T.role) as Role[]).map((value) => ({ value, label: T.role[value] }));
// Same rules as the admin-users function, which checks them again.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * "사용자 추가": name, email and role — no password anywhere; on success the same Dialog shows the set-password link.
 * Mount with a fresh `key` per opening so it always starts empty.
 */
export function AddUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createUser } = useAdminUsers();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('viewer');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ link: PasswordLinkResult; name: string; email: string } | null>(null);
  const busy = createUser.isPending;

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const nameCheck = validateDisplayName(name);
  const nameError = submitted && !nameCheck.ok ? nameProblem(nameCheck.reason) : undefined;
  const emailError = submitted && !EMAIL.test(cleanEmail) ? S.emailInvalid : undefined;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setSubmitted(true);
    setError(null);
    if (!nameCheck.ok || !EMAIL.test(cleanEmail)) return;
    try {
      const link = await createUser.mutateAsync({ email: cleanEmail, displayName: cleanName, role });
      setCreated({ link, name: cleanName, email: cleanEmail });
      // The link lives only in this dialog's state, not in the mutation cache.
      createUser.reset();
    } catch (err) {
      setError(adminErrorMessage(err));
    }
  };

  // While the request runs, closing would throw away the only copy of the new link. Once closed, the link and the
  // form are cleared for good (the link is shown only once).
  const close = () => {
    if (busy) return;
    setCreated(null);
    setName('');
    setEmail('');
    setRole('viewer');
    setSubmitted(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} size="sm">
      {created ? (
        <PasswordLinkView link={created.link} name={created.name} email={created.email} onClose={close} />
      ) : (
        <>
          <Dialog.Title onClose={close}>{S.addTitle}</Dialog.Title>
          <Dialog.Content>
            <form id="add-user-form" className="su-form" onSubmit={submit} noValidate>
              <p className="su-help">{S.addHelp}</p>
              <TextField
                size="sm"
                fullWidth
                label={S.fieldName}
                required
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={!!nameError}
                errorMessage={nameError}
              />
              <TextField
                type="email"
                size="sm"
                fullWidth
                label={S.fieldEmail}
                required
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!emailError}
                errorMessage={emailError}
              />
              <Select
                size="sm"
                fullWidth
                label={S.fieldRole}
                aria-label={S.fieldRole}
                value={role}
                options={ROLE_OPTIONS}
                onChange={(v) => setRole(v as Role)}
              />
            </form>
            {error && (
              <p className="su-error" role="alert">
                {T.warnMark} {error}
              </p>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button variant="ghost" size="sm" shape="square" onClick={close} disabled={busy}>
              {S.cancel}
            </Button>
            <Button type="submit" form="add-user-form" size="sm" shape="square" loading={busy} disabled={busy}>
              {busy ? S.adding : S.add}
            </Button>
          </Dialog.Actions>
        </>
      )}
    </Dialog>
  );
}
