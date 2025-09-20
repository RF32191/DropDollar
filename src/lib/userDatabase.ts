// User Database & Authentication System
// Similar to Amazon/Etsy user management
import { WalletService } from '@/lib/walletService';

export interface UserAccount {
  id: string;
  email: string;
  password: string; // In production, this would be hashed
  accountType: 'buyer' | 'seller' | 'both';
  status: 'active' | 'pending' | 'suspended' | 'banned';
  createdAt: Date;
  lastLoginAt?: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  
  // Personal Information
  personalInfo: {
    firstName: string;
    lastName: string;
    phone?: string;
    dateOfBirth?: string;
    profilePicture?: string;
  };
  
  // Address Information
  addresses: Address[];
  defaultAddressId?: string;
  
  // Marketing Preferences
  marketingPreferences: {
    emailMarketing: boolean;
    smsMarketing: boolean;
    pushNotifications: boolean;
    hotDealsAlerts: boolean;
    newProductAlerts: boolean;
    tournamentAlerts: boolean;
    weeklyNewsletter: boolean;
    personalizedRecommendations: boolean;
  };
  
  // Account Settings
  settings: {
    currency: string;
    timezone: string;
    language: string;
    twoFactorEnabled: boolean;
    loginNotifications: boolean;
    requirePhoneVerification: boolean;
  };
  
  // Purchase History & Stats
  buyerStats?: {
    totalPurchases: number;
    totalSpent: number;
    favoriteCategories: string[];
    wishlistItems: string[];
    recentlyViewed: string[];
    loyaltyPoints: number;
    membershipTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  };
  
  // Seller Information (if applicable)
  sellerInfo?: {
    businessName?: string;
    businessType: string;
    taxId?: string;
    bankAccountInfo: {
      accountType: string;
      bankName: string;
      routingNumber: string;
      accountNumber: string;
    };
    sellerStats: {
      totalSales: number;
      totalRevenue: number;
      averageRating: number;
      totalReviews: number;
      activeListings: number;
      completedOrders: number;
    };
    verificationStatus: {
      identityVerified: boolean;
      businessVerified: boolean;
      bankAccountVerified: boolean;
      backgroundCheckPassed: boolean;
    };
    sellerPreferences: {
      autoAcceptOrders: boolean;
      vacationMode: boolean;
      instantPayouts: boolean;
    };
  };
}

export interface Address {
  id: string;
  type: 'home' | 'work' | 'billing' | 'shipping' | 'other';
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  email: string;
  accountType: 'buyer' | 'seller' | 'both';
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

export interface LoginAttempt {
  email: string;
  ipAddress: string;
  timestamp: Date;
  success: boolean;
  failureReason?: string;
}

export class UserDatabaseService {
  private static readonly STORAGE_KEY_USERS = 'dropdollar_users';
  private static readonly STORAGE_KEY_SESSIONS = 'dropdollar_sessions';
  private static readonly STORAGE_KEY_LOGIN_ATTEMPTS = 'dropdollar_login_attempts';
  
  // Session management
  private static currentSession: UserSession | null = null;
  
  // Get all users from localStorage
  private static getUsers(): UserAccount[] {
    if (typeof window === 'undefined') return [];
    const users = localStorage.getItem(this.STORAGE_KEY_USERS);
    return users ? JSON.parse(users) : [];
  }
  
