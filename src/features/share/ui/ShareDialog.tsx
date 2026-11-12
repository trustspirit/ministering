import { useEffect, useRef, useState } from 'react';
import { Button, Dialog, TextField, useToast } from 'trust-ui-react';
import { ministryLabel, type BoardMinistry } from '@/features/assignment/domain/board';
import { useWorkspace } from '@/features/assignment/workspaceContext';
import { T } from '@/shared/copy';
import { generateShareToken, shareUrl } from '../shareToken';
import { useShareToken } from '../useShareToken';
import './share.css';

type Confirm = 'regenerate' | 'disable' | null;

export function ShareDialog({
  ministry,
  open,
  onClose,
}: {
  ministry: BoardMinistry;
  open: boolean;
  onClose: () => void;
}) {
  const { actions } = useWorkspace();
  const { toast } = useToast();
  const S = T.share;
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [writing, setWriting] = useState(false);
  const writingRef = useRef(false);
  const fieldRef = useRef<HTMLInputElement>(null);
  const query = useShareToken(ministry.id, open);
  const token = query.data ?? null;
  const url = token ? shareUrl(token) : '';
  const loading = query.isPending || writing;

  const failed = query.isError;
  useEffect(() => {
    if (open && failed) toast({ variant: 'danger', message: S.loadFailed });
  }, [open, failed, toast, S.loadFailed]);

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

  /** One write at a time; the new address is shown only after it has been read back from the server. */
  const write = async (next: string | null, message?: string) => {
    if (writingRef.current) return;
    writingRef.current = true;
    setWriting(true);
    setConfirm(null);
    try {
      if (await actions.setShareToken(ministry.id, next)) {
        await query.refetch();
        if (message) toast({ variant: 'success', message });
      }
    } finally {
      writingRef.current = false;
      setWriting(false);
    }
  };

  return (
    <>
      <Dialog open={open && confirm === null} onClose={onClose} size="sm">
        <Dialog.Title onClose={onClose}>{S.dialogTitleOf(ministryLabel(ministry))}</Dialog.Title>
        <Dialog.Content>
          <p className="aw-dialog-text">{S.description}</p>
          {loading && !failed && <p className="aw-dialog-text sh-status">{S.loading}</p>}
          {!loading && token && (
            <div className="sh-url">
              <TextField
                ref={fieldRef}
                size="sm"
                fullWidth
                label={S.urlLabel}
                value={url}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
              />
            </div>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          {failed ? (
            <Button variant="ghost" size="sm" onClick={onClose}>
              {S.close}
            </Button>
          ) : token ? (
            <>
              <Button variant="ghost" size="sm" disabled={loading} onClick={() => setConfirm('disable')}>
                {S.disable}
              </Button>
              <Button variant="outline" size="sm" disabled={loading} onClick={() => setConfirm('regenerate')}>
                {S.regenerate}
              </Button>
              <Button size="sm" disabled={loading} onClick={() => void copy()}>
                {S.copy}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                {S.close}
              </Button>
              <Button size="sm" disabled={loading} onClick={() => void write(generateShareToken())}>
                {S.create}
              </Button>
            </>
          )}
        </Dialog.Actions>
      </Dialog>

      <Dialog open={open && confirm !== null} onClose={() => setConfirm(null)} size="sm">
        <Dialog.Title onClose={() => setConfirm(null)}>
          {confirm === 'disable' ? S.disableTitle : S.regenerateTitle}
        </Dialog.Title>
        <Dialog.Content>
          <p className="aw-dialog-text">{confirm === 'disable' ? S.disableConfirm : S.regenerateConfirm}</p>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="ghost" size="sm" onClick={() => setConfirm(null)}>
            {S.cancel}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() =>
              confirm === 'disable'
                ? void write(null, S.disabled)
                : void write(generateShareToken(), S.regenerated)
            }
          >
            {confirm === 'disable' ? S.disable : S.regenerate}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </>
  );
}
