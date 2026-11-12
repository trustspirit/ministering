import { computeAge } from '@/features/members/domain/computeAge';
import type { Member } from '@/features/members/types';
import type { Organization } from '@/features/ministries/types';

type OrgInput = Pick<Member, 'gender' | 'birth_date'>;

const MIN_AGE = 18;

export function memberOrganization(
  m: OrgInput,
  today: Date = new Date(),
): Organization | null {
  if (computeAge(m.birth_date, today) < MIN_AGE) return null;
  return m.gender === 'M' ? 'EQ' : 'RS';
}

export function isOrgMember(
  m: OrgInput,
  org: Organization,
  today: Date = new Date(),
): boolean {
  return memberOrganization(m, today) === org;
}
