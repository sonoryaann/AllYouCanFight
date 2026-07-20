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
      default_dishes: {
        Row: {
          categoria: string
          id: string
          nome: string
          ordine: number
          punti: number
        }
        Insert: {
          categoria: string
          id?: string
          nome: string
          ordine?: number
          punti?: number
        }
        Update: {
          categoria?: string
          id?: string
          nome?: string
          ordine?: number
          punti?: number
        }
        Relationships: []
      }
      lobbies: {
        Row: {
          codice_accesso: string
          creato_il: string
          id: string
          stato: Database["public"]["Enums"]["lobby_stato"]
        }
        Insert: {
          codice_accesso: string
          creato_il?: string
          id?: string
          stato?: Database["public"]["Enums"]["lobby_stato"]
        }
        Update: {
          codice_accesso?: string
          creato_il?: string
          id?: string
          stato?: Database["public"]["Enums"]["lobby_stato"]
        }
        Relationships: []
      }
      lobby_dishes: {
        Row: {
          categoria: string
          id: string
          lobby_id: string
          nome: string
          punti: number
        }
        Insert: {
          categoria: string
          id?: string
          lobby_id: string
          nome: string
          punti?: number
        }
        Update: {
          categoria?: string
          id?: string
          lobby_id?: string
          nome?: string
          punti?: number
        }
        Relationships: [
          {
            foreignKeyName: "lobby_dishes_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          dish_id: string
          id: string
          player_id: string
          quantita_mangiata: number
          quantita_ordinata: number
          stato: Database["public"]["Enums"]["order_stato"]
        }
        Insert: {
          dish_id: string
          id?: string
          player_id: string
          quantita_mangiata?: number
          quantita_ordinata?: number
          stato?: Database["public"]["Enums"]["order_stato"]
        }
        Update: {
          dish_id?: string
          id?: string
          player_id?: string
          quantita_mangiata?: number
          quantita_ordinata?: number
          stato?: Database["public"]["Enums"]["order_stato"]
        }
        Relationships: [
          {
            foreignKeyName: "orders_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "lobby_dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "orders_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          creato_il: string
          device_id: string
          id: string
          lobby_id: string
          ruolo: Database["public"]["Enums"]["player_ruolo"]
          username: string
        }
        Insert: {
          creato_il?: string
          device_id?: string
          id?: string
          lobby_id: string
          ruolo?: Database["public"]["Enums"]["player_ruolo"]
          username: string
        }
        Update: {
          creato_il?: string
          device_id?: string
          id?: string
          lobby_id?: string
          ruolo?: Database["public"]["Enums"]["player_ruolo"]
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          creato_il: string
          display_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          creato_il?: string
          display_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          creato_il?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          lobby_id: string | null
          pezzi: number | null
          player_id: string | null
          punti: number | null
          username: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_lobby_id_fkey"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_order: {
        Args: { p_dish: string; p_player: string }
        Returns: undefined
      }
      create_lobby: {
        Args: { p_codice: string; p_username: string }
        Returns: {
          codice_accesso: string
          creato_il: string
          id: string
          stato: Database["public"]["Enums"]["lobby_stato"]
        }
        SetofOptions: {
          from: "*"
          to: "lobbies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_player_id: { Args: { p_lobby: string }; Returns: string }
      delete_my_account: { Args: never; Returns: undefined }
      is_lobby_host: { Args: { p_lobby: string }; Returns: boolean }
      mark_eaten: { Args: { p_order: string }; Returns: undefined }
      my_lobby_ids: { Args: never; Returns: string[] }
      seed_default_dishes: { Args: { p_lobby: string }; Returns: undefined }
    }
    Enums: {
      lobby_stato: "creata" | "in_corso" | "completata"
      order_stato: "in_attesa" | "consegnato"
      player_ruolo: "host" | "player"
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
      lobby_stato: ["creata", "in_corso", "completata"],
      order_stato: ["in_attesa", "consegnato"],
      player_ruolo: ["host", "player"],
    },
  },
} as const
