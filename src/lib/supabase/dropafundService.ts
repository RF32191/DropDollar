import { supabase } from './client';

export interface DropAFundCampaign {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  story?: string;
  category_id?: string;
  subcategory_id?: string;
  
  // Media & Links
  image_urls?: string[];
  youtube_url?: string;
  
  // Funding Configuration
  funding_goal: number;
  current_funding: number;
  entry_cost: number;
  
  // Game Configuration
  game_type: 'multi-target' | 'falling-objects' | 'color-sequence';
  game_difficulty: 'easy' | 'medium' | 'hard';
  
  // Winner Configuration
  min_winners: number;
  max_winners: number;
  winner_selection_type: 'top_scores' | 'percentage_based' | 'threshold_based';
  winner_percentage?: number;
  score_threshold?: number;
  
  // Reward Structure
  reward_structure: {
    type: 'equal' | 'tiered' | 'percentage';
    rewards: Array<{
      position: number | string;
      amount: number;
      description: string;
    }>;
  };
  total_reward_pool: number;
  
  // Media
  image_urls?: string[];
  video_url?: string;
  
  // Status and Timing
  status: 'draft' | 'active' | 'funded' | 'completed' | 'cancelled';
  deadline?: string;
  
  // Stats
  total_participants: number;
  total_games_played: number;
  average_score: number;
  highest_score: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface DropAFundParticipant {
  id: string;
  campaign_id: string;
  user_id: string;
  username: string;
  
  // Performance
  best_score: number;
  average_score: number;
  total_attempts: number;
  total_contributed: number;
  
  // Ranking
  current_rank?: number;
  final_rank?: number;
  is_winner: boolean;
  reward_earned: number;
  reward_description?: string;
  reward_tier?: string;
  
  // Timestamps
  first_played_at: string;
  last_played_at: string;
  created_at: string;
  updated_at: string;
}

export interface DropAFundGameSession {
  id: string;
  campaign_id: string;
  participant_id: string;
  user_id: string;
  
  // Game Data
  game_type: string;
  score: number;
  accuracy?: number;
  reaction_time?: number;
  game_duration?: number;
  session_data?: any;
  
  // Contribution
  contribution_amount: number;
  
  // Performance Metrics
  is_personal_best: boolean;
  rank_at_time?: number;
  percentile?: number;
  
  // Timestamps
  played_at: string;
  created_at: string;
}

export interface ListingScoreboard {
  id: string;
  listing_id: string;
  listing_type: 'regular' | 'dropafund' | 'tournament';
  user_id: string;
  username: string;
  
  // Score Data
  best_score: number;
  average_score?: number;
  total_attempts: number;
  current_rank?: number;
  
  // Game Info
  game_type: string;
  last_played_at: string;
  
  // Performance Metrics
  accuracy?: number;
  avg_reaction_time?: number;
  consistency_score?: number;
  
