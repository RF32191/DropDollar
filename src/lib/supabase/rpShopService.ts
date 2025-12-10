import { supabase } from './client';

export interface RPShopListing {
  id: string;
  title: string;
  description: string;
  rp_cost: number;
  item_type: 'cosmetic' | 'boost' | 'badge' | 'token_bonus' | 'special' | 'other';
  item_value: number | null;
  image_url: string | null;
  is_active: boolean;
  stock_quantity: number | null;
  purchase_limit_per_user: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RPShopListingWithAvailability extends RPShopListing {
  can_purchase: boolean;
  purchase_count: number;
  stock_remaining: number | null;
}

export interface RPPurchase {
  id: string;
  listing_id: string;
  rp_cost: number;
  item_type: string;
  item_value: number | null;
  purchase_data: any;
  created_at: string;
}

export class RPShopService {
  /**
   * Get all available RP shop listings for a user
   */
  static async getListings(userId: string): Promise<RPShopListingWithAvailability[]> {
    try {
      const { data, error } = await supabase.rpc('get_rp_shop_listings', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching RP shop listings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception fetching RP shop listings:', error);
      return [];
    }
  }

  /**
   * Purchase an item from the RP shop
   */
  static async purchaseItem(
    userId: string,
    listingId: string
  ): Promise<{ success: boolean; error?: string; remaining_rp?: number; purchase_id?: string }> {
    try {
      const { data, error } = await supabase.rpc('purchase_rp_shop_item', {
        p_user_id: userId,
        p_listing_id: listingId
      });

      if (error) {
        console.error('Error purchasing item:', error);
        return { success: false, error: error.message };
      }

      if (!data || !data.success) {
        return { success: false, error: data?.error || 'Purchase failed' };
      }

      return {
        success: true,
        remaining_rp: data.remaining_rp,
        purchase_id: data.purchase_id
      };
    } catch (error: any) {
      console.error('Exception purchasing item:', error);
      return { success: false, error: error.message || 'Purchase failed' };
    }
  }

  /**
   * Get user's purchase history
   */
  static async getUserPurchases(userId: string): Promise<RPPurchase[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_rp_purchases', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching user purchases:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception fetching user purchases:', error);
      return [];
    }
  }

  /**
   * Admin: Create a new RP shop listing
   */
  static async createListing(listing: Omit<RPShopListing, 'id' | 'created_at' | 'updated_at'>): Promise<RPShopListing | null> {
    try {
      const { data, error } = await supabase
        .from('rp_shop_listings')
        .insert(listing)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating listing:', error);
      return null;
    }
  }

  /**
   * Admin: Update an RP shop listing
   */
  static async updateListing(
    listingId: string,
    updates: Partial<RPShopListing>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rp_shop_listings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', listingId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating listing:', error);
      return false;
    }
  }

  /**
   * Admin: Delete an RP shop listing
   */
  static async deleteListing(listingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rp_shop_listings')
        .delete()
        .eq('id', listingId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting listing:', error);
      return false;
    }
  }

  /**
   * Admin: Get all listings (including inactive)
   */
  static async getAllListings(): Promise<RPShopListing[]> {
    try {
      const { data, error } = await supabase
        .from('rp_shop_listings')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all listings:', error);
      return [];
    }
  }
}

