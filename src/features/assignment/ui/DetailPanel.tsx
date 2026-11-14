import { useEffect } from 'react';
import { useUpdateHousehold } from '@/features/households/hooks/useHouseholdMutations';
import type { Household } from '@/features/households/types';
import { computeAge } from '@/features/members/domain/computeAge';
import { useUpdateMember } from '@/features/members/hooks/useMemberMutations';
import type { Member } from '@/features/members/types';
import { GENDER_LABEL, ORG_LABEL, PERSONALITY_LABEL, STATUS_LABEL, T } from '@/shared/copy';
import { usePermission } from '@/shared/auth/usePermission';
import { ministryLabel, type Board } from '../domain/board';
import { sortFamily } from '../domain/familyOrder';
import { useAssignmentBoard } from '../hooks/useAssignmentBoard';
import { useWorkspaceStore } from '../store';
import { useWorkspace, type WorkspaceData } from '../workspaceContext';
import { MemoEditor } from './MemoEditor';
import { StatusMark } from './StatusMark';

type Boards = Partial<Record<'EQ' | 'RS', Board | undefined>>;

const dash = T.detail.none;

function Phone({ phone }: { phone: string | null }) {
  return phone ? <a href={`tel:${phone}`}>{phone}</a> : <>{dash}</>;
}

function namesOf(ids: string[], memberById: WorkspaceData['memberById']): string {
  return ids.map((id) => memberById.get(id)?.full_name).filter(Boolean).join(', ') || T.detail.noNames;
}

/** Brothers assigned to a household, one entry per ministry that covers it. */
function householdMinistries(eq: Board | undefined, householdId: string) {
  return (eq?.ministries ?? []).filter((m) => m.recipientIds.includes(householdId));
}

function assignmentLines(m: Member, boards: Boards, memberById: WorkspaceData['memberById']): string[] {
  const lines: string[] = [];
  for (const org of ['EQ', 'RS'] as const) {
    for (const min of boards[org]?.ministries ?? []) {
      const label = ministryLabel(min);
      if (min.companionIds.includes(m.id)) lines.push(T.detail.servesIn(ORG_LABEL[org], label));
      if (org === 'RS' && min.recipientIds.includes(m.id)) {
        lines.push(T.detail.assignedSisterMinistry(namesOf(min.companionIds, memberById), label));
      }
      if (org === 'EQ' && m.household_id && min.recipientIds.includes(m.household_id)) {
        lines.push(T.detail.householdBrotherMinistry(namesOf(min.companionIds, memberById), label));
      }
    }
  }
  return lines;
}

