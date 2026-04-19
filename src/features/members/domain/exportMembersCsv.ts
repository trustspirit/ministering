import Papa from 'papaparse';
import type { Member } from '../types';

const HEADERS = [
  'full_name',
  'gender',
  'birth_date',
  'address',
  'active_status',
  'personality',
  'memo',
  'household_name',
  'household_role',
];

export function exportMembersCsv(
  members: Member[],
  householdIdToName: Record<string, string>,
): string {
  const rows = members.map((m) => ({
    full_name: m.full_name,
    gender: m.gender,
    birth_date: m.birth_date,
    address: m.address ?? '',
    active_status: m.active_status,
    personality: m.personality,
    memo: m.memo ?? '',
    household_name: m.household_id ? (householdIdToName[m.household_id] ?? '') : '',
    household_role: m.household_role,
  }));

  return Papa.unparse({ fields: HEADERS, data: rows });
}
