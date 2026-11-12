import { useEffect, useMemo, useRef, useState } from 'react';
import { CustomOverlayMap, Map as KakaoMap, Polyline } from 'react-kakao-maps-sdk';
import { loadKakaoMapsSdk } from '@/shared/lib/kakaoSdk';
import { T } from '@/shared/copy';
import { buildMapItems, hotLines, type MapItem } from '../domain/mapItems';
import { useWorkspaceStore } from '../store';
import { useWorkspace } from '../workspaceContext';
import { MapPin } from './MapPin';

/** Seoul City Hall — the view when nothing has coordinates. Module constant so the map never re-centres on render. */
const SEOUL = { lat: 37.5665, lng: 126.978 };
/** --app-accent; Kakao polylines take a colour value, not a CSS variable. */
const LINE_COLOR = '#006184';
/** Horizontal gap between pins sharing one coordinate, and the lift of EQ person pins above their household pin. */
const SPREAD_PX = 20;
const LIFT_PX = 26;

type Offset = { x: number; y: number };
const NO_OFFSET: Offset = { x: 0, y: 0 };

const keyOf = (i: Pick<MapItem, 'kind' | 'id'>) => `${i.kind}:${i.id}`;
const placeOf = (i: MapItem) => `${i.lat},${i.lng}`;

/** Pixel offsets so pins at the same coordinates sit side by side instead of on top of each other. */
function spreadOffsets(items: MapItem[]): Map<string, Offset> {
  const groups = new Map<string, MapItem[]>();
  const householdPlaces = new Set<string>();
  for (const i of items) {
    if (i.kind === 'household') householdPlaces.add(placeOf(i));
    const g = `${i.kind}@${placeOf(i)}`;
    const list = groups.get(g);
    if (list) list.push(i);
    else groups.set(g, [i]);
  }
  const offsets = new Map<string, Offset>();
  for (const list of groups.values()) {
    list.forEach((i, n) => {
      const x = (n - (list.length - 1) / 2) * SPREAD_PX;
      const y = i.kind === 'member' && householdPlaces.has(placeOf(i)) ? -LIFT_PX : 0;
      if (x || y) offsets.set(keyOf(i), { x, y });
    });
  }
  return offsets;
}

export function MapPanel() {
  const { org, board, members, householdById, canEdit } = useWorkspace();
  const selected = useWorkspaceStore((s) => s.selected);
  const setSelected = useWorkspaceStore((s) => s.setSelected);
  const hotMinistryId = useWorkspaceStore((s) => s.hotMinistryId);
  const setHotMinistryId = useWorkspaceStore((s) => s.setHotMinistryId);

  const [sdk, setSdk] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  // Polyline ends are converted through the current projection, so a zoom must re-render them.
  const [, setZoomLevel] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fittedOrg = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadKakaoMapsSdk()
      .then(() => alive && setSdk('ready'))
      .catch(() => alive && setSdk('failed'));
    return () => {
      alive = false;
    };
  }, []);

  const items = useMemo(
    () => buildMapItems({ board, members, households: [...householdById.values()] }),
    [board, members, householdById],
  );
  const offsets = useMemo(() => spreadOffsets(items), [items]);
  const lines = useMemo(() => hotLines(board, hotMinistryId, items), [board, hotMinistryId, items]);
  const hotIds = useMemo(() => {
    const m = hotMinistryId ? board.ministries.find((x) => x.id === hotMinistryId) : undefined;
    return m ? new Set([...m.companionIds, ...m.recipientIds]) : null;
  }, [board, hotMinistryId]);

  // Fit to all pins once per organization, not on every board change, so assigning never moves the map.
  useEffect(() => {
    if (!map || fittedOrg.current === org) return;
    fittedOrg.current = org;
    if (items.length === 0) {
      map.setCenter(new kakao.maps.LatLng(SEOUL.lat, SEOUL.lng));
      return;
    }
    const bounds = new kakao.maps.LatLngBounds();
    items.forEach((i) => bounds.extend(new kakao.maps.LatLng(i.lat, i.lng)));
    map.setBounds(bounds, 48, 48, 48, 48);
  }, [map, org, items]);

  // A card selected elsewhere brings its pin into view.
  // Depends on the coordinates only, so a board change does not pull the map back to the selection.
  const selectedItem = selected ? items.find((i) => keyOf(i) === keyOf(selected)) : undefined;
  const selectedKey = selected ? keyOf(selected) : null;
  const selLat = selectedItem?.lat;
  const selLng = selectedItem?.lng;
  useEffect(() => {
    if (!map || selLat === undefined || selLng === undefined) return;
    const at = new kakao.maps.LatLng(selLat, selLng);
    if (!map.getBounds().contain(at)) map.panTo(at);
  }, [map, selectedKey, selLat, selLng]);

  // The resize bar changes the column width; Kakao needs to be told its container changed.
  useEffect(() => {
    const el = wrapRef.current;
    if (!map || !el) return;
    const observer = new ResizeObserver(() => map.relayout());
    observer.observe(el);
    return () => observer.disconnect();
  }, [map]);

  /** Line ends follow the pins' pixel offsets (re-rendered on zoom, since the offset is in pixels). */
  const lineEnd = (i: MapItem) => {
    const offset = offsets.get(keyOf(i));
    if (!map || !offset) return { lat: i.lat, lng: i.lng };
    const projection = map.getProjection();
    const p = projection.containerPointFromCoords(new kakao.maps.LatLng(i.lat, i.lng));
    const c = projection.coordsFromContainerPoint(new kakao.maps.Point(p.x + offset.x, p.y + offset.y));
    return { lat: c.getLat(), lng: c.getLng() };
  };

  return (
    <div className="aw-map" ref={wrapRef} role="region" aria-label={T.map.label}>
      {sdk === 'failed' ? (
        <p className="aw-map-msg">{T.map.loadFailed}</p>
      ) : sdk === 'loading' ? (
        <p className="aw-map-msg">{T.map.loading}</p>
      ) : (
        <KakaoMap
          center={SEOUL}
          level={6}
          className="aw-map-canvas"
          onCreate={setMap}
          onZoomChanged={(m) => setZoomLevel(m.getLevel())}
          onClick={() => setHotMinistryId(null)}
        >
          {lines.map(({ from, to }) => (
            <Polyline
              key={`${keyOf(from)}>${keyOf(to)}`}
              path={[lineEnd(from), lineEnd(to)]}
              strokeColor={LINE_COLOR}
              strokeWeight={2}
              strokeOpacity={0.9}
              strokeStyle="dash"
            />
          ))}
          {items.map((item) => {
            const key = keyOf(item);
            const isSelected = selected !== null && key === keyOf(selected);
            return (
              <CustomOverlayMap
                key={key}
                position={{ lat: item.lat, lng: item.lng }}
                clickable
                zIndex={isSelected ? 3 : item.kind === 'member' ? 2 : 1}
              >
                <MapPin
                  item={item}
                  org={org}
                  selected={isSelected}
                  dim={hotIds !== null && !hotIds.has(item.id)}
                  draggable={canEdit}
                  offset={offsets.get(key) ?? NO_OFFSET}
                  onSelect={() => setSelected({ kind: item.kind, id: item.id })}
                />
              </CustomOverlayMap>
            );
          })}
        </KakaoMap>
      )}
      {sdk === 'ready' && items.length === 0 && <p className="aw-map-note">{T.map.noCoords}</p>}
      {sdk === 'ready' && (
        <ul className="aw-key" aria-label={T.map.keyLabel}>
          {org === 'EQ' && (
            <li>
              <i aria-hidden="true" />
              {T.map.keyHousehold}
            </li>
          )}
          <li>
            <i aria-hidden="true" className="aw-key-p" />
            {T.map.keyMember[org]}
          </li>
          <li>
            <i aria-hidden="true" className="aw-key-as" />
            {T.map.keyAssigned}
          </li>
          {org === 'RS' && <li>{T.map.keyRecipientBadge}</li>}
        </ul>
      )}
    </div>
  );
}
