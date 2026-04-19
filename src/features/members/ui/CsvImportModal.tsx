import { useState, type ChangeEvent } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { parseMemberCsv, type ParseResult } from '../domain/parseMemberCsv';
import { useImportMembers, type ImportProgress, type ImportReport } from '../hooks/useImportMembers';

export interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
}

type Step =
  | { step: 'upload' }
  | { step: 'preview'; filename: string; result: ParseResult }
  | { step: 'importing'; progress: ImportProgress | null }
  | { step: 'done'; report: ImportReport };

export function CsvImportModal({ open, onClose }: CsvImportModalProps) {
  const [state, setState] = useState<Step>({ step: 'upload' });
  const importer = useImportMembers();

  const reset = () => setState({ step: 'upload' });
  const close = () => {
    reset();
    onClose();
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const csv = String(reader.result ?? '');
      const result = parseMemberCsv(csv);
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
    } catch (err) {
      alert(err instanceof Error ? err.message : '가져오기 실패');
      reset();
    }
  };

  return (
    <Modal open={open} title="회원 CSV 가져오기" onClose={close}>
      {state.step === 'upload' && (
        <div className="space-y-3 text-sm">
          <p className="text-slate-600">
            CSV 헤더: <code className="bg-slate-100 px-1">full_name,gender,birth_date,address,active_status,personality,memo,household_name,household_role</code>
          </p>
          <ul className="text-xs text-slate-500 list-disc pl-5 space-y-1">
            <li>gender: M/F 또는 남/여</li>
            <li>birth_date: YYYY-MM-DD</li>
            <li>active_status: active/less_active 또는 활동/저활동 (생략 시 활동)</li>
            <li>personality: active/moderate/passive 또는 적극적/보통/수동적 (생략 시 보통)</li>
            <li>household_role: husband/wife/child/other 또는 남편/아내/자녀/기타 (생략 시 기타)</li>
            <li>같은 이름+생일 회원이 있으면 UPDATE</li>
          </ul>
          <input type="file" accept=".csv" onChange={onFile} className="block" />
        </div>
      )}

      {state.step === 'preview' && (
        <div className="space-y-3 text-sm">
          <div className="text-slate-600">
            <strong>{state.filename}</strong> 파싱 결과
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="text-xs text-green-700">유효</div>
              <div className="text-2xl font-bold text-green-700">{state.result.valid.length}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="text-xs text-red-700">에러</div>
              <div className="text-2xl font-bold text-red-700">{state.result.errors.length}</div>
            </div>
          </div>

          {state.result.errors.length > 0 && (
            <div className="max-h-48 overflow-y-auto border rounded">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">행</th>
                    <th className="px-2 py-1 text-left">이유</th>
                    <th className="px-2 py-1 text-left">원본</th>
                  </tr>
                </thead>
                <tbody>
                  {state.result.errors.map((e, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">{e.rowIndex}</td>
                      <td className="px-2 py-1 text-red-700">{e.reason}</td>
                      <td className="px-2 py-1 text-slate-500">{JSON.stringify(e.raw)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={reset} className="px-3 py-1.5 text-slate-600">다시 선택</button>
            <button
              onClick={onCommit}
              disabled={state.result.valid.length === 0}
              className="bg-blue-600 text-white px-4 py-1.5 rounded disabled:opacity-50"
            >
              유효한 {state.result.valid.length}건 가져오기
            </button>
          </div>
        </div>
      )}

      {state.step === 'importing' && (
        <div className="space-y-3 text-sm py-4">
          <div className="text-slate-600">
            {state.progress
              ? `${state.progress.phase === 'households' ? '가정 생성 중' : '회원 등록 중'}: ${state.progress.completed}/${state.progress.total}`
              : '준비 중...'}
          </div>
          {state.progress && (
            <div className="w-full bg-slate-200 h-2 rounded overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all"
                style={{ width: `${(state.progress.completed / state.progress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {state.step === 'done' && (
        <div className="space-y-3 text-sm">
          <div className="text-green-700 font-semibold">완료!</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>가정 생성: {state.report.householdsCreated}개</li>
            <li>회원 추가: {state.report.created}명</li>
            <li>회원 업데이트: {state.report.updated}명</li>
            {state.report.failed.length > 0 && (
              <li className="text-red-700">실패: {state.report.failed.length}건</li>
            )}
          </ul>
          {state.report.failed.length > 0 && (
            <div className="max-h-48 overflow-y-auto border rounded text-xs">
              {state.report.failed.map((f, i) => (
                <div key={i} className="border-t px-2 py-1">
                  <span className="font-medium">{f.row.full_name}</span>: {f.reason}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={close} className="bg-blue-600 text-white px-4 py-1.5 rounded">닫기</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
