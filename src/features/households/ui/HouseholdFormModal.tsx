import { useState, type FormEvent } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { useUpdateHousehold } from '../hooks/useHouseholdMutations';
import type { Household } from '@/features/households/types';

export interface HouseholdFormModalProps {
  open: boolean;
  household: Household | null;
  onClose: () => void;
}

export function HouseholdFormModal({ open, household, onClose }: HouseholdFormModalProps) {
  const [name, setName] = useState(household?.name ?? '');
  const [address, setAddress] = useState(household?.address ?? '');
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateHousehold();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!household) return;
    setError(null);
    try {
      await update.mutateAsync({
        id: household.id,
        patch: { name, address: address || null },
        previousAddress: household.address,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패');
    }
  };

  if (!household) return null;

  return (
    <Modal open={open} title="가정 수정" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3 text-sm">
        <label className="block">
          <span className="block text-slate-600 text-xs mb-1">이름</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border rounded px-2 py-1.5"
          />
        </label>
        <label className="block">
          <span className="block text-slate-600 text-xs mb-1">주소</span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border rounded px-2 py-1.5"
          />
        </label>
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-slate-600">취소</button>
          <button type="submit" disabled={update.isPending} className="bg-blue-600 text-white px-4 py-1.5 rounded disabled:opacity-60">
            {update.isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
