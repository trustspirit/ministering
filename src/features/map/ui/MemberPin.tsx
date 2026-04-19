import { computePinStyle, type AssignmentInfo } from '../domain/computePinStyle';
import type { Member } from '@/features/members/types';

export interface MemberPinProps {
  member: Pick<Member, 'id' | 'gender' | 'active_status' | 'full_name'>;
  selected: boolean;
  assignment?: AssignmentInfo;
  onClick?: () => void;
}

export function MemberPin({ member, selected, assignment, onClick }: MemberPinProps) {
  const style = computePinStyle(member, selected, assignment);

  return (
    <button
      onClick={onClick}
      title={member.full_name}
      className="relative block"
      style={{ width: 32, height: 32, opacity: style.opacity }}
    >
      <div
        className="w-full h-full rounded-full border-[3px] shadow flex items-center justify-center text-white text-sm font-bold select-none"
        style={{
          background: style.background,
          borderColor: style.borderColor,
          boxShadow: style.ring
            ? '0 0 0 4px #fbbf24, 0 2px 4px rgba(0,0,0,0.3)'
            : '0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        {member.gender === 'M' ? '♂' : '♀'}
      </div>
      {style.badge && (
        <span
          className="absolute -top-1 -right-1 text-[9px] font-bold text-white px-1 py-px rounded"
          style={{ background: style.badge.background }}
        >
          {style.badge.text}
        </span>
      )}
    </button>
  );
}