  created_at: string;
  updated_at: string;
}

export class DropAFundService {
  // Create a new DropAFund campaign
  static async createCampaign(campaignData: Partial<DropAFundCampaign>): Promise<DropAFundCampaign | null> {
    try {
      const { data, error } = await supabase
        .from('dropafund_campaigns')
        .insert([{
          seller_id: campaignData.seller_id,
          title: campaignData.title,
          description: campaignData.description,
          story: campaignData.story,
          category_id: campaignData.category_id,
          subcategory_id: campaignData.subcategory_id,
          funding_goal: campaignData.funding_goal,
          entry_cost: campaignData.entry_cost || 0.20,
          game_type: campaignData.game_type,
          game_difficulty: campaignData.game_difficulty || 'medium',
          min_winners: campaignData.min_winners || 1,
          max_winners: campaignData.max_winners || 100,
          winner_selection_type: campaignData.winner_selection_type || 'top_scores',
          winner_percentage: campaignData.winner_percentage,
          score_threshold: campaignData.score_threshold,
          reward_structure: campaignData.reward_structure || { type: 'equal', rewards: [] },
          total_reward_pool: campaignData.total_reward_pool || 0,
          image_urls: campaignData.image_urls || [],
          video_url: campaignData.video_url,
          deadline: campaignData.deadline,
          status: 'active'
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating DropAFund campaign:', error);
        return null;
      }

      return data as DropAFundCampaign;
    } catch (error) {
      console.error('Error creating DropAFund campaign:', error);
      return null;
    }
  }

  // Get all active DropAFund campaigns
  static async getActiveCampaigns(): Promise<DropAFundCampaign[]> {
    try {
      const { data, error } = await supabase
        .from('dropafund_campaigns')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching DropAFund campaigns:', error);
        return [];
      }

      return data as DropAFundCampaign[];
    } catch (error) {
      console.error('Error fetching DropAFund campaigns:', error);
      return [];
    }
  }

  // Get a specific campaign
  static async getCampaign(campaignId: string): Promise<DropAFundCampaign | null> {
    try {
      const { data, error } = await supabase
        .from('dropafund_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) {
        console.error('Error fetching DropAFund campaign:', error);
        return null;
      }

      return data as DropAFundCampaign;
    } catch (error) {
      console.error('Error fetching DropAFund campaign:', error);
      return null;
    }
  }

  // Join a campaign (create participant record)
  static async joinCampaign(campaignId: string, userId: string, username: string): Promise<DropAFundParticipant | null> {
    try {
      const { data, error } = await supabase
        .from('dropafund_participants')
        .insert([{
          campaign_id: campaignId,
          user_id: userId,
          username: username
        }])
        .select()
        .single();

      if (error) {
        console.error('Error joining DropAFund campaign:', error);
        return null;
      }

      return data as DropAFundParticipant;
    } catch (error) {
      console.error('Error joining DropAFund campaign:', error);
      return null;
    }
  }

  // Record a game session
  static async recordGameSession(sessionData: {
    campaignId: string;
    userId: string;
    gameType: string;
    score: number;
    contributionAmount: number;
    accuracy?: number;
    reactionTime?: number;
    gameDuration?: number;
    sessionData?: any;
  }): Promise<DropAFundGameSession | null> {
    try {
      // First, ensure participant exists
      const { data: participant } = await supabase
        .from('dropafund_participants')
        .select('id')
        .eq('campaign_id', sessionData.campaignId)
        .eq('user_id', sessionData.userId)
        .single();

      if (!participant) {
        console.error('Participant not found for campaign');
        return null;
      }

      // Record the game session
      const { data, error } = await supabase
        .from('dropafund_game_sessions')
        .insert([{
          campaign_id: sessionData.campaignId,
          participant_id: participant.id,
          user_id: sessionData.userId,
          game_type: sessionData.gameType,
          score: sessionData.score,
          accuracy: sessionData.accuracy,
          reaction_time: sessionData.reactionTime,
          game_duration: sessionData.gameDuration,
          session_data: sessionData.sessionData,
          contribution_amount: sessionData.contributionAmount
        }])
        .select()
        .single();

      if (error) {
        console.error('Error recording DropAFund game session:', error);
        return null;
      }

      // Update rankings after new session
      await this.updateCampaignRankings(sessionData.campaignId);

      return data as DropAFundGameSession;
    } catch (error) {
      console.error('Error recording DropAFund game session:', error);
      return null;
    }
  }

  // Get campaign participants with rankings
  static async getCampaignParticipants(campaignId: string, limit: number = 100): Promise<DropAFundParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('dropafund_participants')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('current_rank', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching campaign participants:', error);
        return [];
      }

      return data as DropAFundParticipant[];
    } catch (error) {
      console.error('Error fetching campaign participants:', error);
      return [];
    }
  }

  // Update campaign rankings
  static async updateCampaignRankings(campaignId: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('update_dropafund_rankings', {
        campaign_uuid: campaignId
      });

      if (error) {
        console.error('Error updating campaign rankings:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating campaign rankings:', error);
      return false;
    }
  }

  // Get universal scoreboard for any listing
  static async getListingScoreboard(
    listingId: string, 
    listingType: 'regular' | 'dropafund' | 'tournament',
    limit: number = 50
  ): Promise<ListingScoreboard[]> {
    try {
      const { data, error } = await supabase
        .from('listing_scoreboards')
        .select('*')
        .eq('listing_id', listingId)
        .eq('listing_type', listingType)
        .order('best_score', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching listing scoreboard:', error);
        return [];
      }

      return data as ListingScoreboard[];
    } catch (error) {
      console.error('Error fetching listing scoreboard:', error);
      return [];
    }
  }

