import type { Household } from '@/features/households/types';
import { filterMembers, type FilterSnapshot } from '@/features/members/store';
import type { Member } from '@/features/members/types';
import { sortFamily } from '@/features/assignment/domain/familyOrder';

/** household null = '가정 미지정' (people without a household). */
export interface RosterGroup {
  household: Household | null;
  members: Member[];
}

const byName = (a: Household, b: Household) => a.name.localeCompare(b.name, 'ko');

/**
 * Households by name with their members in family order. A household shows when any member passes the
 * filter, or when the search text matches the household's own name or address (then every member that
 * passes the other filters is listed). With no filter at all, households without members show too.
 * People without a household come last, only when there are any.
 */
export function groupRoster(
  members: Member[],
  households: Household[],
  filter: FilterSnapshot,
): RosterGroup[] {
  const q = filter.search.trim().toLowerCase();
  const otherFilters = { ...filter, search: '' };
  const otherFiltersActive =
    filter.gender !== 'all' || filter.activeStatus !== 'all' || filter.personality !== 'all';
  const unfiltered = !q && !otherFiltersActive;

  const known = new Set(households.map((h) => h.id));
  const familyOf = new Map<string, Member[]>();
  const loose: Member[] = [];
  for (const m of members) {
    if (m.household_id && known.has(m.household_id)) {
      const list = familyOf.get(m.household_id);
      if (list) list.push(m);
      else familyOf.set(m.household_id, [m]);
    } else {
      loose.push(m);
    }
  }

  const groups: RosterGroup[] = [];
  for (const h of [...households].sort(byName)) {
    const family = familyOf.get(h.id) ?? [];
    const householdMatch =
      q !== '' && (h.name.toLowerCase().includes(q) || (h.address ?? '').toLowerCase().includes(q));
    const shown = sortFamily(filterMembers(family, householdMatch ? otherFilters : filter));
    if (shown.length > 0 || unfiltered || (householdMatch && !otherFiltersActive)) {
      groups.push({ household: h, members: shown });
    }
  }

  const shownLoose = filterMembers(loose, filter);
  if (shownLoose.length > 0) groups.push({ household: null, members: sortFamily(shownLoose) });
  return groups;
}
