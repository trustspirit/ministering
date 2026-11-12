import Papa from 'papaparse';
import { STATUS_LABEL } from '@/shared/copy';
import type { Member } from '../types';

const HEADERS = [
  'full_name',
  'gender',
  'birth_date',
  'address',
  '연락처',
  'active_status',
  'personality',
  'memo',
  'household_name',
  'household_role',
];

/**
 * Cells starting with = + - @ tab or CR run as formulas in spreadsheets. Such a cell (optionally already
 * starting with apostrophes) gets one extra leading apostrophe; parseMemberCsv removes exactly one again.
 * Papa's own escapeFormulae is not used: its pattern ends in `.*$`, which skips cells with a newline.
 */
const NEEDS_GUARD = /^'*[=+\-@\t\r]/;

function protectCells<T extends Record<string, string>>(row: T): T {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, NEEDS_GUARD.test(v) ? `'${v}` : v]),
  ) as T;
}

export function exportMembersCsv(
  members: Member[],
  householdIdToName: Record<string, string>,
): string {
  const rows = members.map((m) => ({
    full_name: m.full_name,
    gender: m.gender,
    birth_date: m.birth_date,
    address: m.address ?? '',
    연락처: m.phone ?? '',
    active_status: STATUS_LABEL[m.active_status],
    personality: m.personality,
    memo: m.memo ?? '',
    household_name: m.household_id ? (householdIdToName[m.household_id] ?? '') : '',
    household_role: m.household_role,
  }));

  return Papa.unparse({ fields: HEADERS, data: rows.map(protectCells) });
}
