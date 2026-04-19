import { useEffect, useMemo, useState } from 'react';
import { Map, CustomOverlayMap } from 'react-kakao-maps-sdk';
import { loadKakaoMapsSdk } from '@/shared/lib/kakaoSdk';
import { MemberPin } from './MemberPin';
import { HouseholdPin } from './HouseholdPin';
import { useSelectionStore } from '../store';
import { useHouseholdSelectionStore } from '../householdSelectionStore';
import type { Member } from '@/features/members/types';
import type { Household } from '@/features/households/types';
import type { AssignmentIndex } from '@/features/ministries/hooks/useAssignmentIndex';

export interface AssignmentMapViewProps {
  members: Member[];
  households?: Household[];
  assignmentIndex: AssignmentIndex;
  showHouseholds?: boolean;
}

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 };

export function AssignmentMapView({
  members,
  households = [],
  assignmentIndex,
  showHouseholds = false,
}: AssignmentMapViewProps) {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const { selectedIds, toggle: toggleMember } = useSelectionStore();
  const { selectedHouseholdIds, toggle: toggleHousehold } = useHouseholdSelectionStore();

  useEffect(() => {
    loadKakaoMapsSdk()
      .then(() => setSdkReady(true))
      .catch((err) => setSdkError(err instanceof Error ? err.message : String(err)));
  }, []);

  const pinnedMembers = useMemo(
    () => members.filter((m) => m.lat !== null && m.lng !== null),
    [members],
  );

  const pinnedHouseholds = useMemo(
    () => (showHouseholds ? households.filter((h) => h.lat !== null && h.lng !== null) : []),
    [households, showHouseholds],
  );

  const memberCountsByHousehold = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of members) {
      if (!m.household_id) continue;
      map[m.household_id] = (map[m.household_id] ?? 0) + 1;
    }
    return map;
  }, [members]);

  const center = useMemo(() => {
    const all = [...pinnedMembers, ...pinnedHouseholds];
    if (all.length === 0) return DEFAULT_CENTER;
    const avgLat = all.reduce((s, p) => s + (p.lat ?? 0), 0) / all.length;
    const avgLng = all.reduce((s, p) => s + (p.lng ?? 0), 0) / all.length;
    return { lat: avgLat, lng: avgLng };
  }, [pinnedMembers, pinnedHouseholds]);

  if (sdkError) return <div className="text-red-600 p-4 text-sm">{sdkError}</div>;
  if (!sdkReady) return <div className="p-4 text-slate-500 text-sm">지도 로딩...</div>;

  return (
    <Map center={center} level={6} style={{ width: '100%', height: '100%' }}>
      {pinnedMembers.map((m) => {
        const assignment = assignmentIndex.byMember[m.id];
        return (
          <CustomOverlayMap key={`m-${m.id}`} position={{ lat: m.lat!, lng: m.lng! }} yAnchor={1}>
            <MemberPin
              member={m}
              selected={selectedIds.has(m.id)}
              assignment={assignment ? { role: assignment.role, ministryNumber: assignment.ministryNumber } : undefined}
              onClick={() => toggleMember(m.id)}
            />
          </CustomOverlayMap>
        );
      })}

      {pinnedHouseholds.map((h) => {
        const assignment = assignmentIndex.byHousehold[h.id];
        return (
          <CustomOverlayMap key={`h-${h.id}`} position={{ lat: h.lat!, lng: h.lng! }} yAnchor={1} xAnchor={0.5}>
            <HouseholdPin
              household={h}
              memberCount={memberCountsByHousehold[h.id] ?? 0}
              selected={selectedHouseholdIds.has(h.id)}
              assignment={assignment ? { role: 'recipient', ministryNumber: assignment.ministryNumber } : undefined}
              onClick={() => toggleHousehold(h.id)}
            />
          </CustomOverlayMap>
        );
      })}
    </Map>
  );
}
