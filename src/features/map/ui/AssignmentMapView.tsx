import { useEffect, useMemo, useState } from 'react';
import { Map, CustomOverlayMap } from 'react-kakao-maps-sdk';
import { loadKakaoMapsSdk } from '@/shared/lib/kakaoSdk';
import { MemberPin } from './MemberPin';
import { useSelectionStore } from '../store';
import type { Member } from '@/features/members/types';
import type { AssignmentIndex } from '@/features/ministries/hooks/useAssignmentIndex';

export interface AssignmentMapViewProps {
  members: Member[];
  assignmentIndex: AssignmentIndex;
}

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 };

export function AssignmentMapView({ members, assignmentIndex }: AssignmentMapViewProps) {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const { selectedIds, toggle } = useSelectionStore();

  useEffect(() => {
    loadKakaoMapsSdk()
      .then(() => setSdkReady(true))
      .catch((err) => setSdkError(err instanceof Error ? err.message : String(err)));
  }, []);

  const pinned = useMemo(
    () => members.filter((m) => m.lat !== null && m.lng !== null),
    [members],
  );

  const center = useMemo(() => {
    if (pinned.length === 0) return DEFAULT_CENTER;
    const avgLat = pinned.reduce((s, m) => s + (m.lat ?? 0), 0) / pinned.length;
    const avgLng = pinned.reduce((s, m) => s + (m.lng ?? 0), 0) / pinned.length;
    return { lat: avgLat, lng: avgLng };
  }, [pinned]);

  if (sdkError) return <div className="text-red-600 p-4 text-sm">{sdkError}</div>;
  if (!sdkReady) return <div className="p-4 text-slate-500 text-sm">지도 로딩...</div>;

  return (
    <Map center={center} level={6} style={{ width: '100%', height: '100%' }}>
      {pinned.map((m) => {
        const assignment = assignmentIndex.byMember[m.id];
        return (
          <CustomOverlayMap key={m.id} position={{ lat: m.lat!, lng: m.lng! }} yAnchor={1}>
            <MemberPin
              member={m}
              selected={selectedIds.has(m.id)}
              assignment={assignment ? { role: assignment.role, ministryNumber: assignment.ministryNumber } : undefined}
              onClick={() => toggle(m.id)}
            />
          </CustomOverlayMap>
        );
      })}
    </Map>
  );
}
