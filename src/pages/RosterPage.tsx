import { useMemo, useState } from 'react';
import { EmptyState, Select, Spinner, TextField } from 'trust-ui-react';
import { memberOrganization } from '@/features/assignment/domain/orgMembership';
import { useAssignmentBoard } from '@/features/assignment/hooks/useAssignmentBoard';
import { StatusMark } from '@/features/assignment/ui/StatusMark';
import { useHouseholds } from '@/features/households/hooks/useHouseholds';
import type { Household } from '@/features/households/types';
import { exportMembersCsv } from '@/features/members/domain/exportMembersCsv';
import { useMembers } from '@/features/members/hooks/useMembers';
import { useMemberFilterStore } from '@/features/members/store';
import type { ActiveStatus, Gender, Member, Personality } from '@/features/members/types';
import { CsvImportModal } from '@/features/members/ui/CsvImportModal';
import { groupRoster } from '@/features/roster/domain/groupRoster';
import { buildMinistryInfo } from '@/features/roster/domain/ministryInfo';
import { HouseholdFormDialog } from '@/features/roster/ui/HouseholdFormDialog';
import { MemberFormDialog } from '@/features/roster/ui/MemberFormDialog';
import { RosterTable } from '@/features/roster/ui/RosterTable';
import '@/features/roster/ui/roster.css';
import { usePermission } from '@/shared/auth/usePermission';
import { useRealtimeSync } from '@/shared/hooks/useRealtimeSync';
import { GENDER_LABEL, ORG_LABEL, PERSONALITY_LABEL, STATUS_LABEL, T } from '@/shared/copy';
import '@/shared/ui/subbar.css';

const REALTIME_TABLES = [
  'members',
  'households',
  'ministries',
  'ministry_companions',
  'ministry_member_recipients',
  'ministry_household_recipients',
] as const;

const STATUSES: ActiveStatus[] = ['active', 'less_active', 'new_member'];

const filterOptions = <K extends string>(all: string, labels: Record<K, string>) => [
  { value: 'all', label: all },
  ...(Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] })),
];

type Dialogs =
  | { kind: 'none' }
  | { kind: 'member'; member: Member | null }
  | { kind: 'household'; household: Household };

