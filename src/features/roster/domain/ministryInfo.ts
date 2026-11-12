import { ministryLabel, type Board } from '@/features/assignment/domain/board';

/** Which companionship each person serves in and is assigned to, as display labels. */
export interface MinistryInfo {
  /** member id → companionships the person serves in (both organizations) */
  serves: Map<string, string>;
  /** household id → Elders Quorum companionships assigned to the household */
  householdAssigned: Map<string, string>;
  /** member id → Relief Society companionships assigned to the sister */
  memberAssigned: Map<string, string>;
}

function add(map: Map<string, string>, id: string, label: string) {
  const prev = map.get(id);
  map.set(id, prev ? `${prev}, ${label}` : label);
}

export function buildMinistryInfo(eq: Board | undefined, rs: Board | undefined): MinistryInfo {
  const info: MinistryInfo = { serves: new Map(), householdAssigned: new Map(), memberAssigned: new Map() };
  for (const min of eq?.ministries ?? []) {
    const label = ministryLabel(min);
    for (const id of min.companionIds) add(info.serves, id, label);
    for (const id of min.recipientIds) add(info.householdAssigned, id, label);
  }
  for (const min of rs?.ministries ?? []) {
    const label = ministryLabel(min);
    for (const id of min.companionIds) add(info.serves, id, label);
    for (const id of min.recipientIds) add(info.memberAssigned, id, label);
  }
  return info;
}
