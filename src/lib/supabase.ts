import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types (will be generated from your Supabase schema)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          full_name: string | null
          user_type: 'buyer' | 'seller' | 'admin'
          created_at: string
          updated_at: string
          avatar_url: string | null
          phone: string | null
          is_verified: boolean
        }
        Insert: {
          id?: string
          email: string
          username: string
          full_name?: string | null
          user_type: 'buyer' | 'seller' | 'admin'
          created_at?: string
          updated_at?: string
          avatar_url?: string | null
          phone?: string | null
          is_verified?: boolean
        }
        Update: {
          id?: string
          email?: string
          username?: string
          full_name?: string | null
          user_type?: 'buyer' | 'seller' | 'admin'
          created_at?: string
          updated_at?: string
          avatar_url?: string | null
          phone?: string | null
          is_verified?: boolean
        }
      }
      listings: {
        Row: {
          id: string
          seller_id: string
          title: string
          description: string
          category: string
          subcategory: string | null
          base_price: number
          game_type: string
          game_name: string
          total_quantity: number
          available_quantity: number
          sold_quantity: number
          status: 'draft' | 'active' | 'paused' | 'sold_out' | 'ended'
          is_sponsored: boolean
          sponsorship_end_date: string | null
          current_base_amount: number
          participant_count: number
          is_base_met_for_current: boolean
          current_competition_id: string | null
          created_at: string
          updated_at: string
          last_sold_at: string | null
          views: number
          clicks: number
          conversions: number
          processing_time: string
          shipping_profile: string
          return_policy: string
          platform_fee_percentage: number
          listing_maintenance_fee: number
          next_maintenance_due: string
        }
        Insert: {
          id?: string
          seller_id: string
          title: string
          description: string
          category: string
          subcategory?: string | null
          base_price: number
          game_type: string
          game_name: string
          total_quantity: number
          available_quantity: number
          sold_quantity?: number
          status?: 'draft' | 'active' | 'paused' | 'sold_out' | 'ended'
          is_sponsored?: boolean
          sponsorship_end_date?: string | null
          current_base_amount?: number
          participant_count?: number
          is_base_met_for_current?: boolean
          current_competition_id?: string | null
          created_at?: string
          updated_at?: string
          last_sold_at?: string | null
          views?: number
          clicks?: number
          conversions?: number
          processing_time: string
          shipping_profile: string
          return_policy: string
          platform_fee_percentage?: number
          listing_maintenance_fee?: number
          next_maintenance_due?: string
        }
        Update: {
          id?: string
          seller_id?: string
          title?: string
          description?: string
          category?: string
          subcategory?: string | null
          base_price?: number
          game_type?: string
          game_name?: string
          total_quantity?: number
          available_quantity?: number
          sold_quantity?: number
          status?: 'draft' | 'active' | 'paused' | 'sold_out' | 'ended'
          is_sponsored?: boolean
          sponsorship_end_date?: string | null
          current_base_amount?: number
          participant_count?: number
          is_base_met_for_current?: boolean
          current_competition_id?: string | null
          created_at?: string
          updated_at?: string
          last_sold_at?: string | null
          views?: number
          clicks?: number
          conversions?: number
          processing_time?: string
          shipping_profile?: string
          return_policy?: string
          platform_fee_percentage?: number
          listing_maintenance_fee?: number
          next_maintenance_due?: string
        }
      }
      transactions: {
        Row: {
          id: string
          listing_id: string
          buyer_id: string
          seller_id: string
          amount: number
          platform_fee: number
          seller_payout: number
          status: 'pending' | 'completed' | 'failed' | 'escrowed'
          created_at: string
          updated_at: string
          escrow_release_date: string | null
          completed_at: string | null
          payout_processed_at: string | null
          item_title: string
          winner_score: number | null
        }
        Insert: {
          id?: string
          listing_id: string
          buyer_id: string
          seller_id: string
          amount: number
          platform_fee: number
          seller_payout: number
          status?: 'pending' | 'completed' | 'failed' | 'escrowed'
          created_at?: string
          updated_at?: string
          escrow_release_date?: string | null
          completed_at?: string | null
          payout_processed_at?: string | null
          item_title: string
          winner_score?: number | null
        }
        Update: {
          id?: string
          listing_id?: string
          buyer_id?: string
          seller_id?: string
          amount?: number
          platform_fee?: number
          seller_payout?: number
          status?: 'pending' | 'completed' | 'failed' | 'escrowed'
          created_at?: string
          updated_at?: string
          escrow_release_date?: string | null
          completed_at?: string | null
          payout_processed_at?: string | null
          item_title?: string
          winner_score?: number | null
        }
      }
      competitions: {
        Row: {
          id: string
          listing_id: string
          instance_number: number
          base_price: number
          current_amount: number
          participant_count: number
          status: 'collecting' | 'active' | 'completed' | 'cancelled'
          started_at: string | null
          ends_at: string | null
          winner_id: string | null
          winner_username: string | null
          winning_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          instance_number: number
          base_price: number
          current_amount?: number
          participant_count?: number
          status?: 'collecting' | 'active' | 'completed' | 'cancelled'
          started_at?: string | null
          ends_at?: string | null
          winner_id?: string | null
          winner_username?: string | null
          winning_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          instance_number?: number
          base_price?: number
          current_amount?: number
          participant_count?: number
          status?: 'collecting' | 'active' | 'completed' | 'cancelled'
          started_at?: string | null
          ends_at?: string | null
          winner_id?: string | null
          winner_username?: string | null
          winning_score?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      tournament_entries: {
        Row: {
          id: string
          tournament_id: string
          user_id: string
          username: string
          entry_amount: number
          score: number | null
          status: 'pending' | 'completed' | 'winner'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          user_id: string
          username: string
          entry_amount: number
          score?: number | null
          status?: 'pending' | 'completed' | 'winner'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          user_id?: string
          username?: string
          entry_amount?: number
          score?: number | null
          status?: 'pending' | 'completed' | 'winner'
          created_at?: string
          updated_at?: string
        }
      }
      seller_payouts: {
        Row: {
          id: string
          seller_id: string
          transaction_id: string
          listing_id: string
          amount: number
          platform_fee: number
          gross_amount: number
          payout_method: 'bank' | 'paypal'
          status: 'pending' | 'processing' | 'completed' | 'failed'
          scheduled_date: string
          processed_date: string | null
          failure_reason: string | null
          payout_reference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          transaction_id: string
          listing_id: string
          amount: number
          platform_fee: number
          gross_amount: number
          payout_method: 'bank' | 'paypal'
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          scheduled_date: string
          processed_date?: string | null
          failure_reason?: string | null
          payout_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          transaction_id?: string
          listing_id?: string
          amount?: number
          platform_fee?: number
          gross_amount?: number
          payout_method?: 'bank' | 'paypal'
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          scheduled_date?: string
          processed_date?: string | null
          failure_reason?: string | null
          payout_reference?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
