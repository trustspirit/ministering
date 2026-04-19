import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';

export type RealtimeTable =
  | 'members'
  | 'households'
  | 'ministries'
  | 'ministry_companions'
  | 'ministry_member_recipients'
  | 'ministry_household_recipients';

export function useRealtimeSync(tables: RealtimeTable[], channelKey: string) {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel(`realtime-${channelKey}`);

    for (const table of tables) {
      channel.on(
        'postgres_changes' as never,
        { event: '*', schema: 'public', table },
        () => {
          switch (table) {
            case 'members':
              qc.invalidateQueries({ queryKey: ['members'] });
              qc.invalidateQueries({ queryKey: ['assignment-index'] });
              break;
            case 'households':
              qc.invalidateQueries({ queryKey: ['households'] });
              break;
            case 'ministries':
              qc.invalidateQueries({ queryKey: ['ministries'] });
              qc.invalidateQueries({ queryKey: ['assignment-index'] });
              break;
            case 'ministry_companions':
            case 'ministry_member_recipients':
            case 'ministry_household_recipients':
              qc.invalidateQueries({ queryKey: ['ministry-details'] });
              qc.invalidateQueries({ queryKey: ['assignment-index'] });
              break;
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
