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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      event_assignments: {
        Row: {
          area: string
          event_id: string
          id: string
          member_id: string
        }
        Insert: {
          area: string
          event_id: string
          id?: string
          member_id: string
        }
        Update: {
          area?: string
          event_id?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_decorations: {
        Row: {
          event_id: string
          id: string
          inventory_item_id: string | null
          notes: string | null
          sort_order: number
          title: string
        }
        Insert: {
          event_id: string
          id?: string
          inventory_item_id?: string | null
          notes?: string | null
          sort_order?: number
          title: string
        }
        Update: {
          event_id?: string
          id?: string
          inventory_item_id?: string | null
          notes?: string | null
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_decorations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_decorations_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      event_photos: {
        Row: {
          created_at: string
          event_id: string
          path: string
        }
        Insert: {
          created_at?: string
          event_id: string
          path: string
        }
        Update: {
          created_at?: string
          event_id?: string
          path?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_shopping_items: {
        Row: {
          done: boolean
          event_id: string
          id: string
          menu_ingredient_id: string | null
          name: string
          notes: string | null
          qty_per_person: string | null
          sort_order: number
          where_to_buy: string | null
        }
        Insert: {
          done?: boolean
          event_id: string
          id?: string
          menu_ingredient_id?: string | null
          name: string
          notes?: string | null
          qty_per_person?: string | null
          sort_order?: number
          where_to_buy?: string | null
        }
        Update: {
          done?: boolean
          event_id?: string
          id?: string
          menu_ingredient_id?: string | null
          name?: string
          notes?: string | null
          qty_per_person?: string | null
          sort_order?: number
          where_to_buy?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_shopping_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_shopping_items_menu_ingredient_id_fkey"
            columns: ["menu_ingredient_id"]
            isOneToOne: false
            referencedRelation: "menu_ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tasks: {
        Row: {
          created_at: string
          done: boolean
          event_id: string
          id: string
          member_id: string | null
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          event_id: string
          id?: string
          member_id?: string | null
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          done?: boolean
          event_id?: string
          id?: string
          member_id?: string | null
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tasks_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_inventory: {
        Row: {
          event_id: string
          id: string
          item_id: string
          quantity: number | null
        }
        Insert: {
          event_id: string
          id?: string
          item_id: string
          quantity?: number | null
        }
        Update: {
          event_id?: string
          id?: string
          item_id?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_inventory_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          event_date: string
          event_time: string | null
          expected_people: number | null
          food_label: string | null
          id: string
          location: string | null
          maps_url: string | null
          menu_id: string | null
          notes: string | null
          phones: string | null
          photo_enabled: boolean
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_time?: string | null
          expected_people?: number | null
          food_label?: string | null
          id?: string
          location?: string | null
          maps_url?: string | null
          menu_id?: string | null
          notes?: string | null
          phones?: string | null
          photo_enabled?: boolean
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_time?: string | null
          expected_people?: number | null
          food_label?: string | null
          id?: string
          location?: string | null
          maps_url?: string | null
          menu_id?: string | null
          notes?: string | null
          phones?: string | null
          photo_enabled?: boolean
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_entries: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          event_id: string | null
          id: string
          kind: string
          receipt_path: string | null
          reimbursement_status: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description: string
          entry_date?: string
          event_id?: string | null
          id?: string
          kind?: string
          receipt_path?: string | null
          reimbursement_status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          event_id?: string | null
          id?: string
          kind?: string
          receipt_path?: string | null
          reimbursement_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_prices: {
        Row: {
          id: string
          name: string
          pack_quantity: number
          price: number
          unit: string
          updated_at: string
          where_to_buy: string | null
        }
        Insert: {
          id?: string
          name: string
          pack_quantity: number
          price: number
          unit: string
          updated_at?: string
          where_to_buy?: string | null
        }
        Update: {
          id?: string
          name?: string
          pack_quantity?: number
          price?: number
          unit?: string
          updated_at?: string
          where_to_buy?: string | null
        }
        Relationships: []
      }
      inventory_sectors: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          location: string | null
          name: string
          notes: string | null
          quantity: number | null
          quantity_note: string | null
          sector: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          location?: string | null
          name: string
          notes?: string | null
          quantity?: number | null
          quantity_note?: string | null
          sector: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          quantity?: number | null
          quantity_note?: string | null
          sector?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          delta: number
          id: string
          item_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delta: number
          id?: string
          item_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: string
          item_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          active: boolean
          areas: string[]
          created_at: string
          email: string
          full_name: string
          id: string
          invited_role: Database["public"]["Enums"]["app_role"]
          phone: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean
          areas?: string[]
          created_at?: string
          email: string
          full_name: string
          id?: string
          invited_role?: Database["public"]["Enums"]["app_role"]
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean
          areas?: string[]
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          invited_role?: Database["public"]["Enums"]["app_role"]
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      menu_ingredients: {
        Row: {
          id: string
          kind: string
          menu_id: string
          name: string
          notes: string | null
          qty_per_person: string | null
          sort_order: number
          where_to_buy: string | null
        }
        Insert: {
          id?: string
          kind?: string
          menu_id: string
          name: string
          notes?: string | null
          qty_per_person?: string | null
          sort_order?: number
          where_to_buy?: string | null
        }
        Update: {
          id?: string
          kind?: string
          menu_id?: string
          name?: string
          notes?: string | null
          qty_per_person?: string | null
          sort_order?: number
          where_to_buy?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_ingredients_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          charged_price_per_person: number | null
          created_at: string
          description: string | null
          id: string
          min_price_per_person: number | null
          name: string
          prep_instructions: string | null
        }
        Insert: {
          charged_price_per_person?: number | null
          created_at?: string
          description?: string | null
          id?: string
          min_price_per_person?: number | null
          name: string
          prep_instructions?: string | null
        }
        Update: {
          charged_price_per_person?: number | null
          created_at?: string
          description?: string | null
          id?: string
          min_price_per_person?: number | null
          name?: string
          prep_instructions?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_invited_email: { Args: { _email: string }; Returns: boolean }
      is_team_member: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "membro"
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
      app_role: ["admin", "membro"],
    },
  },
} as const
