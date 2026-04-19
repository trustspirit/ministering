import { supabase } from '@/shared/lib/supabase';
import type {
  Ministry,
  MinistryInsert,
  MinistryUpdate,
  Organization,
} from '@/features/ministries/types';

export interface MinistryRepository {
  listByOrganization(org: Organization): Promise<Ministry[]>;
  findById(id: string): Promise<Ministry | null>;
  getExistingNumbers(org: Organization): Promise<number[]>;
  create(input: MinistryInsert): Promise<Ministry>;
  update(id: string, patch: MinistryUpdate): Promise<Ministry>;
  remove(id: string): Promise<void>;

  listCompanionIds(ministryId: string): Promise<string[]>;
  addCompanion(ministryId: string, memberId: string): Promise<void>;
  removeCompanion(ministryId: string, memberId: string): Promise<void>;

  listMemberRecipientIds(ministryId: string): Promise<string[]>;
  listHouseholdRecipientIds(ministryId: string): Promise<string[]>;
  addMemberRecipient(ministryId: string, memberId: string): Promise<void>;
  removeMemberRecipient(ministryId: string, memberId: string): Promise<void>;
  addHouseholdRecipient(ministryId: string, householdId: string): Promise<void>;
  removeHouseholdRecipient(ministryId: string, householdId: string): Promise<void>;
}

export const ministryRepository: MinistryRepository = {
  async listByOrganization(org) {
    const { data, error } = await supabase
      .from('ministries')
      .select('*')
      .eq('organization', org)
      .order('number');
    if (error) throw error;
    return data ?? [];
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('ministries')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getExistingNumbers(org) {
    const { data, error } = await supabase
      .from('ministries')
      .select('number')
      .eq('organization', org);
    if (error) throw error;
    return (data ?? []).map((r) => r.number);
  },

  async create(input) {
    const { data, error } = await supabase
      .from('ministries')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, patch) {
    const { data, error } = await supabase
      .from('ministries')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from('ministries').delete().eq('id', id);
    if (error) throw error;
  },

  async listCompanionIds(ministryId) {
    const { data, error } = await supabase
      .from('ministry_companions')
      .select('member_id')
      .eq('ministry_id', ministryId);
    if (error) throw error;
    return (data ?? []).map((r) => r.member_id);
  },

  async addCompanion(ministryId, memberId) {
    const { error } = await supabase
      .from('ministry_companions')
      .insert({ ministry_id: ministryId, member_id: memberId });
    if (error) throw error;
  },

  async removeCompanion(ministryId, memberId) {
    const { error } = await supabase
      .from('ministry_companions')
      .delete()
      .eq('ministry_id', ministryId)
      .eq('member_id', memberId);
    if (error) throw error;
  },

  async listMemberRecipientIds(ministryId) {
    const { data, error } = await supabase
      .from('ministry_member_recipients')
      .select('member_id')
      .eq('ministry_id', ministryId);
    if (error) throw error;
    return (data ?? []).map((r) => r.member_id);
  },

  async listHouseholdRecipientIds(ministryId) {
    const { data, error } = await supabase
      .from('ministry_household_recipients')
      .select('household_id')
      .eq('ministry_id', ministryId);
    if (error) throw error;
    return (data ?? []).map((r) => r.household_id);
  },

  async addMemberRecipient(ministryId, memberId) {
    const { error } = await supabase
      .from('ministry_member_recipients')
      .insert({ ministry_id: ministryId, member_id: memberId });
    if (error) throw error;
  },

  async removeMemberRecipient(ministryId, memberId) {
    const { error } = await supabase
      .from('ministry_member_recipients')
      .delete()
      .eq('ministry_id', ministryId)
      .eq('member_id', memberId);
    if (error) throw error;
  },

  async addHouseholdRecipient(ministryId, householdId) {
    const { error } = await supabase
      .from('ministry_household_recipients')
      .insert({ ministry_id: ministryId, household_id: householdId });
    if (error) throw error;
  },

  async removeHouseholdRecipient(ministryId, householdId) {
    const { error } = await supabase
      .from('ministry_household_recipients')
      .delete()
      .eq('ministry_id', ministryId)
      .eq('household_id', householdId);
    if (error) throw error;
  },
};
