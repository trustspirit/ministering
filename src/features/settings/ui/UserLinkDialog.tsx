import { useEffect, useRef, useState } from 'react';
import { Button, Dialog, TextField, useToast } from 'trust-ui-react';
import { buildPasswordLink } from '@/features/auth/passwordLink';
import { T } from '@/shared/copy';
import { adminErrorMessage } from '../adminErrorMessage';
import type { AppUser } from '../hooks/useAppUsers';
import { useAdminUsers, type PasswordLinkResult } from '../hooks/useAdminUsers';
import './settings-dialogs.css';

const S = T.settings;

/**
 * The link step shared by "사용자 추가" and "비밀번호 변경 링크": the address (read-only, focused), 링크 복사 with a
 * select-and-copy fallback, and the one-time rules. Rendered inside the caller's single Dialog.
 */
export function PasswordLinkView({
  link,
  name,
  email,
  onClose,
}: {
  link: PasswordLinkResult;
  name: string;
  email: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const fieldRef = useRef<HTMLInputElement>(null);
  const url = buildPasswordLink(window.location.origin, link.tokenHash, link.type);

  // The button that led here has just been replaced by this view; keyboard focus goes to the address.
  useEffect(() => {
    fieldRef.current?.focus();
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ variant: 'success', message: S.copied });
    } catch {
      // No clipboard (insecure origin, denied permission): select the address so Ctrl/Cmd+C works.
      fieldRef.current?.focus();
      fieldRef.current?.select();
      toast({ variant: 'warning', message: S.copyFailed });
    }
  };

  return (
    <>
      <Dialog.Title onClose={onClose}>{S.linkTitle}</Dialog.Title>
      <Dialog.Content>
        <p className="su-text">{S.linkFor(name, email)}</p>
        <div className="su-url">
          <TextField
            ref={fieldRef}
            size="sm"
            fullWidth
            label={S.linkLabel}
            value={url}
            readOnly
            spellCheck={false}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
        <p className="su-note">{S.linkOnce}</p>
        <p className="su-warn">⚠ {S.linkShownOnce}</p>
      </Dialog.Content>
      <Dialog.Actions>
        <Button variant="ghost" size="sm" shape="square" onClick={onClose}>
          {S.close}
        </Button>
        <Button size="sm" shape="square" onClick={() => void copy()}>
          {S.copy}
        </Button>
      </Dialog.Actions>
    </>
  );
}

/**
 * "비밀번호 변경 링크" for one user: a confirmation, then the new link in the same Dialog (two chained trust-ui
 * Dialogs would close each other). Mount with a new `key` per opening (together with `user`) so every opening starts
 * at the confirmation; `user` becoming null closes it.
 */
export function UserLinkDialog({ user: openFor, onClose }: { user: AppUser | null; onClose: () => void }) {
  // Kept while the dialog animates closed, so its content does not change under the closing animation.
  const [user] = useState(openFor);
  const { createResetLink } = useAdminUsers();
  const [link, setLink] = useState<PasswordLinkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = createResetLink.isPending;
  const name = user?.display_name ?? S.noName;

  const create = async () => {
    if (!user || busy) return;
    setError(null);
    try {
      setLink(await createResetLink.mutateAsync({ userId: user.user_id }));
    } catch (err) {
      setError(adminErrorMessage(err));
    }
  };

  // While the request runs, closing would throw away the only copy of the new link.
  const close = () => {
    if (!busy) onClose();
  };

  return (
    <Dialog open={openFor !== null} onClose={close} size="sm">
      {user && link ? (
        <PasswordLinkView link={link} name={name} email={user.email} onClose={close} />
      ) : (
        <>
          <Dialog.Title onClose={close}>{S.resetTitle}</Dialog.Title>
          <Dialog.Content>
            {user && <p className="su-text">{S.resetConfirm(name, user.email)}</p>}
            {error && (
              <p className="su-error" role="alert">
                ⚠ {error}
              </p>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button variant="ghost" size="sm" shape="square" onClick={close} disabled={busy}>
              {S.cancel}
            </Button>
            <Button size="sm" shape="square" onClick={() => void create()} loading={busy} disabled={busy}>
              {busy ? S.creatingLink : S.createLink}
            </Button>
          </Dialog.Actions>
        </>
      )}
    </Dialog>
  );
}