  // Save users to localStorage
  private static saveUsers(users: UserAccount[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
  }
  
  // Get all sessions from localStorage
  private static getSessions(): UserSession[] {
    if (typeof window === 'undefined') return [];
    const sessions = localStorage.getItem(this.STORAGE_KEY_SESSIONS);
    return sessions ? JSON.parse(sessions) : [];
  }
  
  // Save sessions to localStorage
  private static saveSessions(sessions: UserSession[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  }
  
  // Generate unique ID
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  // Hash password (simplified for demo - use bcrypt in production)
  private static hashPassword(password: string): string {
    // In production, use proper password hashing like bcrypt
    return btoa(password + 'dropdollar_salt');
  }
  
  // Verify password
  private static verifyPassword(password: string, hashedPassword: string): boolean {
    return this.hashPassword(password) === hashedPassword;
  }
  
  // Register new user
  static async registerUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    accountType: 'buyer' | 'seller';
    marketingPreferences: {
      emailMarketing: boolean;
      smsMarketing: boolean;
      hotDealsAlerts: boolean;
      newProductAlerts: boolean;
      tournamentAlerts: boolean;
      weeklyNewsletter: boolean;
    };
    address?: Partial<Address>;
  }): Promise<{ success: boolean; message: string; userId?: string }> {
    
    const users = this.getUsers();
    
    // Check if email already exists
    const existingUser = users.find(user => user.email.toLowerCase() === userData.email.toLowerCase());
    if (existingUser) {
      return { success: false, message: 'An account with this email already exists' };
    }
    
    // Create new user account
    const newUser: UserAccount = {
      id: this.generateId(),
      email: userData.email.toLowerCase(),
      password: this.hashPassword(userData.password),
      accountType: userData.accountType,
      status: 'active',
      createdAt: new Date(),
      emailVerified: false,
      phoneVerified: false,
      
      personalInfo: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
      },
      
      addresses: userData.address ? [{
        id: this.generateId(),
        type: 'home',
        firstName: userData.firstName,
        lastName: userData.lastName,
        street: userData.address.street || '',
        city: userData.address.city || '',
        state: userData.address.state || '',
        zipCode: userData.address.zipCode || '',
        country: userData.address.country || 'US',
        isDefault: true
      }] : [],
      
      marketingPreferences: {
        emailMarketing: userData.marketingPreferences.emailMarketing,
        smsMarketing: userData.marketingPreferences.smsMarketing,
        pushNotifications: false,
        hotDealsAlerts: userData.marketingPreferences.hotDealsAlerts,
        newProductAlerts: userData.marketingPreferences.newProductAlerts,
        tournamentAlerts: userData.marketingPreferences.tournamentAlerts,
        weeklyNewsletter: userData.marketingPreferences.weeklyNewsletter,
        personalizedRecommendations: true,
      },
      
      settings: {
        currency: 'USD',
        timezone: 'America/New_York',
        language: 'en',
        twoFactorEnabled: false,
        loginNotifications: true,
        requirePhoneVerification: true,
      },
      
      buyerStats: userData.accountType === 'buyer' || userData.accountType === 'both' ? {
        totalPurchases: 0,
        totalSpent: 0,
        favoriteCategories: [],
        wishlistItems: [],
        recentlyViewed: [],
        loyaltyPoints: 100, // Welcome bonus
        membershipTier: 'bronze',
      } : undefined,
    };
    
    // Add seller info if seller account
    if (userData.accountType === 'seller') {
      newUser.sellerInfo = {
        businessType: 'individual',
        bankAccountInfo: {
          accountType: '',
          bankName: '',
          routingNumber: '',
          accountNumber: '',
        },
        sellerStats: {
          totalSales: 0,
          totalRevenue: 0,
          averageRating: 0,
          totalReviews: 0,
          activeListings: 0,
          completedOrders: 0,
        },
        verificationStatus: {
          identityVerified: false,
          businessVerified: false,
          bankAccountVerified: false,
          backgroundCheckPassed: false,
        },
        sellerPreferences: {
          autoAcceptOrders: true,
          vacationMode: false,
          instantPayouts: false,
        },
      };
    }
    
    users.push(newUser);
    this.saveUsers(users);
    
    console.log(`🎉 New ${userData.accountType} account created:`, userData.email);
    
    // Create internal wallet for the new user (mock, client-side only)
    try {
      if (typeof window !== 'undefined') {
        WalletService.createWalletForUser(newUser.id);
      }
    } catch (err) {
      console.warn('Wallet creation failed for user', newUser.id, err);
    }
    
    return { 
      success: true, 
      message: 'Account created successfully! Welcome to Dollar Drop!', 
      userId: newUser.id 
    };
  }
  
  // Login user
  static async loginUser(email: string, password: string, ipAddress: string = 'unknown'): Promise<{
    success: boolean;
    message: string;
    session?: UserSession;
    user?: UserAccount;
  }> {
    
    const users = this.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    // Log login attempt
    this.logLoginAttempt(email, ipAddress, !!user && this.verifyPassword(password, user.password));
    
    if (!user) {
      return { success: false, message: 'Invalid email or password' };
    }
    
    if (!this.verifyPassword(password, user.password)) {
      return { success: false, message: 'Invalid email or password' };
    }
    
    if (user.status !== 'active') {
      return { success: false, message: 'Account is not active. Please contact support.' };
    }
    
    // Update last login
    user.lastLoginAt = new Date();
    this.saveUsers(users);
    
    // Create session
    const session: UserSession = {
      sessionId: this.generateId(),
      userId: user.id,
      email: user.email,
      accountType: user.accountType,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      ipAddress,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
      isActive: true,
    };
    
    // Save session
    const sessions = this.getSessions();
    sessions.push(session);
    this.saveSessions(sessions);
    this.currentSession = session;
    
    console.log(`🔐 User logged in:`, email);
    
    return { 
      success: true, 
      message: 'Login successful!', 
      session,
      user: { ...user, password: '' } // Don't return password
    };
  }
  
