export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_user_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      households: {
        Row: {
          address: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          memo: string | null
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          memo?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          memo?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          active_status: Database["public"]["Enums"]["active_status"]
          address: string | null
          birth_date: string
          created_at: string
          full_name: string
          gender: Database["public"]["Enums"]["gender"]
          household_id: string | null
          household_role: Database["public"]["Enums"]["household_role"]
          id: string
          is_deleted: boolean
          lat: number | null
          lng: number | null
          memo: string | null
          personality: Database["public"]["Enums"]["personality"]
          phone: string | null
          updated_at: string
        }
        Insert: {
          active_status?: Database["public"]["Enums"]["active_status"]
          address?: string | null
          birth_date: string
          created_at?: string
          full_name: string
          gender: Database["public"]["Enums"]["gender"]
          household_id?: string | null
          household_role?: Database["public"]["Enums"]["household_role"]
          id?: string
          is_deleted?: boolean
          lat?: number | null
          lng?: number | null
          memo?: string | null
          personality?: Database["public"]["Enums"]["personality"]
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active_status?: Database["public"]["Enums"]["active_status"]
          address?: string | null
          birth_date?: string
          created_at?: string
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"]
          household_id?: string | null
          household_role?: Database["public"]["Enums"]["household_role"]
          id?: string
          is_deleted?: boolean
          lat?: number | null
          lng?: number | null
          memo?: string | null
          personality?: Database["public"]["Enums"]["personality"]
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      ministries: {
        Row: {
          created_at: string
          id: string
          name: string | null
          number: number
          organization: Database["public"]["Enums"]["organization"]
          share_token: string | null
          supervisor_member_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          number: number
          organization: Database["public"]["Enums"]["organization"]
          share_token?: string | null
          supervisor_member_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          number?: number
          organization?: Database["public"]["Enums"]["organization"]
          share_token?: string | null
          supervisor_member_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministries_supervisor_fk"
            columns: ["organization", "supervisor_member_id"]
            isOneToOne: false
            referencedRelation: "presidency_members"
            referencedColumns: ["organization", "member_id"]
          },
        ]
      }
      ministry_companions: {
        Row: {
          member_id: string
          ministry_id: string
          since_date: string
        }
        Insert: {
          member_id: string
          ministry_id: string
          since_date?: string
        }
        Update: {
          member_id?: string
          ministry_id?: string
          since_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministry_companions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_companions_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      ministry_household_recipients: {
        Row: {
          household_id: string
          ministry_id: string
        }
        Insert: {
          household_id: string
          ministry_id: string
        }
        Update: {
          household_id?: string
          ministry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministry_household_recipients_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_household_recipients_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      ministry_member_recipients: {
        Row: {
          member_id: string
          ministry_id: string
        }
        Insert: {
          member_id: string
          ministry_id: string
        }
        Update: {
          member_id?: string
          ministry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministry_member_recipients_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_member_recipients_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      presidency_members: {
        Row: {
          created_at: string
          member_id: string
          organization: Database["public"]["Enums"]["organization"]
        }
        Insert: {
          created_at?: string
          member_id: string
          organization: Database["public"]["Enums"]["organization"]
        }
        Update: {
          created_at?: string
          member_id?: string
          organization?: Database["public"]["Enums"]["organization"]
        }
        Relationships: [
          {
            foreignKeyName: "presidency_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_ministry_org: {
        Args: { p_ministry_id: string }
        Returns: boolean
      }
      current_user_role: { Args: never; Returns: string }
      get_app_users: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          invite_pending: boolean
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }[]
      }
      get_ministry_share: { Args: { p_token: string }; Returns: Json }
      get_ministry_share_token: {
        Args: { p_ministry_id: string }
        Returns: string
      }
      set_ministry_share_token: {
        Args: { p_ministry_id: string; p_token: string }
        Returns: undefined
      }
      soft_delete_member: { Args: { p_member_id: string }; Returns: undefined }
    }
    Enums: {
      active_status: "active" | "less_active" | "new_member"
      gender: "M" | "F"
      household_role: "husband" | "wife" | "child" | "other"
      organization: "RS" | "EQ"
      personality: "active" | "moderate" | "passive"
      user_role: "rs_president" | "eq_president" | "bishopric" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      active_status: ["active", "less_active", "new_member"],
      gender: ["M", "F"],
      household_role: ["husband", "wife", "child", "other"],
      organization: ["RS", "EQ"],
      personality: ["active", "moderate", "passive"],
      user_role: ["rs_president", "eq_president", "bishopric", "viewer"],
    },
  },
} as const

