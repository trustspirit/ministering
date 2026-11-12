import { Fragment } from 'react';
import { memberOrganization } from '@/features/assignment/domain/orgMembership';
import { StatusMark, StatusText } from '@/features/assignment/ui/StatusMark';
import { computeAge } from '@/features/members/domain/computeAge';
import type { Member } from '@/features/members/types';
import { GENDER_LABEL, ORG_LABEL, STATUS_LABEL, T } from '@/shared/copy';
import type { MinistryInfo } from '../domain/ministryInfo';
import { Phone, type RosterViewProps } from './rosterCells';
import { firstLine } from './text';
import './roster.css';

const dash = T.roster.noValue;

function MemberRow({
  member,
  info,
  onEdit,
}: {
  member: Member;
  info: MinistryInfo;
  onEdit?: (member: Member) => void;
}) {
  const org = memberOrganization(member);
  return (
    <tr className="ro-mem">
      <td className="ro-ind">
        <StatusMark status={member.active_status} />
        {member.full_name}
      </td>
      <td>{computeAge(member.birth_date)}</td>
      <td>{GENDER_LABEL[member.gender]}</td>
      <td>
        {member.active_status === 'active' ? (
          STATUS_LABEL.active
        ) : (
          <StatusText status={member.active_status} />
        )}
      </td>
      <td>{org ? ORG_LABEL[org] : T.roster.noOrg}</td>
      <td>{org ? (info.serves.get(member.id) ?? dash) : dash}</td>
      <td>{org === 'RS' ? (info.memberAssigned.get(member.id) ?? dash) : ''}</td>
      <td>
        <Phone phone={member.phone} />
      </td>
      <td className="ro-memo" title={member.memo ?? undefined}>
        <span className="ro-fit">{firstLine(member.memo)}</span>
      </td>
      <td className="ro-act">
        {onEdit && (
          <button
            type="button"
            className="ro-link"
            aria-label={T.roster.editMemberOf(member.full_name)}
            onClick={() => onEdit(member)}
          >
            {T.roster.editMember}
          </button>
        )}
      </td>
    </tr>
  );
}

/** Roster table (tablet and wider). Narrow windows shorten the memo with an ellipsis instead of scrolling. */
export function RosterTable({ groups, info, onEditMember, onEditHousehold }: RosterViewProps) {
  const c = T.roster.columns;
  return (
    <table className="ro-table" aria-label={T.roster.tableLabel}>
      <thead>
        <tr>
          <th scope="col">{c.name}</th>
          <th scope="col">{c.age}</th>
          <th scope="col">{c.gender}</th>
          <th scope="col">{c.status}</th>
          <th scope="col">{c.org}</th>
          <th scope="col">{c.serves}</th>
          <th scope="col">{c.assigned}</th>
          <th scope="col">{c.phone}</th>
          <th scope="col">{c.memo}</th>
          <th scope="col" />
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => (
          <Fragment key={g.household?.id ?? 'none'}>
            {g.household ? (
              <tr className="ro-hh">
                <th scope="rowgroup" colSpan={6}>
                  <b>{g.household.name}</b>
                  <span className="ro-sub">
                    {[g.household.address, T.roster.headcount(g.members.length)].filter(Boolean).join(' · ')}
                  </span>
                </th>
                <td>{info.householdAssigned.get(g.household.id) ?? dash}</td>
                <td />
                <td className="ro-memo" title={g.household.memo ?? undefined}>
                  <span className="ro-fit">{firstLine(g.household.memo)}</span>
                </td>
                <td className="ro-act">
                  {onEditHousehold && (
                    <button
                      type="button"
                      className="ro-link"
                      aria-label={T.roster.editHouseholdOf(g.household.name)}
                      onClick={() => onEditHousehold(g.household!)}
                    >
                      {T.roster.editHousehold}
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              <tr className="ro-hh">
                <th scope="rowgroup" colSpan={10}>
                  <b>{T.roster.noHouseholdGroup}</b>
                  <span className="ro-sub">{T.roster.headcount(g.members.length)}</span>
                </th>
              </tr>
            )}
            {g.members.map((m) => (
              <MemberRow key={m.id} member={m} info={info} onEdit={onEditMember} />
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
