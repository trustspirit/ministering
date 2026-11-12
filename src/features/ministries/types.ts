import type { Database } from '@/types/database.types';

/** share_token is never part of what the app reads or writes directly: it is reachable only through the role-checked RPCs. */
export type Ministry = Omit<Database['public']['Tables']['ministries']['Row'], 'share_token'>;
export type MinistryInsert = Omit<Database['public']['Tables']['ministries']['Insert'], 'share_token'>;
export type MinistryUpdate = Omit<Database['public']['Tables']['ministries']['Update'], 'share_token'>;
export type Organization = Database['public']['Enums']['organization'];

export type MinistryCompanion = Database['public']['Tables']['ministry_companions']['Row'];
export type MinistryMemberRecipient = Database['public']['Tables']['ministry_member_recipients']['Row'];
export type MinistryHouseholdRecipient = Database['public']['Tables']['ministry_household_recipients']['Row'];

export type ValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };
