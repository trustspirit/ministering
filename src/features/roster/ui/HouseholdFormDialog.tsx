import { useState, type FormEvent } from 'react';
import { Button, Dialog, TextArea, TextField } from 'trust-ui-react';
import { useUpdateHousehold } from '@/features/households/hooks/useHouseholdMutations';
import type { Household } from '@/features/households/types';
import { T } from '@/shared/copy';
import './roster.css';

const F = T.householdForm;

interface HouseholdFormDialogProps {
  open: boolean;
  household: Household;
  onClose: () => void;
}

/** Mount with a `key` per household so every opening starts from that household's values. */
export function HouseholdFormDialog({ open, household, onClose }: HouseholdFormDialogProps) {
  const [address, setAddress] = useState(household.address ?? '');
  const [memo, setMemo] = useState(household.memo ?? '');
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateHousehold();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await update.mutateAsync({
        id: household.id,
        patch: {
          address: address.trim() || null,
          memo: memo.trim() ? memo.trimEnd() : null,
        },
        previousAddress: household.address,
      });
      onClose();
    } catch {
      setError(F.saveFailed);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} size="md">
      <Dialog.Title onClose={onClose}>{F.titleOf(household.name)}</Dialog.Title>
      <Dialog.Content>
        <p className="ro-form-note">{F.nameNote}</p>
        <form id="household-form" onSubmit={submit} noValidate>
          <div className="ro-form">
            <div className="ro-wide">
              <TextField
                size="sm"
                fullWidth
                label={F.address}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="ro-wide">
              <TextArea
                size="sm"
                rows={4}
                autoResize
                fullWidth
                label={F.memo}
                value={memo}
                onValueChange={setMemo}
              />
            </div>
          </div>
        </form>
        {error && (
          <p className="ro-error" role="alert">
            {T.warnMark} {error}
          </p>
        )}
      </Dialog.Content>
      <Dialog.Actions>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          shape="square"
          disabled={update.isPending}
          onClick={onClose}
        >
          {F.cancel}
        </Button>
        <Button
          type="submit"
          form="household-form"
          variant="primary"
          size="sm"
          shape="square"
          disabled={update.isPending}
        >
          {update.isPending ? F.saving : F.save}
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}
