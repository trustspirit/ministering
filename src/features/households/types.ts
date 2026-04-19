import type { Database } from '@/types/database.types';

export type Household = Database['public']['Tables']['households']['Row'];
export type HouseholdInsert = Database['public']['Tables']['households']['Insert'];
export type HouseholdUpdate = Database['public']['Tables']['households']['Update'];
