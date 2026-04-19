import { useState, useMemo } from 'react';
import { useHouseholds } from '@/features/households/hooks/useHouseholds';
import { useMembers } from '@/features/members/hooks/useMembers';
import { HouseholdFormModal } from '@/features/households/ui/HouseholdFormModal';
import { Badge } from '@/shared/ui/Badge';
import { usePermission } from '@/shared/auth/usePermission';
import type { Household } from '@/features/households/types';

export default function HouseholdsPage() {
  const { data: households = [], isLoading } = useHouseholds();
  const { data: members = [] } = useMembers();
  const perm = usePermission();
  const [editing, setEditing] = useState<Household | null>(null);

  const membersByHouseholdId = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const m of members) {
      if (!m.household_id) continue;
      if (!map[m.household_id]) map[m.household_id] = [];
      map[m.household_id].push(m.full_name);
    }
    return map;
  }, [members]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">가정 관리</h2>

      {isLoading ? (
        <div className="py-12 text-center text-slate-500">불러오는 중...</div>
      ) : households.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          가정이 없습니다. 회원 CSV 업로드 시 자동 생성됩니다.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 px-3">이름</th>
                <th className="py-2 px-3">주소</th>
                <th className="py-2 px-3">구성원</th>
                <th className="py-2 px-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {households.map((h) => {
                const memberNames = membersByHouseholdId[h.id] ?? [];
                return (
                  <tr key={h.id} className="border-b hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium">{h.name}</td>
                    <td className="py-2 px-3 text-slate-600 max-w-xs truncate">
                      {h.address ?? <span className="text-slate-400 italic">미입력</span>}
                      {h.address && h.lat === null && (
                        <span className="ml-2"><Badge tone="orange">주소 미확인</Badge></span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {memberNames.length > 0 ? memberNames.join(', ') : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {perm.canEditMembers && (
                        <button
                          onClick={() => setEditing(h)}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          수정
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <HouseholdFormModal
        key={editing?.id ?? 'none'}
        open={editing !== null}
        household={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
