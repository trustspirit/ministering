import type { Household } from '@/features/households/types';
import type { Member } from '@/features/members/types';
import { ministryOf, type Board } from './board';
import { isOrgMember } from './orgMembership';

/** One pin on the assignment map. */
export interface MapItem {
  kind: 'member' | 'household';
  id: string;
  lat: number;
  lng: number;
  label: string;
  /** Number of the ministry this member serves in as a companion. */
  companionNo: number | null;
  /** Number of the ministry assigned to this household (EQ) or sister (RS). */
  recipientNo: number | null;
  lessActive: boolean;
  newMember: boolean;
}

type Coords = { lat: number | null; lng: number | null };

function coordsOf(...candidates: (Coords | undefined)[]): { lat: number; lng: number } | null {
  for (const c of candidates) {
    if (c && c.lat !== null && c.lng !== null) return { lat: c.lat, lng: c.lng };
  }
  return null;
}

/**
 * Pins for the board's organization: EQ = households + EQ members, RS = RS members. A member
 * without coordinates takes their household's; anything still without coordinates is left out.
 */
export function buildMapItems({
  board,
  members,
  households,
  today,
}: {
  board: Board;
  members: Member[];
  households: Household[];
  today?: Date;
}): MapItem[] {
  const items: MapItem[] = [];
  const numberOf = (id: string, role: 'companion' | 'recipient') =>
    ministryOf(board, id, role)?.number ?? null;

  if (board.organization === 'EQ') {
    for (const h of households) {
      const at = coordsOf(h);
      if (!at) continue;
      items.push({
        kind: 'household',
        id: h.id,
        ...at,
        label: h.name,
        companionNo: null,
        recipientNo: numberOf(h.id, 'recipient'),
        lessActive: false,
        newMember: false,
      });
    }
  }

  const householdById = new Map(households.map((h) => [h.id, h]));
  for (const m of members) {
    if (!isOrgMember(m, board.organization, today)) continue;
    const at = coordsOf(m, m.household_id ? householdById.get(m.household_id) : undefined);
    if (!at) continue;
    items.push({
      kind: 'member',
      id: m.id,
      ...at,
      label: m.full_name,
      companionNo: numberOf(m.id, 'companion'),
      // EQ recipients are households, so a member is never one there.
      recipientNo: board.organization === 'RS' ? numberOf(m.id, 'recipient') : null,
      lessActive: m.active_status === 'less_active',
      newMember: m.active_status === 'new_member',
    });
  }
  return items;
}

/** Companion × recipient pairs of the highlighted ministry, both ends on the map. */
export function hotLines(
  board: Board,
  hotMinistryId: string | null,
  items: MapItem[],
): { from: MapItem; to: MapItem }[] {
  const ministry = hotMinistryId ? board.ministries.find((m) => m.id === hotMinistryId) : undefined;
  if (!ministry) return [];
  const byKey = new Map(items.map((i) => [`${i.kind}:${i.id}`, i]));
  const recipientKind = board.organization === 'EQ' ? 'household' : 'member';
  const lines: { from: MapItem; to: MapItem }[] = [];
  for (const c of ministry.companionIds) {
    const from = byKey.get(`member:${c}`);
    if (!from) continue;
    for (const r of ministry.recipientIds) {
      const to = byKey.get(`${recipientKind}:${r}`);
      if (to) lines.push({ from, to });
    }
  }
  return lines;
}
