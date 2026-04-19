import type { Member } from '@/features/members/types';

export interface PinBadge {
  text: string;
  background: string;
}

export interface PinStyle {
  background: string;
  borderColor: string;
  opacity: number;
  ring: boolean;
  badge?: PinBadge;
}

export interface AssignmentInfo {
  role: 'companion' | 'recipient';
  ministryNumber: number;
}

export function computePinStyle(
  member: Pick<Member, 'gender' | 'active_status'>,
  selected: boolean,
  assignment?: AssignmentInfo,
): PinStyle {
  const base: PinStyle = {
    background: member.gender === 'M' ? '#3b82f6' : '#ec4899',
    borderColor: '#ffffff',
    opacity: member.active_status === 'less_active' ? 0.45 : 1,
    ring: selected,
  };

  if (!assignment) return base;

  if (assignment.role === 'companion') {
    return {
      ...base,
      borderColor: '#10b981',
      badge: { text: '동', background: '#10b981' },
    };
  }

  return {
    ...base,
    borderColor: '#f59e0b',
    badge: { text: '조', background: '#f59e0b' },
  };
}