function HouseholdDetail({
  household,
  boards,
  canEdit,
}: {
  household: Household;
  boards: Boards;
  canEdit: boolean;
}) {
  const { familyOf, memberById } = useWorkspace();
  const updateHousehold = useUpdateHousehold();
  const updateMember = useUpdateMember();
  const family = sortFamily(familyOf.get(household.id) ?? []);
  const ministries = householdMinistries(boards.EQ, household.id);
  const brothers = ministries.length
    ? T.detail.assignedBrothers(
        ministries.map((min) => namesOf(min.companionIds, memberById)).join(', '),
      )
    : T.detail.noRecipientMinistry;

  return (
    <div className="aw-cols">
      <div>
        <p className="aw-eye">{T.detail.household}</p>
        <h2>{household.name}</h2>
        <div className="aw-meta">
          {household.address || dash} · {brothers}
        </div>
        {family.length > 0 && (
          <table className="aw-fm">
            <thead className="aw-sr">
              <tr>
                {T.detail.familyHead.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {family.map((m) => (
                <tr key={m.id}>
                  <td>
                    <StatusMark status={m.active_status} />
                    <b>{m.full_name}</b>
                  </td>
                  <td>{T.detail.ageUnit(computeAge(m.birth_date))}</td>
                  <td>{GENDER_LABEL[m.gender]}</td>
                  <td>{STATUS_LABEL[m.active_status]}</td>
                  <td>
                    <Phone phone={m.phone} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div>
        <MemoEditor
          label={T.detail.householdMemo}
          value={household.memo}
          canEdit={canEdit}
          onSave={async (text) => {
            await updateHousehold.mutateAsync({
              id: household.id,
              patch: { memo: text || null },
              previousAddress: household.address,
            });
          }}
        />
        {family
          .filter((m) => m.memo)
          .map((m) => (
            <MemoEditor
              key={m.id}
              label={T.detail.memoOf(m.full_name)}
              value={m.memo}
              canEdit={canEdit}
              onSave={async (text) => {
                await updateMember.mutateAsync({
                  id: m.id,
                  patch: { memo: text || null },
                });
              }}
            />
          ))}
      </div>
    </div>
  );
}

function MemberDetail({ member, boards, canEdit }: { member: Member; boards: Boards; canEdit: boolean }) {
  const { householdById, familyOf, memberById } = useWorkspace();
  const updateHousehold = useUpdateHousehold();
  const updateMember = useUpdateMember();
  const household = member.household_id ? householdById.get(member.household_id) : undefined;
  const family = household ? sortFamily(familyOf.get(household.id) ?? []) : [];
  const lines = assignmentLines(member, boards, memberById);

  return (
    <div className="aw-cols">
      <div>
        <p className="aw-eye">{member.gender === 'M' ? T.detail.brother : T.detail.sister}</p>
        <h2>{member.full_name}</h2>
        <div className="aw-meta">
          {[
            T.detail.ageUnit(computeAge(member.birth_date)),
            GENDER_LABEL[member.gender],
            STATUS_LABEL[member.active_status],
            PERSONALITY_LABEL[member.personality],
            household?.address || dash,
          ].join(' · ')}
          {' · '}
          <Phone phone={member.phone} />
        </div>
        <dl className="aw-kv">
          <dt>{T.detail.ministryHeading}</dt>
          <dd>
            {lines.length
              ? lines.map((l) => <div key={l}>{l}</div>)
              : T.detail.noAssignment}
          </dd>
          <dt>{T.detail.householdHeading}</dt>
          <dd>
            {household
              ? `${household.name} — ${family.map((f) => f.full_name).join(', ')}`
              : T.detail.noHousehold}
          </dd>
        </dl>
      </div>
      <div>
        <MemoEditor
          label={T.detail.personalMemo}
          value={member.memo}
          canEdit={canEdit}
          onSave={async (text) => {
            await updateMember.mutateAsync({
              id: member.id,
              patch: { memo: text || null },
            });
          }}
        />
        {household && (
          <MemoEditor
            label={T.detail.householdMemo}
            value={household.memo}
            canEdit={canEdit}
            onSave={async (text) => {
              await updateHousehold.mutateAsync({
                id: household.id,
                patch: { memo: text || null },
                previousAddress: household.address,
              });
            }}
          />
        )}
      </div>
    </div>
  );
}

/** Background information for the selected person or household (bottom of the right column). */
export function DetailPanel() {
  const { householdById, memberById } = useWorkspace();
  const selected = useWorkspaceStore((s) => s.selected);
  const setSelected = useWorkspaceStore((s) => s.setSelected);
  const { canEditMembers } = usePermission();
  // Both boards, so every assignment of a person shows whichever screen is open.
  const eq = useAssignmentBoard('EQ').data;
  const rs = useAssignmentBoard('RS').data;
  const boards: Boards = { EQ: eq, RS: rs };

  const household = selected?.kind === 'household' ? householdById.get(selected.id) : undefined;
  const member = selected?.kind === 'member' ? memberById.get(selected.id) : undefined;
  const missing = selected !== null && !household && !member;
  // The record was deleted by someone else.
  useEffect(() => {
    if (missing) setSelected(null);
  }, [missing, setSelected]);

  return (
    <section className="aw-detail" aria-label={T.detail.label}>
      {household ? (
        <HouseholdDetail key={household.id} household={household} boards={boards} canEdit={canEditMembers} />
      ) : member ? (
        <MemberDetail key={member.id} member={member} boards={boards} canEdit={canEditMembers} />
      ) : (
        <>
          <p className="aw-eye">{T.detail.label}</p>
          <p className="aw-detail-empty">{T.detail.empty}</p>
        </>
      )}
    </section>
  );
}
