import { Badge } from '@/shared/ui/Badge';
import { computeAge } from '@/features/members/domain/computeAge';
import type { Member } from '@/features/members/types';

const genderLabel = (g: Member['gender']) => (g === 'M' ? '남' : '여');
const activeLabel = (s: Member['active_status']) => (s === 'active' ? '활동' : '저활동');
const personalityLabel = (p: Member['personality']) =>
  p === 'active' ? '적극적' : p === 'passive' ? '수동적' : '보통';

export interface MembersTableProps {
  members: Member[];
  onRowClick?: (m: Member) => void;
}

export function MembersTable({ members, onRowClick }: MembersTableProps) {
  if (members.length === 0) {
    return <div className="py-12 text-center text-slate-500">회원이 없습니다.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b">
            <th className="py-2 px-3">이름</th>
            <th className="py-2 px-3">성별</th>
            <th className="py-2 px-3">나이</th>
            <th className="py-2 px-3">주소</th>
            <th className="py-2 px-3">활동</th>
            <th className="py-2 px-3">성향</th>
            <th className="py-2 px-3">편성</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr
              key={m.id}
              onClick={() => onRowClick?.(m)}
              className={`border-b hover:bg-slate-50 cursor-pointer ${m.active_status === 'less_active' ? 'opacity-60' : ''}`}
            >
              <td className="py-2 px-3 font-medium">{m.full_name}</td>
              <td className="py-2 px-3">{genderLabel(m.gender)}</td>
              <td className="py-2 px-3">{computeAge(m.birth_date)}</td>
              <td className="py-2 px-3 text-slate-600 max-w-xs truncate">
                {m.address ?? <span className="text-slate-400 italic">미입력</span>}
                {m.address && m.lat === null && (
                  <span className="ml-2"><Badge tone="orange">주소 미확인</Badge></span>
                )}
              </td>
              <td className="py-2 px-3">
                <Badge tone={m.active_status === 'active' ? 'green' : 'gray'}>
                  {activeLabel(m.active_status)}
                </Badge>
              </td>
              <td className="py-2 px-3 text-slate-600">{personalityLabel(m.personality)}</td>
              <td className="py-2 px-3 text-slate-400">—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
