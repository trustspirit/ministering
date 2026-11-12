import '@/shared/ui/subbar.css';
import type { ActiveStatus } from '@/features/members/types';
import { STATUS_LABEL } from '@/shared/copy';

/** Coloured dot for a member's status (active = green, less active = ochre, new = teal). */
export function StatusMark({ status }: { status: ActiveStatus }) {
  return <i className={`aw-st aw-st--${status}`} title={STATUS_LABEL[status]} aria-hidden="true" />;
}

/** Status words, shown only when the member is not an active member. */
export function StatusText({ status }: { status: ActiveStatus }) {
  if (status === 'active') return null;
  return <em className={`aw-stx aw-stx--${status}`}>{STATUS_LABEL[status]}</em>;
}
