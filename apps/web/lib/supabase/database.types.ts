export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      collection_items: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          label: string
          personal_note: string | null
          sort_order: number
          status: Database["public"]["Enums"]["collection_item_state"]
          updated_at: string
          user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          label: string
          personal_note?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["collection_item_state"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          label?: string
          personal_note?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["collection_item_state"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      objective_updates: {
        Row: {
          created_at: string
          id: string
          note: string | null
          objective_id: string
          progress: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          objective_id: string
          progress: number
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          objective_id?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "objective_updates_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      objectives: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          priority: Database["public"]["Enums"]["objective_priority"]
          progress: number
          status: Database["public"]["Enums"]["objective_state"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["objective_priority"]
          progress?: number
          status?: Database["public"]["Enums"]["objective_state"]
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["objective_priority"]
          progress?: number
          status?: Database["public"]["Enums"]["objective_state"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_profiles: {
        Row: {
          connection_mode: string
          connection_status: string
          created_at: string
          id: string
          label: string
          platform: Database["public"]["Enums"]["platform_kind"]
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_mode?: string
          connection_status?: string
          created_at?: string
          id?: string
          label: string
          platform: Database["public"]["Enums"]["platform_kind"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          connection_mode?: string
          connection_status?: string
          created_at?: string
          id?: string
          label?: string
          platform?: Database["public"]["Enums"]["platform_kind"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      play_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          focus: string | null
          id: string
          label: string
          platform: Database["public"]["Enums"]["platform_kind"]
          platform_profile_id: string | null
          private_note: string | null
          started_at: string
          status: Database["public"]["Enums"]["session_state"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          focus?: string | null
          id?: string
          label?: string
          platform: Database["public"]["Enums"]["platform_kind"]
          platform_profile_id?: string | null
          private_note?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_state"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          focus?: string | null
          id?: string
          label?: string
          platform?: Database["public"]["Enums"]["platform_kind"]
          platform_profile_id?: string | null
          private_note?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["session_state"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_sessions_platform_profile_id_fkey"
            columns: ["platform_profile_id"]
            isOneToOne: false
            referencedRelation: "platform_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          preferred_platform:
            | Database["public"]["Enums"]["platform_kind"]
            | null
          spoiler_preference: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          preferred_platform?:
            | Database["public"]["Enums"]["platform_kind"]
            | null
          spoiler_preference?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          preferred_platform?:
            | Database["public"]["Enums"]["platform_kind"]
            | null
          spoiler_preference?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tool_audit_events: {
        Row: {
          created_at: string
          id: string
          outcome: string
          tool_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          outcome: string
          tool_name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          outcome?: string
          tool_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          consent_type: string
          created_at: string
          granted_at: string
          id: string
          revoked_at: string | null
          user_id: string
          version: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted_at?: string
          id?: string
          revoked_at?: string | null
          user_id?: string
          version: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted_at?: string
          id?: string
          revoked_at?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      collection_item_state:
        | "not_started"
        | "in_progress"
        | "completed"
        | "skipped"
      objective_priority: "low" | "normal" | "high"
      objective_state: "active" | "paused" | "completed" | "archived"
      platform_kind: "ps5" | "xbox"
      session_state: "active" | "completed" | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      collection_item_state: [
        "not_started",
        "in_progress",
        "completed",
        "skipped",
      ],
      objective_priority: ["low", "normal", "high"],
      objective_state: ["active", "paused", "completed", "archived"],
      platform_kind: ["ps5", "xbox"],
      session_state: ["active", "completed", "cancelled"],
    },
  },
} as const
