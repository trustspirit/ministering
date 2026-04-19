import { computeHouseholdPinStyle, type HouseholdAssignmentInfo } from '../domain/computeHouseholdPinStyle';
import type { Household } from '@/features/households/types';

export interface HouseholdPinProps {
  household: Pick<Household, 'id' | 'name'>;
  memberCount: number;
  selected: boolean;
  assignment?: HouseholdAssignmentInfo;
  onClick?: () => void;
}

export function HouseholdPin({ household, memberCount, selected, assignment, onClick }: HouseholdPinProps) {
  const style = computeHouseholdPinStyle(selected, assignment);

  return (
    <button
      onClick={onClick}
      title={household.name}
      className="relative block"
      style={{ width: 44, height: 32, opacity: style.opacity }}
    >
      <div
        className="w-full h-full rounded-md border-[3px] shadow flex items-center justify-center text-white text-[11px] font-bold select-none"
        style={{
          background: style.background,
          borderColor: style.borderColor,
          boxShadow: style.ring
            ? '0 0 0 4px #fbbf24, 0 2px 4px rgba(0,0,0,0.3)'
            : '0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        가정
      </div>
      <span className="absolute -top-1 -right-1 text-[9px] font-bold text-white bg-slate-800 px-1 py-px rounded-full">
        {memberCount}
      </span>
      {style.badge && (
        <span
          className="absolute -bottom-1 -right-1 text-[9px] font-bold text-white px-1 py-px rounded"
          style={{ background: style.badge.background }}
        >
          {style.badge.text}
        </span>
      )}
    </button>
  );
}
