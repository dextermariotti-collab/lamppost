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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          created_at: string
          criteria: string
          description: string
          icon: string
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          criteria: string
          description: string
          icon: string
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          criteria?: string
          description?: string
          icon?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          course_slug: string | null
          course_topic: string | null
          created_at: string
          details: string | null
          excerpt: string | null
          id: string
          lesson_index: number | null
          lesson_title: string | null
          reason: string
          status: string
          user_id: string | null
        }
        Insert: {
          course_slug?: string | null
          course_topic?: string | null
          created_at?: string
          details?: string | null
          excerpt?: string | null
          id?: string
          lesson_index?: number | null
          lesson_title?: string | null
          reason: string
          status?: string
          user_id?: string | null
        }
        Update: {
          course_slug?: string | null
          course_topic?: string | null
          created_at?: string
          details?: string | null
          excerpt?: string | null
          id?: string
          lesson_index?: number | null
          lesson_title?: string | null
          reason?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      daily_activity: {
        Row: {
          created_at: string
          day: string
          id: string
          lessons_completed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          lessons_completed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          lessons_completed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          accepted_at: string | null
          addressee_id: string
          created_at: string
          id: string
          requested_at: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          addressee_id: string
          created_at?: string
          id?: string
          requested_at?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          addressee_id?: string
          created_at?: string
          id?: string
          requested_at?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      moderation_blocks: {
        Row: {
          category: string
          created_at: string
          id: string
          stage: string
          topic: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          stage: string
          topic: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          stage?: string
          topic?: string
          user_id?: string | null
        }
        Relationships: []
      }
      nudges: {
        Row: {
          day: string
          from_user_id: string
          id: string
          read_at: string | null
          sent_at: string
          shared_streak_id: string | null
          to_user_id: string
        }
        Insert: {
          day?: string
          from_user_id: string
          id?: string
          read_at?: string | null
          sent_at?: string
          shared_streak_id?: string | null
          to_user_id: string
        }
        Update: {
          day?: string
          from_user_id?: string
          id?: string
          read_at?: string | null
          sent_at?: string
          shared_streak_id?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nudges_shared_streak_id_fkey"
            columns: ["shared_streak_id"]
            isOneToOne: false
            referencedRelation: "shared_streaks"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          completed_at: string | null
          connection_made: boolean
          course_slug: string
          course_topic: string
          created_at: string
          id: string
          lesson_index: number
          lesson_title: string
          remembered: string | null
          transcript: Json
          updated_at: string
          user_id: string
          verdict: string | null
        }
        Insert: {
          completed_at?: string | null
          connection_made?: boolean
          course_slug: string
          course_topic: string
          created_at?: string
          id?: string
          lesson_index: number
          lesson_title: string
          remembered?: string | null
          transcript?: Json
          updated_at?: string
          user_id: string
          verdict?: string | null
        }
        Update: {
          completed_at?: string | null
          connection_made?: boolean
          course_slug?: string
          course_topic?: string
          created_at?: string
          id?: string
          lesson_index?: number
          lesson_title?: string
          remembered?: string | null
          transcript?: Json
          updated_at?: string
          user_id?: string
          verdict?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          companion_accessory: string
          companion_expression: string
          companion_palette: string
          companion_preset: string
          created_at: string
          current_streak: number
          daily_goal: number
          display_name: string | null
          gems: number
          handle: string
          id: string
          invite_code: string
          last_active_day: string | null
          longest_streak: number
          notify_nudges_email: boolean
          notify_nudges_inapp: boolean
          onboarding_completed: boolean
          total_xp: number
          updated_at: string
        }
        Insert: {
          companion_accessory?: string
          companion_expression?: string
          companion_palette?: string
          companion_preset?: string
          created_at?: string
          current_streak?: number
          daily_goal?: number
          display_name?: string | null
          gems?: number
          handle: string
          id: string
          invite_code: string
          last_active_day?: string | null
          longest_streak?: number
          notify_nudges_email?: boolean
          notify_nudges_inapp?: boolean
          onboarding_completed?: boolean
          total_xp?: number
          updated_at?: string
        }
        Update: {
          companion_accessory?: string
          companion_expression?: string
          companion_palette?: string
          companion_preset?: string
          created_at?: string
          current_streak?: number
          daily_goal?: number
          display_name?: string | null
          gems?: number
          handle?: string
          id?: string
          invite_code?: string
          last_active_day?: string | null
          longest_streak?: number
          notify_nudges_email?: boolean
          notify_nudges_inapp?: boolean
          onboarding_completed?: boolean
          total_xp?: number
          updated_at?: string
        }
        Relationships: []
      }
      shared_streaks: {
        Row: {
          created_at: string
          current_count: number
          friendship_id: string
          id: string
          last_extended_day: string | null
          proposed_by: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_count?: number
          friendship_id: string
          id?: string
          last_extended_day?: string | null
          proposed_by: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_count?: number
          friendship_id?: string
          id?: string
          last_extended_day?: string | null
          proposed_by?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_streaks_friendship_id_fkey"
            columns: ["friendship_id"]
            isOneToOne: true
            referencedRelation: "friendships"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_code: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_code: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_code?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_code_fkey"
            columns: ["achievement_code"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_friends: { Args: { _a: string; _b: string }; Returns: boolean }
      has_friend_link: { Args: { _a: string; _b: string }; Returns: boolean }
      is_friendship_member: {
        Args: { _friendship_id: string; _user: string }
        Returns: boolean
      }
      profile_by_invite: {
        Args: { _code: string }
        Returns: {
          companion_accessory: string
          companion_expression: string
          companion_palette: string
          companion_preset: string
          current_streak: number
          display_name: string
          handle: string
          id: string
        }[]
      }
      random_code: { Args: { len: number }; Returns: string }
      search_profiles: {
        Args: { _query: string }
        Returns: {
          companion_accessory: string
          companion_expression: string
          companion_palette: string
          companion_preset: string
          current_streak: number
          display_name: string
          handle: string
          id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
