import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export type Profile = Database['public']['Tables']['app_user_profiles']['Row'];

export interface AuthValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);
