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
      access_codes: {
        Row: {
          code: string
          created_at: string
          criado_por: string | null
          expira_em: string | null
          id: string
          notas: string | null
          status: string
          usado_em: string | null
          usado_por: string | null
        }
        Insert: {
          code: string
          created_at?: string
          criado_por?: string | null
          expira_em?: string | null
          id?: string
          notas?: string | null
          status?: string
          usado_em?: string | null
          usado_por?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          criado_por?: string | null
          expira_em?: string | null
          id?: string
          notas?: string | null
          status?: string
          usado_em?: string | null
          usado_por?: string | null
        }
        Relationships: []
      }
      categorias: {
        Row: {
          cor: string | null
          created_at: string
          criado_por: string | null
          id: string
          nome: string
          tipo: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          nome: string
          tipo: string
          user_id: string
          workspace_id: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          criado_por?: string | null
          id?: string
          nome?: string
          tipo?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_workspace_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contas: {
        Row: {
          categoria_id: string | null
          created_at: string
          criado_por: string | null
          descricao: string
          grupo_recorrencia: string | null
          id: string
          observacao: string | null
          pago_em: string | null
          recorrencia: string
          tipo: string
          transacao_id: string | null
          updated_at: string
          user_id: string
          valor: number
          vencimento: string
          workspace_id: string
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          criado_por?: string | null
          descricao: string
          grupo_recorrencia?: string | null
          id?: string
          observacao?: string | null
          pago_em?: string | null
          recorrencia?: string
          tipo: string
          transacao_id?: string | null
          updated_at?: string
          user_id: string
          valor: number
          vencimento: string
          workspace_id: string
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string
          grupo_recorrencia?: string | null
          id?: string
          observacao?: string | null
          pago_em?: string | null
          recorrencia?: string
          tipo?: string
          transacao_id?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
          vencimento?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_transacao_id_fkey"
            columns: ["transacao_id"]
            isOneToOne: false
            referencedRelation: "transacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_workspace_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bloqueado: boolean
          codigo_usado: string | null
          created_at: string
          email: string | null
          id: string
          nome: string | null
          tema: string
          updated_at: string
          workspace_ativo: string | null
        }
        Insert: {
          bloqueado?: boolean
          codigo_usado?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
          tema?: string
          updated_at?: string
          workspace_ativo?: string | null
        }
        Update: {
          bloqueado?: boolean
          codigo_usado?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          tema?: string
          updated_at?: string
          workspace_ativo?: string | null
        }
        Relationships: []
      }
      transacoes: {
        Row: {
          categoria_id: string | null
          created_at: string
          criado_por: string | null
          data: string
          descricao: string
          id: string
          observacao: string | null
          tipo: string
          updated_at: string
          user_id: string
          valor: number
          workspace_id: string
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          criado_por?: string | null
          data: string
          descricao: string
          id?: string
          observacao?: string | null
          tipo: string
          updated_at?: string
          user_id: string
          valor: number
          workspace_id: string
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          criado_por?: string | null
          data?: string
          descricao?: string
          id?: string
          observacao?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_workspace_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      workspace_invites: {
        Row: {
          aceito_em: string | null
          aceito_por: string | null
          created_at: string
          criado_por: string
          email_convidado: string
          expira_em: string
          id: string
          status: string
          token: string
          workspace_id: string
        }
        Insert: {
          aceito_em?: string | null
          aceito_por?: string | null
          created_at?: string
          criado_por: string
          email_convidado: string
          expira_em?: string
          id?: string
          status?: string
          token?: string
          workspace_id: string
        }
        Update: {
          aceito_em?: string | null
          aceito_por?: string | null
          created_at?: string
          criado_por?: string
          email_convidado?: string
          expira_em?: string
          id?: string
          status?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          cor: string
          entrou_em: string
          papel: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          cor?: string
          entrou_em?: string
          papel?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          cor?: string
          entrou_em?: string
          papel?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          criado_por: string
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por: string
          id?: string
          nome: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
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
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_owner: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      seed_workspace_categories: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
