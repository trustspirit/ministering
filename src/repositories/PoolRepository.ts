import { supabase } from '@/shared/lib/supabase';
import type { Organization } from '@/features/ministries/types';

export type PoolRole = 'companion' | 'recipient';

/**
 * An organization's ministry pool: who its assignment board shows, by role. EQ recipients are households,
 * everything else is a member.
 */
export interface PoolRepository {
  add(org: Organization, role: PoolRole, id: string): Promise<void>;
  remove(org: Organization, role: PoolRole, id: string): Promise<void>;
}

const targetColumn = (org: Organization, role: PoolRole) =>
  org === 'EQ' && role === 'recipient' ? 'household_id' : 'member_id';

export const poolRepository: PoolRepository = {
  async add(org, role, id) {
    const target = targetColumn(org, role) === 'household_id' ? { household_id: id } : { member_id: id };
    const { error } = await supabase.from('ministry_pool').insert({ organization: org, role, ...target });
    // 23505: already in the pool (a double click, or someone else added them) — the goal is reached.
    if (error && error.code !== '23505') throw error;
  },

  async remove(org, role, id) {
    const { error } = await supabase
      .from('ministry_pool')
      .delete()
      .eq('organization', org)
      .eq('role', role)
      .eq(targetColumn(org, role), id);
    if (error) throw error;
  },
};
