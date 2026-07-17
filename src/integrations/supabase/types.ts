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
      cartoes: {
        Row: {
          ativo: boolean
          banco: string
          bandeira: string
          bloqueado: boolean
          cor: string
          created_at: string
          criado_por: string | null
          dia_fechamento: number
          dia_vencimento: number
          id: string
          limite: number | null
          nome: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ativo?: boolean
          banco: string
          bandeira: string
          bloqueado?: boolean
          cor?: string
          created_at?: string
          criado_por?: string | null
          dia_fechamento: number
          dia_vencimento: number
          id?: string
          limite?: number | null
          nome: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ativo?: boolean
          banco?: string
          bandeira?: string
          bloqueado?: boolean
          cor?: string
          created_at?: string
          criado_por?: string | null
          dia_fechamento?: number
          dia_vencimento?: number
          id?: string
          limite?: number | null
          nome?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cartoes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      investimentos: {
        Row: {
          arquivado: boolean
          atualizado_em: string | null
          cor: string
          created_at: string
          criado_por: string | null
          id: string
          nome: string
          observacao: string | null
          preco_medio: number
          quantidade: number
          ticker: string | null
          tipo: string
          updated_at: string
          valor_atual_unitario: number | null
          workspace_id: string
        }
        Insert: {
          arquivado?: boolean
          atualizado_em?: string | null
          cor?: string
          created_at?: string
          criado_por?: string | null
          id?: string
          nome: string
          observacao?: string | null
          preco_medio?: number
          quantidade?: number
          ticker?: string | null
          tipo: string
          updated_at?: string
          valor_atual_unitario?: number | null
          workspace_id: string
        }
        Update: {
          arquivado?: boolean
          atualizado_em?: string | null
          cor?: string
          created_at?: string
          criado_por?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          preco_medio?: number
          quantidade?: number
          ticker?: string | null
          tipo?: string
          updated_at?: string
          valor_atual_unitario?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investimentos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          arquivada: boolean
          categoria_id: string | null
          concluida: boolean
          cor: string
          created_at: string
          criado_por: string | null
          icone: string
          id: string
          nome: string
          prazo: string | null
          tipo: string
          updated_at: string
          valor_alvo: number
          valor_atual: number
          workspace_id: string
        }
        Insert: {
          arquivada?: boolean
          categoria_id?: string | null
          concluida?: boolean
          cor?: string
          created_at?: string
          criado_por?: string | null
          icone?: string
          id?: string
          nome: string
          prazo?: string | null
          tipo?: string
          updated_at?: string
          valor_alvo: number
          valor_atual?: number
          workspace_id: string
        }
        Update: {
          arquivada?: boolean
          categoria_id?: string | null
          concluida?: boolean
          cor?: string
          created_at?: string
          criado_por?: string | null
          icone?: string
          id?: string
          nome?: string
          prazo?: string | null
          tipo?: string
          updated_at?: string
          valor_alvo?: number
          valor_atual?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_aportes: {
        Row: {
          created_at: string
          criado_por: string | null
          data: string
          id: string
          meta_id: string
          observacao: string | null
          valor: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          data?: string
          id?: string
          meta_id: string
          observacao?: string | null
          valor: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          data?: string
          id?: string
          meta_id?: string
          observacao?: string | null
          valor?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_aportes_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_aportes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      faturas: {
        Row: {
          cartao_id: string
          created_at: string
          data_fechamento: string
          data_vencimento: string
          id: string
          mes_referencia: string
          pago_em: string | null
          status: string
          transacao_pagamento_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cartao_id: string
          created_at?: string
          data_fechamento: string
          data_vencimento: string
          id?: string
          mes_referencia: string
          pago_em?: string | null
          status?: string
          transacao_pagamento_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cartao_id?: string
          created_at?: string
          data_fechamento?: string
          data_vencimento?: string
          id?: string
          mes_referencia?: string
          pago_em?: string | null
          status?: string
          transacao_pagamento_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faturas_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "cartoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_transacao_pagamento_id_fkey"
            columns: ["transacao_pagamento_id"]
            isOneToOne: false
            referencedRelation: "transacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
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
          avatar_url?: string | null
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
          avatar_url?: string | null
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
      transacoes_cartao: {
        Row: {
          cartao_id: string
          categoria_id: string | null
          created_at: string
          criado_por: string | null
          data_compra: string
          descricao: string
          fatura_id: string
          grupo_compra_id: string
          id: string
          observacao: string | null
          parcela_atual: number
          parcelas_total: number
          updated_at: string
          valor_parcela: number
          valor_total: number
          workspace_id: string
        }
        Insert: {
          cartao_id: string
          categoria_id?: string | null
          created_at?: string
          criado_por?: string | null
          data_compra: string
          descricao: string
          fatura_id: string
          grupo_compra_id: string
          id?: string
          observacao?: string | null
          parcela_atual?: number
          parcelas_total?: number
          updated_at?: string
          valor_parcela: number
          valor_total: number
          workspace_id: string
        }
        Update: {
          cartao_id?: string
          categoria_id?: string | null
          created_at?: string
          criado_por?: string | null
          data_compra?: string
          descricao?: string
          fatura_id?: string
          grupo_compra_id?: string
          id?: string
          observacao?: string | null
          parcela_atual?: number
          parcelas_total?: number
          updated_at?: string
          valor_parcela?: number
          valor_total?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_cartao_cartao_id_fkey"
            columns: ["cartao_id"]
            isOneToOne: false
            referencedRelation: "cartoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_cartao_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_cartao_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_cartao_workspace_id_fkey"
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
      [_ in never]: never
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
