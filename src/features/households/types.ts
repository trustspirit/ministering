import type { Database } from '@/types/database.types';

/** The stored household: address, coordinates and memo. It has no name of its own. */
export type HouseholdRow = Database['public']['Tables']['households']['Row'];
/** A household as the app reads it (household_list view): the stored row plus its name derived from its members. */
export type Household = HouseholdRow & { name: string };
export type HouseholdInsert = Database['public']['Tables']['households']['Insert'];
export type HouseholdUpdate = Database['public']['Tables']['households']['Update'];
