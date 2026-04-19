import type { Member } from '@/features/members/types';

export interface PinStyle {
  background: string;
  borderColor: string;
  opacity: number;
  ring: boolean;
}

export function computePinStyle(
  member: Pick<Member, 'gender' | 'active_status'>,
  selected: boolean,
): PinStyle {
  return {
    background: member.gender === 'M' ? '#3b82f6' : '#ec4899',
    borderColor: '#ffffff',
    opacity: member.active_status === 'less_active' ? 0.45 : 1,
    ring: selected,
  };
}