function downloadCsv(csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RosterPage() {
  useRealtimeSync([...REALTIME_TABLES], 'roster');

  const membersQuery = useMembers();
  const householdsQuery = useHouseholds();
  const eq = useAssignmentBoard('EQ').data;
  const rs = useAssignmentBoard('RS').data;
  const { canEditMembers } = usePermission();

  const search = useMemberFilterStore((s) => s.search);
  const gender = useMemberFilterStore((s) => s.gender);
  const activeStatus = useMemberFilterStore((s) => s.activeStatus);
  const personality = useMemberFilterStore((s) => s.personality);
  const setSearch = useMemberFilterStore((s) => s.setSearch);
  const setGender = useMemberFilterStore((s) => s.setGender);
  const setActiveStatus = useMemberFilterStore((s) => s.setActiveStatus);
  const setPersonality = useMemberFilterStore((s) => s.setPersonality);

  const [dialog, setDialog] = useState<Dialogs>({ kind: 'none' });
  const [csvOpen, setCsvOpen] = useState(false);

  const members = membersQuery.data;
  const households = householdsQuery.data;

  const groups = useMemo(
    () =>
      members && households
        ? groupRoster(members, households, { search, gender, activeStatus, personality })
        : [],
    [members, households, search, gender, activeStatus, personality],
  );
  const info = useMemo(() => buildMinistryInfo(eq, rs), [eq, rs]);
  const counts = useMemo(() => {
    const list = members ?? [];
    const orgOf = list.map((m) => memberOrganization(m));
    return {
      eq: orgOf.filter((o) => o === 'EQ').length,
      rs: orgOf.filter((o) => o === 'RS').length,
    };
  }, [members]);

  if (!members || !households) {
    const failed = membersQuery.isError || householdsQuery.isError;
    return (
      <div className="ro">
        {failed ? (
          <p className="ro-status-msg">{T.roster.loadFailed}</p>
        ) : (
          <div className="app-loading">
            <Spinner size="sm" label={T.roster.loading} showLabel />
          </div>
        )}
      </div>
    );
  }

  const exportCsv = () => {
    const names: Record<string, string> = {};
    for (const h of households) names[h.id] = h.name;
    // Exactly the people the table lists.
    downloadCsv(exportMembersCsv(groups.flatMap((g) => g.members), names));
  };

  return (
    <div className="ro">
      <div className="aw-sub">
        <span className="aw-sum">
          <span>
            {T.roster.countHouseholds} <b>{households.length}</b>
          </span>
          <span>
            {T.roster.countMembers} <b>{members.length}</b>
          </span>
          <span>
            {ORG_LABEL.EQ} {T.roster.countMembers} <b>{counts.eq}</b>
          </span>
          <span>
            {ORG_LABEL.RS} {T.roster.countMembers} <b>{counts.rs}</b>
          </span>
        </span>
        <ul className="aw-legend" aria-label={T.assign.legendLabel}>
          {STATUSES.map((st) => (
            <li key={st}>
              <StatusMark status={st} />
              {STATUS_LABEL[st]}
            </li>
          ))}
        </ul>
      </div>

      <div className="ro-tools" role="group" aria-label={T.roster.toolsLabel}>
        <div className="ro-search">
          <TextField
            type="search"
            size="sm"
            fullWidth
            placeholder={T.roster.search}
            aria-label={T.roster.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="ro-filter">
          <Select
            size="sm"
            fullWidth
            aria-label={T.roster.statusFilter}
            value={activeStatus}
            options={filterOptions(T.roster.statusAll, STATUS_LABEL)}
            onChange={(v) => setActiveStatus(v as ActiveStatus | 'all')}
          />
        </div>
        <div className="ro-filter">
          <Select
            size="sm"
            fullWidth
            aria-label={T.roster.genderFilter}
            value={gender}
            options={filterOptions(T.roster.genderAll, GENDER_LABEL)}
            onChange={(v) => setGender(v as Gender | 'all')}
          />
        </div>
        <div className="ro-filter">
          <Select
            size="sm"
            fullWidth
            aria-label={T.roster.personalityFilter}
            value={personality}
            options={filterOptions(T.roster.personalityAll, PERSONALITY_LABEL)}
            onChange={(v) => setPersonality(v as Personality | 'all')}
          />
        </div>
        <span className="ro-sp" />
        {canEditMembers && (
          <button type="button" className="ro-btn" onClick={() => setCsvOpen(true)}>
            {T.roster.csvImport}
          </button>
        )}
        <button type="button" className="ro-btn" onClick={exportCsv} disabled={groups.length === 0}>
          {T.roster.csvExport}
        </button>
        {canEditMembers && (
          <button
            type="button"
            className="ro-btn ro-btn--pri"
            onClick={() => setDialog({ kind: 'member', member: null })}
          >
            {T.roster.addPerson}
          </button>
        )}
      </div>

      <div className="ro-scroll">
        {members.length === 0 || groups.length === 0 ? (
          <EmptyState
            className="app-empty"
            headingLevel={2}
            title={members.length === 0 ? T.roster.emptyAll : T.roster.empty}
            description={members.length === 0 && canEditMembers ? T.roster.emptyAllHint : undefined}
          />
        ) : (
          <RosterTable
            groups={groups}
            info={info}
            onEditMember={canEditMembers ? (member) => setDialog({ kind: 'member', member }) : undefined}
            onEditHousehold={canEditMembers ? (household) => setDialog({ kind: 'household', household }) : undefined}
          />
        )}
      </div>

      {canEditMembers && (
        <>
          <MemberFormDialog
            key={dialog.kind === 'member' ? (dialog.member?.id ?? 'new') : 'closed'}
            open={dialog.kind === 'member'}
            member={dialog.kind === 'member' ? dialog.member : null}
            households={households}
            onClose={() => setDialog({ kind: 'none' })}
          />
          {dialog.kind === 'household' && (
            <HouseholdFormDialog
              key={dialog.household.id}
              open
              household={dialog.household}
              onClose={() => setDialog({ kind: 'none' })}
            />
          )}
          <CsvImportModal open={csvOpen} onClose={() => setCsvOpen(false)} />
        </>
      )}
    </div>
  );
}
