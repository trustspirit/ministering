import { useRef, useState } from 'react';
import { Button, Dialog, TextField, useToast } from 'trust-ui-react';
import { ministryLabel, type BoardMinistry } from '@/features/assignment/domain/board';
import { useWorkspace } from '@/features/assignment/workspaceContext';
import { T } from '@/shared/copy';
import { generateShareToken, shareUrl } from '../shareToken';
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
  const fieldRef = useRef<HTMLInputElement>(null);
  const token = ministry.shareToken;
  const url = token ? shareUrl(token) : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ variant: 'success', message: S.copied });
    } catch {
      // No clipboard permission (or an insecure origin): select the address so Ctrl/Cmd+C works.
      fieldRef.current?.focus();
      fieldRef.current?.select();
      toast({ variant: 'warning', message: S.copyFailed });
    }
  };

  const create = () => {
    void actions.setShareToken(ministry.id, generateShareToken());
  };

  const change = async (next: string | null, message: string) => {
    setConfirm(null);
    if (await actions.setShareToken(ministry.id, next)) toast({ variant: 'success', message });
  };
  const regenerate = () => void change(generateShareToken(), S.regenerated);
  const disable = () => void change(null, S.disabled);

  return (
    <>
      <Dialog open={open && confirm === null} onClose={onClose} size="sm">
        <Dialog.Title onClose={onClose}>{S.dialogTitleOf(ministryLabel(ministry))}</Dialog.Title>
        <Dialog.Content>
          <p className="aw-dialog-text">{S.description}</p>
          {token && (
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
          {token ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setConfirm('disable')}>
                {S.disable}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirm('regenerate')}>
                {S.regenerate}
              </Button>
              <Button size="sm" onClick={() => void copy()}>
                {S.copy}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                {S.close}
              </Button>
              <Button size="sm" onClick={create}>
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
          <Button variant="danger" size="sm" onClick={confirm === 'disable' ? disable : regenerate}>
            {confirm === 'disable' ? S.disable : S.regenerate}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </>
  );
}
