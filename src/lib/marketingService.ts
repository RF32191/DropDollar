// Marketing Email Service
// Similar to Amazon/Etsy marketing systems

import { UserDatabaseService, UserAccount } from './userDatabase';

export interface MarketingCampaign {
  id: string;
  name: string;
  type: keyof UserAccount['marketingPreferences'];
  subject: string;
  content: string;
  targetAudience: 'all' | 'buyers' | 'sellers' | 'new_users' | 'active_users';
  createdAt: Date;
  scheduledFor?: Date;
  sentAt?: Date;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  stats: {
    totalSent: number;
    delivered: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
  };
}

export interface MarketingEmail {
  id: string;
  campaignId: string;
  userId: string;
  email: string;
  sentAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  unsubscribedAt?: Date;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed';
}

export class MarketingService {
  private static readonly STORAGE_KEY_CAMPAIGNS = 'dropdollar_campaigns';
  private static readonly STORAGE_KEY_EMAILS = 'dropdollar_marketing_emails';

  // Get all campaigns
  private static getCampaigns(): MarketingCampaign[] {
    if (typeof window === 'undefined') return [];
    const campaigns = localStorage.getItem(this.STORAGE_KEY_CAMPAIGNS);
    return campaigns ? JSON.parse(campaigns) : [];
  }

  // Save campaigns
  private static saveCampaigns(campaigns: MarketingCampaign[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY_CAMPAIGNS, JSON.stringify(campaigns));
  }

  // Get all marketing emails
  private static getMarketingEmails(): MarketingEmail[] {
    if (typeof window === 'undefined') return [];
    const emails = localStorage.getItem(this.STORAGE_KEY_EMAILS);
    return emails ? JSON.parse(emails) : [];
  }

  // Save marketing emails
  private static saveMarketingEmails(emails: MarketingEmail[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY_EMAILS, JSON.stringify(emails));
  }

  // Generate unique ID
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Create a new campaign
  static createCampaign(campaign: Omit<MarketingCampaign, 'id' | 'createdAt' | 'stats'>): MarketingCampaign {
    const newCampaign: MarketingCampaign = {
      ...campaign,
      id: this.generateId(),
      createdAt: new Date(),
      stats: {
        totalSent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        unsubscribed: 0,
      },
    };

    const campaigns = this.getCampaigns();
    campaigns.push(newCampaign);
    this.saveCampaigns(campaigns);

    return newCampaign;
  }

  // Send campaign to eligible users
  static async sendCampaign(campaignId: string): Promise<{
    success: boolean;
    message: string;
    sentCount: number;
  }> {
    const campaigns = this.getCampaigns();
    const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
    
    if (campaignIndex === -1) {
      return { success: false, message: 'Campaign not found', sentCount: 0 };
    }

    const campaign = campaigns[campaignIndex];
    
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return { success: false, message: 'Campaign already sent or cancelled', sentCount: 0 };
    }

    // Get eligible users based on marketing preferences
    const eligibleUsers = UserDatabaseService.getUsersForMarketing(campaign.type);
    
    // Filter by target audience
    const targetUsers = eligibleUsers.filter(user => {
      switch (campaign.targetAudience) {
        case 'buyers':
          return user.accountType === 'buyer' || user.accountType === 'both';
        case 'sellers':
          return user.accountType === 'seller' || user.accountType === 'both';
        case 'new_users':
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return new Date(user.createdAt) > weekAgo;
        case 'active_users':
          const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return user.lastLoginAt && new Date(user.lastLoginAt) > monthAgo;
        default:
          return true;
      }
    });

    // Create marketing email records
    const marketingEmails = this.getMarketingEmails();
    const newEmails: MarketingEmail[] = targetUsers.map(user => ({
      id: this.generateId(),
      campaignId: campaign.id,
      userId: user.id,
      email: user.email,
      sentAt: new Date(),
      status: 'sent' as const,
    }));

    marketingEmails.push(...newEmails);
    this.saveMarketingEmails(marketingEmails);

    // Update campaign status and stats
    campaigns[campaignIndex] = {
      ...campaign,
      status: 'sent',
      sentAt: new Date(),
      stats: {
        ...campaign.stats,
        totalSent: newEmails.length,
        delivered: newEmails.length, // Assume all delivered for demo
      },
    };
    this.saveCampaigns(campaigns);

