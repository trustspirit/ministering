import { useEffect, useMemo, useState } from 'react';
import { Map, CustomOverlayMap } from 'react-kakao-maps-sdk';
import { loadKakaoMapsSdk } from '@/shared/lib/kakaoSdk';
import { MemberPin } from './MemberPin';
import { useSelectionStore } from '../store';
import type { Member } from '@/features/members/types';

export interface MapViewProps {
  members: Member[];
}

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 };

export function MapView({ members }: MapViewProps) {
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

  if (sdkError) {
    return (
      <div className="py-12 text-center text-red-600">
        <p>지도를 불러올 수 없습니다: {sdkError}</p>
        <p className="text-sm text-slate-500 mt-2">
          <code>.env.local</code> 의 <code>VITE_KAKAO_JS_KEY</code> 설정을 확인하세요.
        </p>
      </div>
    );
  }

  if (!sdkReady) {
    return <div className="py-12 text-center text-slate-500">지도 로딩 중...</div>;
  }

  return (
    <div className="relative">
      <Map
        center={center}
        level={6}
        style={{ width: '100%', height: '600px' }}
      >
        {pinned.map((m) => (
          <CustomOverlayMap
            key={m.id}
            position={{ lat: m.lat!, lng: m.lng! }}
            yAnchor={1}
          >
            <MemberPin
              member={m}
              selected={selectedIds.has(m.id)}
              onClick={() => toggle(m.id)}
            />
          </CustomOverlayMap>
        ))}
      </Map>

      {members.length > pinned.length && (
        <div className="mt-2 text-xs text-slate-500">
          주소 미확인 {members.length - pinned.length}명은 지도에 표시되지 않음
        </div>
      )}
    </div>
  );
}
