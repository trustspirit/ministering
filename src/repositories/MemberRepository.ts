import { supabase } from '@/shared/lib/supabase';
import type { Member, MemberInsert, MemberUpdate } from '@/features/members/types';

export interface MemberRepository {
  listActive(): Promise<Member[]>;
  findById(id: string): Promise<Member | null>;
  findByNameAndBirthDate(fullName: string, birthDate: string): Promise<Member | null>;
  create(input: MemberInsert): Promise<Member>;
  update(id: string, patch: MemberUpdate): Promise<Member>;
  softDelete(id: string): Promise<void>;
  listByHouseholdId(householdId: string): Promise<Member[]>;
}

export const memberRepository: MemberRepository = {
  async listActive() {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('is_deleted', false)
      .order('full_name');
    if (error) throw error;
    return data ?? [];
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async findByNameAndBirthDate(fullName, birthDate) {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('full_name', fullName)
      .eq('birth_date', birthDate)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(input) {
    const { data, error } = await supabase
      .from('members')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, patch) {
    const { data, error } = await supabase
      .from('members')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async softDelete(id) {
    // A plain UPDATE of is_deleted is rejected by row-level security; the role check lives in this function.
    const { error } = await supabase.rpc('soft_delete_member', { p_member_id: id });
    if (error) throw error;
  },

  async listByHouseholdId(householdId) {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('household_id', householdId)
      .eq('is_deleted', false);
    if (error) throw error;
    return data ?? [];
  },
};
