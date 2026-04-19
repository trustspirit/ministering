import { useState, useMemo } from 'react';
import { useMembers } from '@/features/members/hooks/useMembers';
import { useMemberFilterStore, filterMembers } from '@/features/members/store';
import { MembersTable } from '@/features/members/ui/MembersTable';
import { MemberFormModal } from '@/features/members/ui/MemberFormModal';
import { usePermission } from '@/shared/auth/usePermission';
import type { Member } from '@/features/members/types';
import { CsvImportModal } from '@/features/members/ui/CsvImportModal';
import { exportMembersCsv } from '@/features/members/domain/exportMembersCsv';
import { useHouseholds } from '@/features/households/hooks/useHouseholds';
import { MapView } from '@/features/map/ui/MapView';
import { SelectionBar } from '@/features/map/ui/SelectionBar';

type ModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; member: Member };

export default function MembersPage() {
  const { data: members = [], isLoading } = useMembers();
  const filters = useMemberFilterStore();
  const perm = usePermission();
  const { data: households = [] } = useHouseholds();
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [csvOpen, setCsvOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');

  const filtered = useMemo(
    () => filterMembers(members, filters),
    [members, filters.search, filters.gender, filters.activeStatus, filters.personality],
  );

  const householdIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const h of households) map[h.id] = h.name;
    return map;
  }, [households]);

  const onExport = () => {
    const csv = exportMembersCsv(filtered, householdIdToName);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">회원 관리</h2>
        <div className="flex gap-2">
          <div className="inline-flex rounded border overflow-hidden text-sm mr-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
            >
              목록
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 ${viewMode === 'map' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
            >
              지도
            </button>
          </div>
          <button
            onClick={onExport}
            disabled={filtered.length === 0}
            className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded text-sm hover:bg-slate-200 disabled:opacity-50"
          >
            CSV 내보내기 ({filtered.length})
          </button>
          {perm.canEditMembers && (
            <>
              <button
                onClick={() => setCsvOpen(true)}
                className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded text-sm hover:bg-slate-200"
              >
                CSV 업로드
              </button>
              <button
                onClick={() => setModal({ open: true, mode: 'create' })}
                className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm"
              >
                + 회원 추가
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4 text-sm flex-wrap">
        <input
          value={filters.search}
          onChange={(e) => filters.setSearch(e.target.value)}
          placeholder="이름 검색..."
          className="border rounded px-2 py-1 flex-1 min-w-[180px]"
        />
        <select value={filters.gender} onChange={(e) => filters.setGender(e.target.value as never)} className="border rounded px-2 py-1">
          <option value="all">성별: 전체</option>
          <option value="M">남</option>
          <option value="F">여</option>
        </select>
        <select value={filters.activeStatus} onChange={(e) => filters.setActiveStatus(e.target.value as never)} className="border rounded px-2 py-1">
          <option value="all">상태: 전체</option>
          <option value="active">활동</option>
          <option value="less_active">저활동</option>
        </select>
        <select value={filters.personality} onChange={(e) => filters.setPersonality(e.target.value as never)} className="border rounded px-2 py-1">
          <option value="all">성향: 전체</option>
          <option value="active">적극적</option>
          <option value="moderate">보통</option>
          <option value="passive">수동적</option>
        </select>
        <button onClick={filters.reset} className="text-slate-500 hover:text-slate-900 px-2">초기화</button>
      </div>

      <div className="text-sm text-slate-500 mb-2">
        {filtered.length} / {members.length} 명
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-slate-500">불러오는 중...</div>
      ) : viewMode === 'table' ? (
        <MembersTable
          members={filtered}
          onRowClick={(m) => {
            if (perm.canEditMembers) setModal({ open: true, mode: 'edit', member: m });
          }}
        />
      ) : (
        <MapView members={filtered} />
      )}

      <MemberFormModal
        open={modal.open}
        config={
          modal.open
            ? (modal.mode === 'create' ? { mode: 'create' } : { mode: 'edit', member: modal.member })
            : { mode: 'create' }
        }
        onClose={() => setModal({ open: false })}
      />

      <CsvImportModal open={csvOpen} onClose={() => setCsvOpen(false)} />

      <SelectionBar allMembers={members} />
    </div>
  );
}
