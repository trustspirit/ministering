import { useState, type FormEvent } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { useCreateMember, useUpdateMember, useDeleteMember } from '../hooks/useMemberMutations';
import type { ActiveStatus, Member, MemberInsert } from '../types';
import { STATUS_LABEL } from '@/shared/copy';

type Mode =
  | { mode: 'create' }
  | { mode: 'edit'; member: Member };

export interface MemberFormModalProps {
  open: boolean;
  config: Mode;
  onClose: () => void;
}

export function MemberFormModal({ open, config, onClose }: MemberFormModalProps) {
  const isEdit = config.mode === 'edit';
  const initial = isEdit ? config.member : null;

  const [fullName, setFullName] = useState(initial?.full_name ?? '');
  const [gender, setGender] = useState<'M' | 'F'>(initial?.gender ?? 'M');
  const [birthDate, setBirthDate] = useState(initial?.birth_date ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [activeStatus, setActiveStatus] = useState<ActiveStatus>(initial?.active_status ?? 'active');
  const [personality, setPersonality] = useState<'active' | 'moderate' | 'passive'>(initial?.personality ?? 'moderate');
  const [householdRole, setHouseholdRole] = useState<'husband' | 'wife' | 'child' | 'other'>(initial?.household_role ?? 'other');
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [error, setError] = useState<string | null>(null);

  const create = useCreateMember();
  const update = useUpdateMember();
  const remove = useDeleteMember();
  const busy = create.isPending || update.isPending || remove.isPending;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (config.mode === 'create') {
        const input: MemberInsert = {
          full_name: fullName,
          gender,
          birth_date: birthDate,
          address: address || null,
          active_status: activeStatus,
          personality,
          household_role: householdRole,
          memo: memo || null,
        };
        await create.mutateAsync(input);
      } else {
        await update.mutateAsync({
          id: config.member.id,
          patch: {
            full_name: fullName,
            gender,
            birth_date: birthDate,
            address: address || null,
            active_status: activeStatus,
            personality,
            household_role: householdRole,
            memo: memo || null,
          },
          previousAddress: config.member.address,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패');
    }
  };

  const onDelete = async () => {
    if (!isEdit) return;
    if (!confirm(`${fullName} 회원을 삭제하시겠습니까? (복구 가능한 소프트 삭제)`)) return;
    setError(null);
    try {
      await remove.mutateAsync(config.member.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  return (
    <Modal open={open} title={isEdit ? '회원 수정' : '회원 추가'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3 text-sm">
        <Field label="이름 *">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full border rounded px-2 py-1.5"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="성별 *">
            <select value={gender} onChange={(e) => setGender(e.target.value as 'M' | 'F')} className="w-full border rounded px-2 py-1.5">
              <option value="M">남</option>
              <option value="F">여</option>
            </select>
          </Field>
          <Field label="생년월일 *">
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              className="w-full border rounded px-2 py-1.5"
            />
          </Field>
        </div>
        <Field label="주소">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border rounded px-2 py-1.5"
            placeholder="서울시 강남구 ..."
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="활동 상태">
            <select value={activeStatus} onChange={(e) => setActiveStatus(e.target.value as ActiveStatus)} className="w-full border rounded px-2 py-1.5">
              <option value="active">활동</option>
              <option value="less_active">저활동</option>
              <option value="new_member">{STATUS_LABEL.new_member}</option>
            </select>
          </Field>
          <Field label="성향">
            <select value={personality} onChange={(e) => setPersonality(e.target.value as 'active' | 'moderate' | 'passive')} className="w-full border rounded px-2 py-1.5">
              <option value="active">적극적</option>
              <option value="moderate">보통</option>
              <option value="passive">수동적</option>
            </select>
          </Field>
        </div>
        <Field label="가정 내 역할">
          <select value={householdRole} onChange={(e) => setHouseholdRole(e.target.value as 'husband' | 'wife' | 'child' | 'other')} className="w-full border rounded px-2 py-1.5">
            <option value="other">기타</option>
            <option value="husband">남편</option>
            <option value="wife">아내</option>
            <option value="child">자녀</option>
          </select>
        </Field>
        <Field label="메모">
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            className="w-full border rounded px-2 py-1.5"
          />
        </Field>

        {error && <p className="text-red-600">{error}</p>}

        <div className="flex justify-between pt-2">
          {isEdit ? (
            <button type="button" onClick={onDelete} disabled={busy}
              className="text-red-600 hover:text-red-800 disabled:opacity-50 text-xs">
              삭제
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={busy}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-50">취소</button>
            <button type="submit" disabled={busy}
              className="px-4 py-1.5 bg-blue-600 text-white rounded disabled:opacity-60">
              {busy ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-slate-600 text-xs mb-1">{label}</span>
      {children}
    </label>
  );
}
