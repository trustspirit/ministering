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
const c = T.roster.columns;

function MemberItem({ member, info, onEdit }: { member: Member; info: MinistryInfo; onEdit?: (m: Member) => void }) {
  const org = memberOrganization(member);
  const serves = org ? info.serves.get(member.id) : undefined;
  const assigned = org === 'RS' ? info.memberAssigned.get(member.id) : undefined;
  const memo = firstLine(member.memo);
  return (
    <li className="ro-lm">
      <div className="ro-l1">
        <StatusMark status={member.active_status} />
        <b>{member.full_name}</b>
        <span className="ro-mute">
          {computeAge(member.birth_date)}·{GENDER_LABEL[member.gender]}
        </span>
        {member.active_status === 'active' ? (
          <span className="ro-mute">{STATUS_LABEL.active}</span>
        ) : (
          <StatusText status={member.active_status} />
        )}
      </div>
      {onEdit && (
        <button
          type="button"
          className="ro-link ro-lact"
          aria-label={T.roster.editMemberOf(member.full_name)}
          onClick={() => onEdit(member)}
        >
          {T.roster.editMember}
        </button>
      )}
      <div className="ro-l2">
        <span>{org ? ORG_LABEL[org] : T.roster.noOrg}</span>
        {org && <span>{serves ?? dash}</span>}
        {org === 'RS' && (
          <span>
            <i>{c.assigned}</i> {assigned ?? dash}
          </span>
        )}
        {member.phone && (
          <span>
            <Phone phone={member.phone} />
          </span>
        )}
      </div>
      {memo && (
        <p className="ro-lmemo" title={member.memo ?? undefined}>
          {memo}
        </p>
      )}
    </li>
  );
}

/** Roster below 1024px (phone and tablet): the table's rows stacked as a list, with the same data and edit links. */
export function RosterList({ groups, info, onEditMember, onEditHousehold }: RosterViewProps) {
  return (
    <div className="ro-list" role="region" aria-label={T.roster.tableLabel}>
      {groups.map((g) => {
        const hh = g.household;
        const assigned = hh ? info.householdAssigned.get(hh.id) : undefined;
        const memo = hh ? firstLine(hh.memo) : '';
        return (
          <section key={hh?.id ?? 'none'} className="ro-lgroup">
            <header className="ro-lhh">
              <div className="ro-l1">
                <h3>{hh?.name ?? T.roster.noHouseholdGroup}</h3>
              </div>
              {hh && onEditHousehold && (
                <button
                  type="button"
                  className="ro-link ro-lact"
                  aria-label={T.roster.editHouseholdOf(hh.name)}
                  onClick={() => onEditHousehold(hh)}
                >
                  {T.roster.editHousehold}
                </button>
              )}
              <div className="ro-l2">
                <span>{[hh?.address, T.roster.headcount(g.members.length)].filter(Boolean).join(' · ')}</span>
                {hh && (
                  <span>
                    <i>{c.assigned}</i> {assigned ?? dash}
                  </span>
                )}
              </div>
              {memo && (
                <p className="ro-lmemo" title={hh?.memo ?? undefined}>
                  {memo}
                </p>
              )}
            </header>
            <ul>
              {g.members.map((m) => (
                <MemberItem key={m.id} member={m} info={info} onEdit={onEditMember} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
