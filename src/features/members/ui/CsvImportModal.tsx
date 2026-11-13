import { useState } from 'react';
import { Button, Dialog, FileUpload, Progress } from 'trust-ui-react';
import { T } from '@/shared/copy';
import { parseMemberCsv, type ParseResult } from '../domain/parseMemberCsv';
import { useImportMembers, type ImportProgress, type ImportReport } from '../hooks/useImportMembers';
import '@/features/roster/ui/roster.css';

const C = T.csv;

export interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
}

type Step =
  | { step: 'upload'; error?: string }
  | { step: 'preview'; filename: string; result: ParseResult }
  | { step: 'importing'; progress: ImportProgress | null }
  | { step: 'done'; report: ImportReport };

export function CsvImportModal({ open, onClose }: CsvImportModalProps) {
  const [state, setState] = useState<Step>({ step: 'upload' });
  const importer = useImportMembers();

  const reset = () => setState({ step: 'upload' });
  const importing = state.step === 'importing';
  const close = () => {
    if (importing) return;
    reset();
    onClose();
  };

  const onFiles = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseMemberCsv(String(reader.result ?? ''));
      setState({ step: 'preview', filename: file.name, result });
    };
    reader.readAsText(file);
  };

  const onCommit = async () => {
    if (state.step !== 'preview') return;
    setState({ step: 'importing', progress: null });
    try {
      const report = await importer.mutateAsync({
        rows: state.result.valid,
        onProgress: (progress) => setState({ step: 'importing', progress }),
      });
      setState({ step: 'done', report });
    } catch {
      setState({ step: 'upload', error: C.importFailed });
    }
  };

  const progress = state.step === 'importing' ? state.progress : null;

  return (
    <Dialog
      open={open}
      onClose={close}
      size="md"
      closeOnBackdrop={!importing}
      closeOnEscape={!importing}
    >
      <Dialog.Title onClose={close} showClose={!importing}>
        {C.title}
      </Dialog.Title>
      <Dialog.Content>
        {state.step === 'upload' && (
          <>
            <p className="ro-dialog-text">{C.header}</p>
            <p className="ro-help">
              <code>{C.headerColumns}</code>
            </p>
            <ul className="ro-help">
              {C.helpLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <FileUpload
              size="sm"
              accept=".csv,text/csv"
              placeholder={C.drop}
              browseText={C.browse}
              onFilesChange={onFiles}
            />
            {state.error && (
              <p className="ro-error" role="alert">
                {T.warnMark} {state.error}
              </p>
            )}
          </>
        )}

        {state.step === 'preview' && (
          <>
            <p className="ro-dialog-text">
              <b>{C.previewOf(state.filename)}</b>
            </p>
            <div className="ro-stats">
              <div className="ro-stat">
                {C.valid}
                <b>{state.result.valid.length}</b>
              </div>
              <div className={state.result.errors.length ? 'ro-stat ro-stat--bad' : 'ro-stat'}>
                {C.errors}
                <b>{state.result.errors.length}</b>
              </div>
            </div>
            {state.result.errors.length > 0 && (
              <div className="ro-errlist">
                {state.result.errors.map((e, i) => (
                  <div key={i}>
                    {C.errorRow} {e.rowIndex} · {e.reason}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {state.step === 'importing' && (
          <>
            <p className="ro-dialog-text">
              {progress
                ? C.progress(
                    progress.phase === 'households' ? C.phaseHouseholds : C.phaseMembers,
                    progress.completed,
                    progress.total,
                  )
                : C.preparing}
            </p>
            <Progress
              size="sm"
              aria-label={C.progressLabel}
              indeterminate={!progress || progress.total === 0}
              value={progress && progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}
            />
          </>
        )}

        {state.step === 'done' && (
          <>
            <p className="ro-dialog-text">
              <b>{C.done}</b>
            </p>
            <ul className="ro-help">
              <li>{C.householdsCreated(state.report.householdsCreated)}</li>
              <li>{C.created(state.report.created)}</li>
              <li>{C.updated(state.report.updated)}</li>
              {state.report.failed.length > 0 && <li>{T.warnMark} {C.failed(state.report.failed.length)}</li>}
              {state.report.householdsFailed.length > 0 && (
                <li>{T.warnMark} {C.householdsFailed(state.report.householdsFailed.length)}</li>
              )}
            </ul>
            {(state.report.failed.length > 0 || state.report.householdsFailed.length > 0) && (
              <div className="ro-errlist">
                {state.report.failed.map((f, i) => (
                  <div key={`r${i}`}>
                    <b>{f.row.full_name}</b> · {f.reason}
                  </div>
                ))}
                {state.report.householdsFailed.map((f, i) => (
                  <div key={`h${i}`}>
                    <b>{f.name}</b> · {f.reason}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Dialog.Content>
      <Dialog.Actions>
        {state.step === 'upload' && (
          <Button variant="ghost" size="sm" shape="square" onClick={close}>
            {C.cancel}
          </Button>
        )}
        {state.step === 'preview' && (
          <>
            <Button variant="ghost" size="sm" shape="square" onClick={reset}>
              {C.pickAgain}
            </Button>
            <Button
              variant="primary"
              size="sm"
              shape="square"
              onClick={onCommit}
              disabled={state.result.valid.length === 0}
            >
              {C.importValid(state.result.valid.length)}
            </Button>
          </>
        )}
        {state.step === 'done' && (
          <Button variant="primary" size="sm" shape="square" onClick={close}>
            {C.close}
          </Button>
        )}
      </Dialog.Actions>
    </Dialog>
  );
}
