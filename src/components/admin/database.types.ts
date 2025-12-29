export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      arena_closures: {
        Row: {
          id: string
          tenant_id: string | null
          start_date: string
          end_date: string
          reason: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          start_date: string
          end_date: string
          reason?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string | null
          start_date?: string
          end_date?: string
          reason?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_closures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      arena_events: {
        Row: {
          id: string
          tenant_id: string | null
          event_type: string
          payload: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          event_type: string
          payload?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string | null
          event_type?: string
          payload?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      arena_reservations: {
        Row: {
          id: string
          tenant_id: string | null
          customer_name: string
          customer_phone: string | null
          start_time: string
          end_time: string
          total_price: number | null
          payment_status: string | null
          created_at: string | null
          slot_id: string | null
          updated_at: string | null
          court_id: string | null
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          customer_name: string
          customer_phone?: string | null
          start_time: string
          end_time: string
          total_price?: number | null
          payment_status?: string | null
          created_at?: string | null
          slot_id?: string | null
          updated_at?: string | null
          court_id?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          start_time?: string
          end_time?: string
          total_price?: number | null
          payment_status?: string | null
          created_at?: string | null
          slot_id?: string | null
          updated_at?: string | null
          court_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_reservations_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_reservations_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "arena_time_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      arena_time_slots: {
        Row: {
          id: string
          tenant_id: string | null
          date: string
          time: string
          status: Database["public"]["Enums"]["arena_slot_status"] | null
          price_override: number | null
          is_promotion: boolean | null
          created_at: string | null
          court_id: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          date: string
          time: string
          status?: Database["public"]["Enums"]["arena_slot_status"] | null
          price_override?: number | null
          is_promotion?: boolean | null
          created_at?: string | null
          court_id?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string | null
          date?: string
          time?: string
          status?: Database["public"]["Enums"]["arena_slot_status"] | null
          price_override?: number | null
          is_promotion?: boolean | null
          created_at?: string | null
          court_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arena_time_slots_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arena_time_slots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      clients: {
        Row: {
          id: string
          tenant_id: string | null
          name: string
          phone: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          name: string
          phone?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string | null
          name?: string
          phone?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      courts: {
        Row: {
          id: string
          tenant_id: string | null
          name: string
          description: string | null
          active: boolean | null
          created_at: string | null
          updated_at: string | null
          base_price: number | null
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          name: string
          description?: string | null
          active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          base_price?: number | null
        }
        Update: {
          id?: string
          tenant_id?: string | null
          name?: string
          description?: string | null
          active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          base_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      dental_orders: {
        Row: {
          id: string
          job_id: string | null
          dentist_name: string | null
          patient_name: string | null
          prosthesis_type: string | null
          material: string | null
          teeth: Json | null
          due_date: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          job_id?: string | null
          dentist_name?: string | null
          patient_name?: string | null
          prosthesis_type?: string | null
          material?: string | null
          teeth?: Json | null
          due_date?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string | null
          dentist_name?: string | null
          patient_name?: string | null
          prosthesis_type?: string | null
          material?: string | null
          teeth?: Json | null
          due_date?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dental_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          }
        ]
      }
      jobs: {
        Row: {
          id: string
          tenant_id: string | null
          client_id: string | null
          job_type: string
          status: Database["public"]["Enums"]["job_status"] | null
          scheduled_at: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          client_id?: string | null
          job_type: string
          status?: Database["public"]["Enums"]["job_status"] | null
          scheduled_at?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string | null
          client_id?: string | null
          job_type?: string
          status?: Database["public"]["Enums"]["job_status"] | null
          scheduled_at?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          id: string
          tenant_id: string | null
          amount: number
          gateway_fee: number | null
          net_amount: number | null
          status: Database["public"]["Enums"]["payment_status"] | null
          paid_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          amount: number
          gateway_fee?: number | null
          net_amount?: number | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          paid_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string | null
          amount?: number
          gateway_fee?: number | null
          net_amount?: number | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          paid_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          whatsapp: string | null
          is_super_admin: boolean | null
          created_at: string | null
          email: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          full_name?: string | null
          whatsapp?: string | null
          is_super_admin?: boolean | null
          created_at?: string | null
          email?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          whatsapp?: string | null
          is_super_admin?: boolean | null
          created_at?: string | null
          email?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      promotion_rules: {
        Row: {
          id: string
          tenant_id: string | null
          saas_category: string | null
          target_occupancy_threshold: number | null
          discount_percentage: number | null
          trigger_day_of_week: number | null
          active: boolean | null
          created_at: string | null
          promo_days: Json | null
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          saas_category?: string | null
          target_occupancy_threshold?: number | null
          discount_percentage?: number | null
          trigger_day_of_week?: number | null
          active?: boolean | null
          created_at?: string | null
          promo_days?: Json | null
        }
        Update: {
          id?: string
          tenant_id?: string | null
          saas_category?: string | null
          target_occupancy_threshold?: number | null
          discount_percentage?: number | null
          trigger_day_of_week?: number | null
          active?: boolean | null
          created_at?: string | null
          promo_days?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      tenants: {
        Row: {
          id: string
          saas_id: string
          owner_id: string | null
          business_name: string
          subdomain: string | null
          settings: Json | null
          created_at: string | null
          trial_ends_at: string | null
          updated_at: string | null
          phone: string | null
          address: string | null
          email: string | null
          description: string | null
        }
        Insert: {
          id?: string
          saas_id: string
          owner_id?: string | null
          business_name: string
          subdomain?: string | null
          settings?: Json | null
          created_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          phone?: string | null
          address?: string | null
          email?: string | null
          description?: string | null
        }
        Update: {
          id?: string
          saas_id?: string
          owner_id?: string | null
          business_name?: string
          subdomain?: string | null
          settings?: Json | null
          created_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          phone?: string | null
          address?: string | null
          email?: string | null
          description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      arena_slot_status: "available" | "booked" | "maintenance" | "reserved"
      job_status: "open" | "in_progress" | "completed" | "cancelled"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      subscription_status: "trial" | "active" | "cancelled" | "past_due"
    }
  }
}