  // Get user's performance in a campaign
  static async getUserCampaignPerformance(campaignId: string, userId: string): Promise<DropAFundParticipant | null> {
    try {
      const { data, error } = await supabase
        .from('dropafund_participants')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user campaign performance:', error);
        return null;
      }

      return data as DropAFundParticipant;
    } catch (error) {
      console.error('Error fetching user campaign performance:', error);
      return null;
    }
  }

  // Get user's game sessions for a campaign
  static async getUserGameSessions(campaignId: string, userId: string): Promise<DropAFundGameSession[]> {
    try {
      const { data, error } = await supabase
        .from('dropafund_game_sessions')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('user_id', userId)
        .order('played_at', { ascending: false });

      if (error) {
        console.error('Error fetching user game sessions:', error);
        return [];
      }

      return data as DropAFundGameSession[];
    } catch (error) {
      console.error('Error fetching user game sessions:', error);
      return [];
    }
  }

  // Finalize campaign and determine winners
  static async finalizeCampaign(campaignId: string): Promise<boolean> {
    try {
      // Get campaign details
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) return false;

      // Get all participants ordered by score
      const participants = await this.getCampaignParticipants(campaignId, 1000);
      
      // Determine winners based on selection type
      let winners: DropAFundParticipant[] = [];
      
      switch (campaign.winner_selection_type) {
        case 'top_scores':
          winners = participants.slice(0, Math.min(campaign.max_winners, participants.length));
          break;
          
        case 'percentage_based':
          if (campaign.winner_percentage) {
            const winnerCount = Math.ceil(participants.length * (campaign.winner_percentage / 100));
            winners = participants.slice(0, Math.min(winnerCount, campaign.max_winners));
          }
          break;
          
        case 'threshold_based':
          if (campaign.score_threshold) {
            winners = participants.filter(p => p.best_score >= campaign.score_threshold!)
              .slice(0, campaign.max_winners);
          }
          break;
      }

      // Update winner status and rewards
      for (let i = 0; i < winners.length; i++) {
        const winner = winners[i];
        const rewardAmount = this.calculateReward(campaign, i + 1, winners.length);
        
        await supabase
          .from('dropafund_participants')
          .update({
            final_rank: i + 1,
            is_winner: true,
            reward_earned: rewardAmount,
            reward_tier: `Position ${i + 1}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', winner.id);
      }

      // Update campaign status
      await supabase
        .from('dropafund_campaigns')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      return true;
    } catch (error) {
      console.error('Error finalizing campaign:', error);
      return false;
    }
  }

  // Calculate reward for a specific position
  private static calculateReward(campaign: DropAFundCampaign, position: number, totalWinners: number): number {
    const { reward_structure, total_reward_pool } = campaign;
    
    switch (reward_structure.type) {
      case 'equal':
        return total_reward_pool / totalWinners;
        
      case 'tiered':
        const tierReward = reward_structure.rewards.find(r => r.position === position);
        return tierReward ? tierReward.amount : 0;
        
      case 'percentage':
        const percentageReward = reward_structure.rewards.find(r => r.position === position);
        return percentageReward ? (total_reward_pool * percentageReward.amount / 100) : 0;
        
      default:
        return total_reward_pool / totalWinners;
    }
  }

  // Get campaign statistics
  static async getCampaignStats(campaignId: string): Promise<any> {
    try {
      const [campaign, participants, sessions] = await Promise.all([
        this.getCampaign(campaignId),
        this.getCampaignParticipants(campaignId),
        supabase
          .from('dropafund_game_sessions')
          .select('score, played_at')
          .eq('campaign_id', campaignId)
      ]);

      if (!campaign) return null;

      const sessionData = sessions.data || [];
      
      return {
        campaign,
        totalParticipants: participants.length,
        totalSessions: sessionData.length,
        averageScore: sessionData.length > 0 ? sessionData.reduce((sum, s) => sum + s.score, 0) / sessionData.length : 0,
        highestScore: sessionData.length > 0 ? Math.max(...sessionData.map(s => s.score)) : 0,
        fundingProgress: (campaign.current_funding / campaign.funding_goal) * 100,
        topParticipants: participants.slice(0, 10)
      };
    } catch (error) {
      console.error('Error fetching campaign stats:', error);
      return null;
    }
  }
}

export default DropAFundService;
