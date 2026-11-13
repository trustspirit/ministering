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
  const serves = org ? (info.serves.get(member.id) ?? dash) : dash;
  const assigned = org === 'RS' ? (info.memberAssigned.get(member.id) ?? dash) : '';
  // ro-cut cells may be shortened with an ellipsis on narrow windows; the title keeps the full text
  return (
    <tr className="ro-mem">
      <td className="ro-ind ro-c-name ro-cut" title={member.full_name}>
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
      <td className="ro-c-label ro-cut" title={serves}>
        {serves}
      </td>
      <td className="ro-c-label ro-cut" title={assigned || undefined}>
        {assigned}
      </td>
      <td className="ro-c-tel ro-cut">
        <Phone phone={member.phone} />
      </td>
      <td className="ro-memo ro-c-memo ro-cut" title={member.memo ?? undefined}>
        {firstLine(member.memo)}
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

/** Roster table (1024px and wider; phones and tablets get the stacked list). Below 1280px it has a fixed layout that always fits its container: the memo shortens first, then the phone number, then the companionship columns. */
export function RosterTable({ groups, info, onEditMember, onEditHousehold }: RosterViewProps) {
  const c = T.roster.columns;
  return (
    <table className="ro-table" aria-label={T.roster.tableLabel}>
      <thead>
        <tr>
          {/* column classes set the widths on narrow windows (roster.css) */}
          <th scope="col" className="ro-c-name">{c.name}</th>
          <th scope="col" className="ro-c-age">{c.age}</th>
          <th scope="col" className="ro-c-gender">{c.gender}</th>
          <th scope="col" className="ro-c-status">{c.status}</th>
          <th scope="col" className="ro-c-org">{c.org}</th>
          <th scope="col" className="ro-c-label">{c.serves}</th>
          <th scope="col" className="ro-c-label">{c.assigned}</th>
          <th scope="col" className="ro-c-tel">{c.phone}</th>
          <th scope="col" className="ro-c-memo">{c.memo}</th>
          <th scope="col" className="ro-c-act" />
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
                <td className="ro-c-label ro-cut" title={info.householdAssigned.get(g.household.id)}>
                  {info.householdAssigned.get(g.household.id) ?? dash}
                </td>
                <td />
                <td className="ro-memo ro-c-memo ro-cut" title={g.household.memo ?? undefined}>
                  {firstLine(g.household.memo)}
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
