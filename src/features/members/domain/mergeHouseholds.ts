import type { ParsedMemberRow } from './parseMemberCsv';

export interface HouseholdPlan {
  toCreate: Array<{ name: string; address: string | null }>;
  existingNameToId: Record<string, string>;
}

export interface ExistingHousehold {
  id: string;
  name: string;
}

/**
 * The CSV household a row belongs to. A row without household_name but with an address gets a household of its own:
 * an address is stored only on a household, so otherwise it would be lost.
 */
export function householdKey(row: Pick<ParsedMemberRow, 'household_name' | 'address' | 'full_name'>): string | null {
  return row.household_name ?? (row.address ? `${row.full_name} 가정` : null);
}

export function extractHouseholdPlan(
  rows: ParsedMemberRow[],
  existing: ExistingHousehold[],
): HouseholdPlan {
  const existingNameToId: Record<string, string> = {};
  for (const h of existing) existingNameToId[h.name] = h.id;

  const toCreateMap = new Map<string, { name: string; address: string | null }>();
  for (const row of rows) {
    const key = householdKey(row);
    if (!key) continue;
    if (existingNameToId[key]) continue;
    if (toCreateMap.has(key)) continue;
    toCreateMap.set(key, { name: key, address: row.address });
  }

  return {
    toCreate: Array.from(toCreateMap.values()),
    existingNameToId,
  };
}
