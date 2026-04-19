import { supabase } from '@/shared/lib/supabase';
import type { Household, HouseholdInsert, HouseholdUpdate } from '@/features/households/types';

export interface HouseholdRepository {
  list(): Promise<Household[]>;
  findById(id: string): Promise<Household | null>;
  create(input: HouseholdInsert): Promise<Household>;
  update(id: string, patch: HouseholdUpdate): Promise<Household>;
  remove(id: string): Promise<void>;
}

export const householdRepository: HouseholdRepository = {
  async list() {
    const { data, error } = await supabase
      .from('households')
      .select('*')
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('households')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(input) {
    const { data, error } = await supabase
      .from('households')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, patch) {
    const { data, error } = await supabase
      .from('households')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from('households').delete().eq('id', id);
    if (error) throw error;
  },
};
