import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import type { Database } from '@/types/database.types';
import { isShareTokenShape } from './shareToken';

type Gender = Database['public']['Enums']['gender'];
type Organization = Database['public']['Enums']['organization'];

export interface SharePhone {
  name: string;
  phone: string | null;
}

export interface ShareFamilyMember extends SharePhone {
  age: number;
  gender: Gender;
}

export type ShareRecipient =
  | { type: 'household'; name: string; address: string | null; members: ShareFamilyMember[] }
  | { type: 'member'; name: string; phone: string | null; address: string | null };

/** The JSON returned by the get_ministry_share RPC (and nothing else is ever read). */
export interface MinistryShare {
  organization: Organization;
  number: number;
  name: string | null;
  companions: SharePhone[];
  recipients: ShareRecipient[];
}

/** `null` = unknown, switched-off or malformed link. A token of the wrong shape never reaches the server. */
export function useMinistryShare(token: string | undefined): UseQueryResult<MinistryShare | null> {
  const valid = isShareTokenShape(token);
  return useQuery({
    // The token only lives in the query key (in memory); it is never logged.
    queryKey: ['ministry-share', token],
    enabled: valid,
    retry: false,
    gcTime: 0,
    queryFn: async (): Promise<MinistryShare | null> => {
      const { data, error } = await supabase.rpc('get_ministry_share', { p_token: token as string });
      if (error) throw new Error('share lookup failed');
      return (data as unknown as MinistryShare | null) ?? null;
    },
  });
}
