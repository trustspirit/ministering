import type { ParsedMemberRow } from './parseMemberCsv';

export interface HouseholdPlan {
  toCreate: Array<{ name: string; address: string | null }>;
  existingNameToId: Record<string, string>;
}

export interface ExistingHousehold {
  id: string;
  name: string;
}

export function extractHouseholdPlan(
  rows: ParsedMemberRow[],
  existing: ExistingHousehold[],
): HouseholdPlan {
  const existingNameToId: Record<string, string> = {};
  for (const h of existing) existingNameToId[h.name] = h.id;

  const toCreateMap = new Map<string, { name: string; address: string | null }>();
  for (const row of rows) {
    if (!row.household_name) continue;
    if (existingNameToId[row.household_name]) continue;
    if (toCreateMap.has(row.household_name)) continue;
    toCreateMap.set(row.household_name, {
      name: row.household_name,
      address: row.address,
    });
  }

  return {
    toCreate: Array.from(toCreateMap.values()),
    existingNameToId,
  };
}
