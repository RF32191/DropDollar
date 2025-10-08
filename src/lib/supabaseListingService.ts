import { supabase } from './supabase'
import type { Database } from './supabase'

type Listing = Database['public']['Tables']['listings']['Row']
type ListingInsert = Database['public']['Tables']['listings']['Insert']
type ListingUpdate = Database['public']['Tables']['listings']['Update']
type Competition = Database['public']['Tables']['competitions']['Row']
type CompetitionInsert = Database['public']['Tables']['competitions']['Insert']
type Transaction = Database['public']['Tables']['transactions']['Row']

export interface ListingWithImages extends Listing {
  images: Array<{
    id: string
    image_url: string
    filename: string
    is_primary: boolean
  }>
  seller: {
    username: string
    full_name: string | null
  }
}

export interface CompetitionWithParticipants extends Competition {
  participants: Array<{
    id: string
    user_id: string
    username: string
    entry_amount: number
    entry_count: number
    best_score: number | null
  }>
}

export class SupabaseListingService {
  // Create new listing
  static async createListing(
    sellerId: string,
    listingData: {
      title: string
      description: string
      category: string
      subcategory?: string
      basePrice: number
      gameType: string
      totalQuantity: number
      processingTime: string
      shippingProfile: string
      returnPolicy: string
    }
  ): Promise<{ listing: Listing | null; error: string | null }> {
    try {
      const gameName = this.getGameDisplayName(listingData.gameType)
      
      const { data, error } = await supabase
        .from('listings')
        .insert({
          seller_id: sellerId,
          title: listingData.title,
          description: listingData.description,
          category: listingData.category,
          subcategory: listingData.subcategory || null,
          base_price: listingData.basePrice,
          game_type: listingData.gameType,
          game_name: gameName,
          total_quantity: listingData.totalQuantity,
          available_quantity: listingData.totalQuantity,
          processing_time: listingData.processingTime,
          shipping_profile: listingData.shippingProfile,
          return_policy: listingData.returnPolicy,
          status: 'draft'
        })
        .select()
        .single()

      if (error) {
        console.error('Create listing error:', error)
        return { listing: null, error: error.message }
      }

      return { listing: data, error: null }
    } catch (error) {
      console.error('Create listing error:', error)
      return { listing: null, error: 'Failed to create listing' }
    }
  }

