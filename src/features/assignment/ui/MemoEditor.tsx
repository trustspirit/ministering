import { useState } from 'react';
import { Button, TextArea, useToast } from 'trust-ui-react';
import { T } from '@/shared/copy';

/** A free-text memo shown as a note, edited in place. `onSave` rejects when the save failed. */
export function MemoEditor({
  value,
  onSave,
  canEdit,
  label,
}: {
  value: string | null;
  onSave: (text: string) => Promise<void>;
  canEdit: boolean;
  label: string;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = draft !== null;

  const save = async () => {
    if (draft === null || saving) return;
    setSaving(true);
    try {
      await onSave(draft.trimEnd());
      setDraft(null);
    } catch {
      toast({ variant: 'danger', message: T.detail.memoSaveFailed });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="aw-nb">
      <p className="aw-eye">{label}</p>
      {editing ? (
        <>
          <TextArea
            fullWidth
            rows={4}
            autoResize
            maxRows={12}
            label={label}
            hideLabel
            value={draft}
            onValueChange={setDraft}
            disabled={saving}
          />
          <div className="aw-eb">
            <Button size="sm" variant="primary" shape="square" onClick={save} disabled={saving}>
              {T.detail.memoSave}
            </Button>
            <Button size="sm" variant="outline" shape="square" onClick={() => setDraft(null)} disabled={saving}>
              {T.detail.memoCancel}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className={value ? 'aw-note' : 'aw-note aw-note--none'}>{value || T.detail.memoEmpty}</div>
          {canEdit && (
            <button type="button" className="aw-edit" onClick={() => setDraft(value ?? '')}>
              {T.detail.memoEdit}
            </button>
          )}
        </>
      )}
    </div>
  );
}
