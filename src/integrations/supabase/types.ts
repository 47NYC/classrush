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
      answers: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          position: number
          question_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          position?: number
          question_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          position?: number
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          coins: number
          created_at: string
          display_name: string | null
          friend_code: string
          id: string
          level: number
          referral_code: string
          referred_by: string | null
          updated_at: string
          username: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          coins?: number
          created_at?: string
          display_name?: string | null
          friend_code?: string
          id: string
          level?: number
          referral_code?: string
          referred_by?: string | null
          updated_at?: string
          username: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          coins?: number
          created_at?: string
          display_name?: string | null
          friend_code?: string
          id?: string
          level?: number
          referral_code?: string
          referred_by?: string | null
          updated_at?: string
          username?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          points: number
          position: number
          quiz_id: string
          text: string
          time_limit: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          points?: number
          position?: number
          quiz_id: string
          text: string
          time_limit?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          points?: number
          position?: number
          quiz_id?: string
          text?: string
          time_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          category: string | null
          cover_url: string | null
          created_at: string
          creator_id: string
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty"]
          id: string
          is_public: boolean
          likes_count: number
          plays_count: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty"]
          id?: string
          is_public?: boolean
          likes_count?: number
          plays_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cover_url?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty"]
          id?: string
          is_public?: boolean
          likes_count?: number
          plays_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      room_players: {
        Row: {
          id: string
          is_eliminated: boolean
          is_ready: boolean
          joined_at: string
          room_id: string
          score: number
          user_id: string
        }
        Insert: {
          id?: string
          is_eliminated?: boolean
          is_ready?: boolean
          joined_at?: string
          room_id: string
          score?: number
          user_id: string
        }
        Update: {
          id?: string
          is_eliminated?: boolean
          is_ready?: boolean
          joined_at?: string
          room_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string
          created_at: string
          current_question: number
          finished_at: string | null
          host_id: string
          id: string
          is_private: boolean
          max_players: number
          mode: Database["public"]["Enums"]["game_mode"]
          question_started_at: string | null
          quiz_id: string
          settings: Json
          started_at: string | null
          status: Database["public"]["Enums"]["room_status"]
        }
        Insert: {
          code?: string
          created_at?: string
          current_question?: number
          finished_at?: string | null
          host_id: string
          id?: string
          is_private?: boolean
          max_players?: number
          mode?: Database["public"]["Enums"]["game_mode"]
          question_started_at?: string | null
          quiz_id: string
          settings?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["room_status"]
        }
        Update: {
          code?: string
          created_at?: string
          current_question?: number
          finished_at?: string | null
          host_id?: string
          id?: string
          is_private?: boolean
          max_players?: number
          mode?: Database["public"]["Enums"]["game_mode"]
          question_started_at?: string | null
          quiz_id?: string
          settings?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["room_status"]
        }
        Relationships: [
          {
            foreignKeyName: "rooms_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_room_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "teacher" | "admin"
      difficulty: "easy" | "medium" | "hard"
      game_mode:
        | "classic"
        | "survival"
        | "team"
        | "speed"
        | "boss"
        | "race"
        | "treasure"
        | "arena"
        | "chaos"
        | "tournament"
      room_status: "lobby" | "live" | "finished" | "cancelled"
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
  public: {
    Enums: {
      app_role: ["user", "teacher", "admin"],
      difficulty: ["easy", "medium", "hard"],
      game_mode: [
        "classic",
        "survival",
        "team",
        "speed",
        "boss",
        "race",
        "treasure",
        "arena",
        "chaos",
        "tournament",
      ],
      room_status: ["lobby", "live", "finished", "cancelled"],
    },
  },
} as const