  // Logout user
  static async logoutUser(sessionId?: string): Promise<{ success: boolean; message: string }> {
    const sessions = this.getSessions();
    const targetSessionId = sessionId || this.currentSession?.sessionId;
    
    if (targetSessionId) {
      const sessionIndex = sessions.findIndex(s => s.sessionId === targetSessionId);
      if (sessionIndex !== -1) {
        sessions[sessionIndex].isActive = false;
        this.saveSessions(sessions);
      }
    }
    
    this.currentSession = null;
    
    return { success: true, message: 'Logged out successfully' };
  }
  
  // Get current user
  static getCurrentUser(): UserAccount | null {
    if (!this.currentSession) return null;
    
    const users = this.getUsers();
    const user = users.find(u => u.id === this.currentSession!.userId);
    return user ? { ...user, password: '' } : null;
  }
  
  // Get current session
  static getCurrentSession(): UserSession | null {
    return this.currentSession;
  }
  
  // Validate session
  static validateSession(sessionId: string): boolean {
    const sessions = this.getSessions();
    const session = sessions.find(s => s.sessionId === sessionId && s.isActive);
    
    if (!session) return false;
    if (new Date() > new Date(session.expiresAt)) {
      // Session expired
      session.isActive = false;
      this.saveSessions(sessions);
      return false;
    }
    
    return true;
  }
  
  // Update user profile
  static async updateUserProfile(userId: string, updates: Partial<UserAccount>): Promise<{
    success: boolean;
    message: string;
  }> {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return { success: false, message: 'User not found' };
    }
    
    // Merge updates (excluding sensitive fields)
    const { password, id, ...safeUpdates } = updates;
    users[userIndex] = { ...users[userIndex], ...safeUpdates };
    
    this.saveUsers(users);
    
    return { success: true, message: 'Profile updated successfully' };
  }
  
  // Update marketing preferences
  static async updateMarketingPreferences(userId: string, preferences: Partial<UserAccount['marketingPreferences']>): Promise<{
    success: boolean;
    message: string;
  }> {
    const users = this.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return { success: false, message: 'User not found' };
    }
    
    users[userIndex].marketingPreferences = {
      ...users[userIndex].marketingPreferences,
      ...preferences
    };
    
    this.saveUsers(users);
    
    console.log(`📧 Marketing preferences updated for user:`, users[userIndex].email);
    
    return { success: true, message: 'Marketing preferences updated successfully' };
  }
  
  // Get users for marketing (with consent)
  static getUsersForMarketing(type: keyof UserAccount['marketingPreferences']): UserAccount[] {
    const users = this.getUsers();
    return users.filter(user => 
      user.status === 'active' && 
      user.emailVerified && 
      user.marketingPreferences[type]
    );
  }
  
  // Log login attempt
  private static logLoginAttempt(email: string, ipAddress: string, success: boolean): void {
    if (typeof window === 'undefined') return;
    
    const attempts = JSON.parse(localStorage.getItem(this.STORAGE_KEY_LOGIN_ATTEMPTS) || '[]');
    attempts.push({
      email,
      ipAddress,
      timestamp: new Date(),
      success,
      failureReason: success ? undefined : 'Invalid credentials'
    });
    
    // Keep only last 100 attempts
    if (attempts.length > 100) {
      attempts.splice(0, attempts.length - 100);
    }
    
    localStorage.setItem(this.STORAGE_KEY_LOGIN_ATTEMPTS, JSON.stringify(attempts));
  }
  
  // Get user statistics
  static getUserStats(): {
    totalUsers: number;
    totalBuyers: number;
    totalSellers: number;
    activeUsers: number;
    emailMarketingOptIns: number;
    recentSignups: number;
  } {
    const users = this.getUsers();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return {
      totalUsers: users.length,
      totalBuyers: users.filter(u => u.accountType === 'buyer' || u.accountType === 'both').length,
      totalSellers: users.filter(u => u.accountType === 'seller' || u.accountType === 'both').length,
      activeUsers: users.filter(u => u.status === 'active').length,
      emailMarketingOptIns: users.filter(u => u.marketingPreferences.emailMarketing).length,
      recentSignups: users.filter(u => new Date(u.createdAt) > sevenDaysAgo).length,
    };
  }
  
  // Initialize session from localStorage on page load
  static initializeSession(): void {
    if (typeof window === 'undefined') return;
    
    const sessions = this.getSessions();
    const activeSessions = sessions.filter(s => s.isActive && new Date() < new Date(s.expiresAt));
    
    if (activeSessions.length > 0) {
      // Use the most recent active session
      this.currentSession = activeSessions[activeSessions.length - 1];
    }
  }
}

// Initialize session on module load
if (typeof window !== 'undefined') {
  UserDatabaseService.initializeSession();
}
