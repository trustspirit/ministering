import type { Database } from '@/types/database.types';

export type Ministry = Database['public']['Tables']['ministries']['Row'];
export type MinistryInsert = Database['public']['Tables']['ministries']['Insert'];
export type MinistryUpdate = Database['public']['Tables']['ministries']['Update'];
export type Organization = Database['public']['Enums']['organization'];

export type MinistryCompanion = Database['public']['Tables']['ministry_companions']['Row'];
export type MinistryMemberRecipient = Database['public']['Tables']['ministry_member_recipients']['Row'];
export type MinistryHouseholdRecipient = Database['public']['Tables']['ministry_household_recipients']['Row'];

export type ValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };
