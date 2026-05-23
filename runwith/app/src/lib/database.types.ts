export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          name: string;
          name_kana: string;
          industry: string;
          phase: string;
          is_medical_mode: boolean;
          medical_fields: string[];
          founded_date: string | null;
          postal_code: string;
          address: string;
          representative_name: string;
          capital_amount: number;
          employee_count: number;
          description: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_kana?: string;
          industry?: string;
          phase?: string;
          is_medical_mode?: boolean;
          medical_fields?: string[];
          founded_date?: string | null;
          postal_code?: string;
          address?: string;
          representative_name?: string;
          capital_amount?: number;
          employee_count?: number;
          description?: string;
        };
        Update: {
          name?: string;
          name_kana?: string;
          industry?: string;
          phase?: string;
          is_medical_mode?: boolean;
          medical_fields?: string[];
          founded_date?: string | null;
          postal_code?: string;
          address?: string;
          representative_name?: string;
          capital_amount?: number;
          employee_count?: number;
          description?: string;
        };
        Relationships: [];
      };
      company_members: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          role: "owner" | "admin" | "member" | "viewer";
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          role?: "owner" | "admin" | "member" | "viewer";
        };
        Update: {
          role?: "owner" | "admin" | "member" | "viewer";
        };
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: "free" | "growth" | "pro";
          medical_addon: boolean;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          status: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan?: "free" | "growth" | "pro";
          medical_addon?: boolean;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          status?: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
        };
        Update: {
          plan?: "free" | "growth" | "pro";
          medical_addon?: boolean;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          cancel_at_period_end?: boolean;
          status?: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          id: string;
          company_id: string;
          invited_by: string | null;
          email: string;
          role: "admin" | "member" | "viewer";
          token: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          invited_by?: string | null;
          email: string;
          role?: "admin" | "member" | "viewer";
          token: string;
          expires_at: string;
          accepted_at?: string | null;
        };
        Update: {
          accepted_at?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          company_id: string | null;
          user_id: string | null;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          metadata: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          user_id?: string | null;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          resource_type?: string | null;
          resource_id?: string | null;
          metadata?: Json;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_company_with_member: {
        Args: {
          p_name: string;
          p_name_kana?: string;
          p_industry?: string;
          p_phase?: string;
          p_is_medical_mode?: boolean;
          p_medical_fields?: string[];
          p_founded_date?: string | null;
          p_postal_code?: string;
          p_address?: string;
          p_representative_name?: string;
          p_capital_amount?: number;
          p_employee_count?: number;
          p_description?: string;
        };
        Returns: Json;
      };
      user_is_member_of_company: {
        Args: { _company_id: string };
        Returns: boolean;
      };
      user_is_owner_of_company: {
        Args: { _company_id: string };
        Returns: boolean;
      };
      accept_invitation: {
        Args: { p_token: string };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
