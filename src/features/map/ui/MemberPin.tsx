import { computePinStyle } from '../domain/computePinStyle';
import type { Member } from '@/features/members/types';

export interface MemberPinProps {
  member: Pick<Member, 'id' | 'gender' | 'active_status' | 'full_name'>;
  selected: boolean;
  onClick?: () => void;
}

export function MemberPin({ member, selected, onClick }: MemberPinProps) {
  const style = computePinStyle(member, selected);

  return (
    <button
      onClick={onClick}
      title={member.full_name}
      className="relative block"
      style={{
        width: 32,
        height: 32,
        opacity: style.opacity,
      }}
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
    </button>
  );
}
