import { supabase } from '@/shared/lib/supabase';
import type { Organization } from '@/features/ministries/types';

/** An organization's presidency: the members its ministries can name as supervisor. */
export interface PresidencyRepository {
  add(org: Organization, memberId: string): Promise<void>;
  remove(org: Organization, memberId: string): Promise<void>;
}

export const presidencyRepository: PresidencyRepository = {
  async add(org, memberId) {
    const { error } = await supabase.from('presidency_members').insert({ organization: org, member_id: memberId });
    if (error) throw error;
  },

  async remove(org, memberId) {
    const { error } = await supabase
      .from('presidency_members')
      .delete()
      .eq('organization', org)
      .eq('member_id', memberId);
    if (error) throw error;
  },
};
