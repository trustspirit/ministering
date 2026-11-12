import type { Household } from '@/features/households/types';
import type { Member } from '@/features/members/types';
import { T } from '@/shared/copy';
import type { RosterGroup } from '../domain/groupRoster';
import type { MinistryInfo } from '../domain/ministryInfo';

/** Shared by the roster table (tablet and wider) and the stacked phone list. */
export interface RosterViewProps {
  groups: RosterGroup[];
  info: MinistryInfo;
  /** Edit links show only when set (viewers get none). */
  onEditMember?: (member: Member) => void;
  onEditHousehold?: (household: Household) => void;
}

export function Phone({ phone }: { phone: string | null }) {
  return phone ? (
    <a href={`tel:${phone}`} title={phone}>
      {phone}
    </a>
  ) : (
    <>{T.roster.noValue}</>
  );
}
