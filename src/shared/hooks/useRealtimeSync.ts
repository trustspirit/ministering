import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';

export type RealtimeTable =
  | 'members'
  | 'households'
  | 'ministries'
  | 'ministry_companions'
  | 'ministry_member_recipients'
  | 'ministry_household_recipients'
  | 'presidency_members'
  | 'ministry_pool';

/**
 * Which cached queries a change in `table` makes stale.
 *
 * A member soft delete reaches other users as an UPDATE that row-level security hides (the row is no longer
 * selectable), so nothing arrives for the member itself. What does arrive is the DELETE of the member's companion or
 * recipient row from the cleanup trigger; that must refresh the roster too, or the deleted person stays listed
 * until the next refocus.
 */
export function queryKeysToRefresh(table: RealtimeTable, eventType?: string): readonly (readonly string[])[] {
  switch (table) {
    // Household names are derived from their members, so a member change can rename a household.
    case 'members':
      return [['members'], ['assignment-board'], ['households']];
    case 'households':
      return [['households']];
    case 'ministries':
    case 'presidency_members':
    case 'ministry_pool':
      return [['assignment-board']];
    case 'ministry_companions':
    case 'ministry_member_recipients':
    case 'ministry_household_recipients':
      return eventType === 'DELETE' ? [['assignment-board'], ['members']] : [['assignment-board']];
  }
}

export function useRealtimeSync(tables: RealtimeTable[], channelKey: string) {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel(`realtime-${channelKey}`);

    for (const table of tables) {
      channel.on(
        'postgres_changes' as never,
        { event: '*', schema: 'public', table },
        (payload: { eventType?: string }) => {
          for (const queryKey of queryKeysToRefresh(table, payload?.eventType)) {
            qc.invalidateQueries({ queryKey: [...queryKey] });
          }
        },
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tables.join(','), channelKey, qc]);
}
