import type { PinBadge } from './computePinStyle';

export interface HouseholdPinStyle {
  background: string;
  borderColor: string;
  opacity: number;
  ring: boolean;
  badge?: PinBadge;
}

export interface HouseholdAssignmentInfo {
  role: 'recipient';
  ministryNumber: number;
}

export function computeHouseholdPinStyle(
  selected: boolean,
  assignment?: HouseholdAssignmentInfo,
): HouseholdPinStyle {
  const base: HouseholdPinStyle = {
    background: '#6366f1',
    borderColor: '#ffffff',
    opacity: 1,
    ring: selected,
  };

  if (!assignment) return base;

  return {
    ...base,
    borderColor: '#f59e0b',
    badge: { text: '조', background: '#f59e0b' },
  };
}