  // Get listing by ID
  static async getListing(listingId: string): Promise<{ listing: ListingWithImages | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          images:listing_images(*),
          seller:users(username, full_name)
        `)
        .eq('id', listingId)
        .single()

      if (error) {
        console.error('Get listing error:', error)
        return { listing: null, error: error.message }
      }

      return { listing: data as ListingWithImages, error: null }
    } catch (error) {
      console.error('Get listing error:', error)
      return { listing: null, error: 'Failed to get listing' }
    }
  }

  // Get active listings
  static async getActiveListings(category?: string): Promise<{ listings: ListingWithImages[]; error: string | null }> {
    try {
      let query = supabase
        .from('listings')
        .select(`
          *,
          images:listing_images(*),
          seller:users(username, full_name)
        `)
        .eq('status', 'active')

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query.order('updated_at', { ascending: false })

      if (error) {
        console.error('Get active listings error:', error)
        return { listings: [], error: error.message }
      }

      return { listings: data as ListingWithImages[], error: null }
    } catch (error) {
      console.error('Get active listings error:', error)
      return { listings: [], error: 'Failed to get listings' }
    }
  }

  // Get seller's listings
  static async getSellerListings(sellerId: string): Promise<{ listings: ListingWithImages[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          images:listing_images(*),
          seller:users(username, full_name)
        `)
        .eq('seller_id', sellerId)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Get seller listings error:', error)
        return { listings: [], error: error.message }
      }

      return { listings: data as ListingWithImages[], error: null }
    } catch (error) {
      console.error('Get seller listings error:', error)
      return { listings: [], error: 'Failed to get seller listings' }
    }
  }

  // Add images to listing
  static async addImages(
    listingId: string,
    images: Array<{ url: string; filename: string; fileSize: number; isPrimary: boolean }>
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('listing_images')
        .insert(
          images.map(img => ({
            listing_id: listingId,
            image_url: img.url,
            filename: img.filename,
            file_size: img.fileSize,
            is_primary: img.isPrimary
          }))
        )

      if (error) {
        console.error('Add images error:', error)
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Add images error:', error)
      return { success: false, error: 'Failed to add images' }
    }
  }

  // Publish listing
  static async publishListing(listingId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: 'active' })
        .eq('id', listingId)

      if (error) {
        console.error('Publish listing error:', error)
        return { success: false, error: error.message }
      }

      // Create first competition instance
      await this.createCompetitionInstance(listingId)

      return { success: true, error: null }
    } catch (error) {
      console.error('Publish listing error:', error)
      return { success: false, error: 'Failed to publish listing' }
    }
  }

  // Create competition instance
  static async createCompetitionInstance(listingId: string): Promise<{ competition: Competition | null; error: string | null }> {
    try {
      // Get listing details
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('base_price, sold_quantity')
        .eq('id', listingId)
        .single()

      if (listingError || !listing) {
        return { competition: null, error: 'Listing not found' }
      }

      const { data, error } = await supabase
        .from('competitions')
        .insert({
          listing_id: listingId,
          instance_number: listing.sold_quantity + 1,
          base_price: listing.base_price,
          status: 'collecting'
        })
        .select()
        .single()

      if (error) {
        console.error('Create competition error:', error)
        return { competition: null, error: error.message }
      }

      // Update listing with current competition ID
      await supabase
        .from('listings')
        .update({ current_competition_id: data.id })
        .eq('id', listingId)

      return { competition: data, error: null }
    } catch (error) {
      console.error('Create competition error:', error)
      return { competition: null, error: 'Failed to create competition' }
    }
  }

  // Add participant to competition
  static async addParticipant(
    listingId: string,
    userId: string,
    username: string,
    entryAmount: number
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Get current competition
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('current_competition_id, base_price')
        .eq('id', listingId)
        .single()

      if (listingError || !listing?.current_competition_id) {
        return { success: false, error: 'No active competition found' }
      }

      // Check if user already participated
      const { data: existingParticipant } = await supabase
        .from('competition_participants')
        .select('*')
        .eq('competition_id', listing.current_competition_id)
        .eq('user_id', userId)
        .single()

      if (existingParticipant) {
        // Update existing participant
        const { error: updateError } = await supabase
          .from('competition_participants')
          .update({
            entry_amount: existingParticipant.entry_amount + entryAmount,
            entry_count: existingParticipant.entry_count + 1
          })
          .eq('id', existingParticipant.id)

        if (updateError) {
          return { success: false, error: updateError.message }
        }
      } else {
        // Add new participant
        const { error: insertError } = await supabase
          .from('competition_participants')
          .insert({
            competition_id: listing.current_competition_id,
            user_id: userId,
            username: username,
            entry_amount: entryAmount,
            entry_count: 1
          })

        if (insertError) {
          return { success: false, error: insertError.message }
        }
      }

      // Update competition totals
      const { data: participants } = await supabase
        .from('competition_participants')
        .select('entry_amount')
        .eq('competition_id', listing.current_competition_id)

      const totalAmount = participants?.reduce((sum, p) => sum + p.entry_amount, 0) || 0
      const participantCount = participants?.length || 0

      const { error: competitionUpdateError } = await supabase
        .from('competitions')
        .update({
          current_amount: totalAmount,
          participant_count: participantCount
        })
        .eq('id', listing.current_competition_id)

      if (competitionUpdateError) {
        return { success: false, error: competitionUpdateError.message }
      }

      // Update listing totals
      const { error: listingUpdateError } = await supabase
        .from('listings')
        .update({
          current_base_amount: totalAmount,
          participant_count: participantCount,
          is_base_met_for_current: totalAmount >= listing.base_price,
          conversions: supabase.raw('conversions + 1')
        })
        .eq('id', listingId)

      if (listingUpdateError) {
        return { success: false, error: listingUpdateError.message }
      }

      // Check if base price is met and activate competition
      if (totalAmount >= listing.base_price) {
        const endsAt = new Date()
        endsAt.setHours(endsAt.getHours() + 24)

        await supabase
          .from('competitions')
          .update({
            status: 'active',
            started_at: new Date().toISOString(),
            ends_at: endsAt.toISOString()
          })
          .eq('id', listing.current_competition_id)
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Add participant error:', error)
      return { success: false, error: 'Failed to add participant' }
    }
  }

  // Complete competition
  static async completeCompetition(
    competitionId: string,
    winnerId: string,
    winnerUsername: string,
    winningScore: number
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      // Update competition
      const { error: competitionError } = await supabase
        .from('competitions')
        .update({
          status: 'completed',
          winner_id: winnerId,
          winner_username: winnerUsername,
          winning_score: winningScore
        })
        .eq('id', competitionId)

      if (competitionError) {
        return { success: false, error: competitionError.message }
      }

      // Get competition details
      const { data: competition } = await supabase
        .from('competitions')
        .select('listing_id, current_amount')
        .eq('id', competitionId)
        .single()

      if (!competition) {
        return { success: false, error: 'Competition not found' }
      }

      // Update listing
      const { error: listingError } = await supabase
        .from('listings')
        .update({
          sold_quantity: supabase.raw('sold_quantity + 1'),
          available_quantity: supabase.raw('available_quantity - 1'),
          last_sold_at: new Date().toISOString()
        })
        .eq('id', competition.listing_id)

      if (listingError) {
        return { success: false, error: listingError.message }
      }

      // Create transaction record
      const { data: listing } = await supabase
        .from('listings')
        .select('seller_id, title, available_quantity')
        .eq('id', competition.listing_id)
        .single()

      if (listing) {
        const platformFee = competition.current_amount * 0.12
        const sellerPayout = competition.current_amount - platformFee

        await supabase
          .from('transactions')
          .insert({
            listing_id: competition.listing_id,
            buyer_id: winnerId,
            seller_id: listing.seller_id,
            amount: competition.current_amount,
            platform_fee: platformFee,
            seller_payout: sellerPayout,
            status: 'escrowed',
            item_title: listing.title,
            winner_score: winningScore
          })

        // Create new competition if more quantity available
        if (listing.available_quantity > 0) {
          await this.createCompetitionInstance(competition.listing_id)
        } else {
          // Mark listing as sold out
          await supabase
            .from('listings')
            .update({ status: 'sold_out' })
            .eq('id', competition.listing_id)
        }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Complete competition error:', error)
      return { success: false, error: 'Failed to complete competition' }
    }
  }

  // Track listing view
  static async trackView(listingId: string): Promise<void> {
    try {
      await supabase
        .from('listings')
        .update({ views: supabase.raw('views + 1') })
        .eq('id', listingId)
    } catch (error) {
      console.error('Track view error:', error)
    }
  }

  // Track listing click
  static async trackClick(listingId: string): Promise<void> {
    try {
      await supabase
        .from('listings')
        .update({ clicks: supabase.raw('clicks + 1') })
        .eq('id', listingId)
    } catch (error) {
      console.error('Track click error:', error)
    }
  }

  // Calculate seller earnings
  static async calculateSellerEarnings(listingId: string): Promise<{
    grossRevenue: number
    platformFee: number
    maintenanceFees: number
    netEarnings: number
    nextMaintenanceDue: Date | null
  }> {
    try {
      const { data: listing } = await supabase
        .from('listings')
        .select('sold_quantity, base_price, created_at, platform_fee_percentage, listing_maintenance_fee, next_maintenance_due')
        .eq('id', listingId)
        .single()

      if (!listing) {
        return { grossRevenue: 0, platformFee: 0, maintenanceFees: 0, netEarnings: 0, nextMaintenanceDue: null }
      }

      const grossRevenue = listing.sold_quantity * listing.base_price
      const platformFee = grossRevenue * listing.platform_fee_percentage
      
      // Calculate maintenance fees based on listing age
      const listingAge = Date.now() - new Date(listing.created_at).getTime()
      const monthsActive = Math.floor(listingAge / (30 * 24 * 60 * 60 * 1000))
      const maintenanceCycles = Math.floor(monthsActive / 4)
      const maintenanceFees = maintenanceCycles * listing.listing_maintenance_fee
      
      const netEarnings = grossRevenue - platformFee - maintenanceFees

      return {
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        platformFee: Math.round(platformFee * 100) / 100,
        maintenanceFees: Math.round(maintenanceFees * 100) / 100,
        netEarnings: Math.round(netEarnings * 100) / 100,
        nextMaintenanceDue: listing.next_maintenance_due ? new Date(listing.next_maintenance_due) : null
      }
    } catch (error) {
      console.error('Calculate seller earnings error:', error)
      return { grossRevenue: 0, platformFee: 0, maintenanceFees: 0, netEarnings: 0, nextMaintenanceDue: null }
    }
  }

  // Get game display name
  private static getGameDisplayName(gameType: string): string {
    const gameNames: { [key: string]: string } = {
      'multi-target': 'Multi-Target Reaction',
      'falling-objects': 'Falling Object Catch',
      'color-sequence': 'Color Sequence Memory'
    }
    return gameNames[gameType] || 'Skill Game'
  }

  // Get available categories
  static getCategories(): { [key: string]: string[] } {
    return {
      'Electronics': ['Smartphones', 'Laptops', 'Gaming', 'Audio', 'Cameras', 'Smart Home'],
      'Fashion': ['Clothing', 'Shoes', 'Accessories', 'Jewelry', 'Bags', 'Watches'],
      'Home & Garden': ['Furniture', 'Decor', 'Kitchen', 'Bedding', 'Tools', 'Outdoor'],
      'Sports & Outdoors': ['Fitness', 'Outdoor Gear', 'Sports Equipment', 'Athletic Wear'],
      'Automotive': ['Parts', 'Accessories', 'Tools', 'Electronics', 'Care Products'],
      'Collectibles': ['Trading Cards', 'Coins', 'Art', 'Vintage', 'Memorabilia'],
      'Books & Media': ['Books', 'Movies', 'Music', 'Games', 'Educational'],
      'Health & Beauty': ['Skincare', 'Makeup', 'Health', 'Personal Care', 'Supplements']
    }
  }
}

export default SupabaseListingService