    console.log(`📧 Marketing campaign "${campaign.name}" sent to ${newEmails.length} users`);
    
    // Log individual emails for demo
    newEmails.forEach(email => {
      console.log(`📨 Email sent to ${email.email}: "${campaign.subject}"`);
    });

    return {
      success: true,
      message: `Campaign sent successfully to ${newEmails.length} users`,
      sentCount: newEmails.length,
    };
  }

  // Get campaign statistics
  static getCampaignStats(campaignId: string): MarketingCampaign['stats'] | null {
    const campaigns = this.getCampaigns();
    const campaign = campaigns.find(c => c.id === campaignId);
    return campaign ? campaign.stats : null;
  }

  // Get all campaigns
  static getAllCampaigns(): MarketingCampaign[] {
    return this.getCampaigns();
  }

  // Get user's email history
  static getUserEmailHistory(userId: string): MarketingEmail[] {
    const emails = this.getMarketingEmails();
    return emails.filter(email => email.userId === userId);
  }

  // Unsubscribe user from specific marketing type
  static async unsubscribeUser(userId: string, marketingType: keyof UserAccount['marketingPreferences']): Promise<{
    success: boolean;
    message: string;
  }> {
    const result = await UserDatabaseService.updateMarketingPreferences(userId, {
      [marketingType]: false
    } as any);

    if (result.success) {
      console.log(`🚫 User ${userId} unsubscribed from ${marketingType}`);
    }

    return result;
  }

  // Create pre-defined campaigns for common scenarios
  static createHotDealsAlert(productName: string, originalPrice: number, timeRemaining: string): MarketingCampaign {
    return this.createCampaign({
      name: `Hot Deal Alert - ${productName}`,
      type: 'hotDealsAlerts',
      subject: `🔥 Hot Deal: ${productName} - Only ${timeRemaining} left!`,
      content: `
        <h2>🔥 Hot Deal Alert!</h2>
        <p>A competition for <strong>${productName}</strong> (worth $${originalPrice}) is about to start!</p>
        <p>⏰ Only <strong>${timeRemaining}</strong> remaining to enter!</p>
        <p>💰 Entry cost: Just $1</p>
        <p>🎮 Win through skill-based gaming - no luck required!</p>
        <a href="${typeof window !== 'undefined' ? window.location.origin : ''}/listings" 
           style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 16px;">
          🔥 Enter Competition Now
        </a>
      `,
      targetAudience: 'all',
      status: 'draft',
    });
  }

  static createNewProductAlert(productName: string, category: string, basePrice: number): MarketingCampaign {
    return this.createCampaign({
      name: `New Product - ${productName}`,
      type: 'newProductAlerts',
      subject: `🆕 New Competition: ${productName} in ${category}`,
      content: `
        <h2>🆕 New Competition Available!</h2>
        <p>A new <strong>${productName}</strong> competition is now live in the ${category} category!</p>
        <p>💰 Base Price: $${basePrice}</p>
        <p>🎯 Entry: $1 per person</p>
        <p>🎮 Win through skill-based games</p>
        <p>🏆 Be the first to compete and win this amazing prize!</p>
        <a href="${typeof window !== 'undefined' ? window.location.origin : ''}/categories" 
           style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 16px;">
          🎯 View Competition
        </a>
      `,
      targetAudience: 'all',
      status: 'draft',
    });
  }

  static createTournamentAlert(tournamentName: string, prizeAmount: number, startTime: string): MarketingCampaign {
    return this.createCampaign({
      name: `Tournament Alert - ${tournamentName}`,
      type: 'tournamentAlerts',
      subject: `🏆 ${tournamentName} - $${prizeAmount} Prize Pool!`,
      content: `
        <h2>🏆 Tournament Starting Soon!</h2>
        <p><strong>${tournamentName}</strong> is about to begin!</p>
        <p>💰 Prize Pool: <strong>$${prizeAmount}</strong></p>
        <p>⏰ Starts: ${startTime}</p>
        <p>🎮 Skill-based gaming competition</p>
        <p>🎯 Entry: $1-$3 worth of tokens</p>
        <p>🏅 Multiple winners possible!</p>
        <a href="${typeof window !== 'undefined' ? window.location.origin : ''}/hot-sell" 
           style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 16px;">
          🏆 Join Tournament
        </a>
      `,
      targetAudience: 'all',
      status: 'draft',
    });
  }

  static createWeeklyNewsletter(weeklyStats: {
    newCompetitions: number;
    totalWinners: number;
    biggestPrize: string;
    featuredCategory: string;
  }): MarketingCampaign {
    return this.createCampaign({
      name: `Weekly Newsletter - ${new Date().toLocaleDateString()}`,
      type: 'weeklyNewsletter',
      subject: `📰 Your Weekly DropDollar Update - ${weeklyStats.newCompetitions} New Competitions!`,
      content: `
        <h2>📰 Your Weekly DropDollar Update</h2>
        <p>Here's what happened this week on DropDollar:</p>
        
        <h3>📊 This Week's Stats</h3>
        <ul>
          <li>🆕 <strong>${weeklyStats.newCompetitions}</strong> new competitions launched</li>
          <li>🏆 <strong>${weeklyStats.totalWinners}</strong> winners across all competitions</li>
          <li>💰 Biggest prize won: <strong>${weeklyStats.biggestPrize}</strong></li>
          <li>🔥 Featured category: <strong>${weeklyStats.featuredCategory}</strong></li>
        </ul>
        
        <h3>🎮 New Features</h3>
        <p>• Enhanced tournament system with multiple daily winners</p>
        <p>• Improved game practice modes</p>
        <p>• Better mobile experience</p>
        
        <h3>🏆 Upcoming Tournaments</h3>
        <p>Don't miss our daily cash prize tournaments with prizes up to $25,000!</p>
        
        <a href="${typeof window !== 'undefined' ? window.location.origin : ''}" 
           style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 16px;">
          🎯 Start Competing
        </a>
      `,
      targetAudience: 'all',
      status: 'draft',
    });
  }

  // Get marketing statistics
  static getMarketingStats(): {
    totalCampaigns: number;
    totalEmailsSent: number;
    averageOpenRate: number;
    subscribersByType: { [key: string]: number };
    recentCampaigns: MarketingCampaign[];
  } {
    const campaigns = this.getCampaigns();
    const users = UserDatabaseService.getUserStats();
    
    const totalEmailsSent = campaigns.reduce((sum, campaign) => sum + campaign.stats.totalSent, 0);
    const totalOpened = campaigns.reduce((sum, campaign) => sum + campaign.stats.opened, 0);
    const averageOpenRate = totalEmailsSent > 0 ? (totalOpened / totalEmailsSent) * 100 : 0;

    // Get subscriber counts by type
    const allUsers = JSON.parse(localStorage.getItem('dropdollar_users') || '[]');
    const subscribersByType = {
      emailMarketing: allUsers.filter((u: any) => u.marketingPreferences?.emailMarketing).length,
      smsMarketing: allUsers.filter((u: any) => u.marketingPreferences?.smsMarketing).length,
      hotDealsAlerts: allUsers.filter((u: any) => u.marketingPreferences?.hotDealsAlerts).length,
      newProductAlerts: allUsers.filter((u: any) => u.marketingPreferences?.newProductAlerts).length,
      tournamentAlerts: allUsers.filter((u: any) => u.marketingPreferences?.tournamentAlerts).length,
      weeklyNewsletter: allUsers.filter((u: any) => u.marketingPreferences?.weeklyNewsletter).length,
    };

    return {
      totalCampaigns: campaigns.length,
      totalEmailsSent,
      averageOpenRate,
      subscribersByType,
      recentCampaigns: campaigns.slice(-5).reverse(),
    };
  }
}

// Initialize with some demo campaigns
if (typeof window !== 'undefined') {
  const existingCampaigns = MarketingService.getAllCampaigns();
  if (existingCampaigns.length === 0) {
    // Create some demo campaigns
    MarketingService.createHotDealsAlert('iPhone 15 Pro', 1199, '2 hours');
    MarketingService.createNewProductAlert('MacBook Pro M3', 'Electronics', 2499);
    MarketingService.createTournamentAlert('Elite Championship', 25000, 'Today at 8:00 PM');
    MarketingService.createWeeklyNewsletter({
      newCompetitions: 47,
      totalWinners: 156,
      biggestPrize: 'MacBook Pro ($2,499)',
      featuredCategory: 'Electronics',
    });
  }
}
