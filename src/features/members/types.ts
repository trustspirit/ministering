import type { Database } from '@/types/database.types';

export type Member = Database['public']['Tables']['members']['Row'];
export type MemberInsert = Database['public']['Tables']['members']['Insert'];
export type MemberUpdate = Database['public']['Tables']['members']['Update'];
export type Gender = Database['public']['Enums']['gender'];
export type ActiveStatus = Database['public']['Enums']['active_status'];
export type Personality = Database['public']['Enums']['personality'];
export type HouseholdRole = Database['public']['Enums']['household_role'];
