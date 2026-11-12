import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import type { Organization } from '@/features/ministries/types';
import { T } from '@/shared/copy';
import type { MapItem } from '../domain/mapItems';
import { endDrag, startDrag } from '../dnd';
import { onActivateKey } from './keyboard';

/** Pointer-down events the Kakao map would otherwise take as the start of a pan. */
const PAN_START_EVENTS = ['mousedown', 'pointerdown', 'touchstart'] as const;

function pinText(item: MapItem): string {
  const parts = [item.label];
  if (item.companionNo !== null) parts.push(T.map.pinCompanion(item.companionNo));
  if (item.recipientNo !== null) parts.push(T.map.pinRecipient(item.recipientNo));
  if (item.lessActive) parts.push(T.map.pinLessActive);
  if (item.newMember) parts.push(T.map.pinNewMember);
  return parts.join(', ');
}

function shortLabel(label: string): string {
  const suffix = T.map.householdSuffix;
  return label.endsWith(suffix) ? label.slice(0, -suffix.length) : label;
}

export function MapPin({
  item,
  org,
  selected,
  dim,
  draggable,
  offset,
  onSelect,
}: {
  item: MapItem;
  org: Organization;
  selected: boolean;
  dim: boolean;
  draggable: boolean;
  /** Pixel offset that spreads pins sharing one coordinate. */
  offset: { x: number; y: number };
  onSelect: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // The map listens on its own container, which the native event reaches before React's
  // root listener, so the guard must be a native listener on the pin itself.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e: Event) => e.stopPropagation();
    PAN_START_EVENTS.forEach((t) => el.addEventListener(t, stop));
    return () => PAN_START_EVENTS.forEach((t) => el.removeEventListener(t, stop));
  }, []);

  const household = item.kind === 'household';
  // Households show the ministry they are assigned to; people the one they serve in.
  const number = household ? item.recipientNo : item.companionNo;
  // RS: a sister can also be a recipient — shown as a small badge.
  const badge = !household && org === 'RS' ? item.recipientNo : null;
  // EQ person pins sit right above their household pin, so only households and RS sisters are labelled.
  const showLabel = household || org === 'RS';

  return (
    <div
      ref={ref}
      className={clsx(
        'aw-pin',
        !household && 'aw-pin--p',
        number !== null && 'aw-pin--as',
        item.lessActive && 'aw-pin--l',
        item.newMember && 'aw-pin--n',
        dim && 'aw-pin--dim',
        selected && 'aw-pin--sel',
      )}
      style={offset.x || offset.y ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : undefined}
      data-pin={`${item.kind}:${item.id}`}
      draggable={draggable ? true : undefined}
      onDragStart={
        draggable ? (e) => startDrag(e, { kind: item.kind, id: item.id, from: null }) : undefined
      }
      onDragEnd={endDrag}
      role="button"
      tabIndex={0}
      aria-label={pinText(item)}
      aria-pressed={selected}
      title={item.label}
      onClick={onSelect}
      onKeyDown={onActivateKey(onSelect)}
    >
      {number}
      {badge !== null && (
        <span className="aw-pin-rb" aria-hidden="true">
          {badge}
        </span>
      )}
      {showLabel && (
        <span className="aw-pin-lb" aria-hidden="true">
          {shortLabel(item.label)}
        </span>
      )}
    </div>
  );
}
