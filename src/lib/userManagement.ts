// User Management System with IP Tracking and Verification

export interface UserAccount {
  id: string;
  email: string;
  phoneNumber: string;
  ipAddress: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: Date;
  lastLoginAt: Date;
  accountStatus: 'active' | 'suspended' | 'pending_verification';
}

export interface IPAddressInfo {
  ipAddress: string;
  accountCount: number;
  accountIds: string[];
  firstRegistration: Date;
  lastRegistration: Date;
  isBlocked: boolean;
}

export class UserManagementService {
  private static readonly MAX_ACCOUNTS_PER_IP = 5;
  private static readonly VERIFICATION_CODE_EXPIRY = 10 * 60 * 1000; // 10 minutes

  // Mock storage - in production, this would be a database
  private static users: Map<string, UserAccount> = new Map();
  private static ipAddresses: Map<string, IPAddressInfo> = new Map();
  private static verificationCodes: Map<string, { code: string; expiresAt: Date; type: 'email' | 'phone' }> = new Map();

  /**
   * Check if an IP address can register a new account
   */
  static canRegisterFromIP(ipAddress: string): { allowed: boolean; reason?: string; currentCount: number } {
    const ipInfo = this.ipAddresses.get(ipAddress);
    
    if (!ipInfo) {
      return { allowed: true, currentCount: 0 };
    }

    if (ipInfo.isBlocked) {
      return { 
        allowed: false, 
        reason: 'This IP address has been blocked due to suspicious activity',
        currentCount: ipInfo.accountCount 
      };
    }

    if (ipInfo.accountCount >= this.MAX_ACCOUNTS_PER_IP) {
      return { 
        allowed: false, 
        reason: `Maximum of ${this.MAX_ACCOUNTS_PER_IP} accounts allowed per IP address`,
        currentCount: ipInfo.accountCount 
      };
    }

    return { allowed: true, currentCount: ipInfo.accountCount };
  }

  /**
   * Check if email or phone number is already registered
   */
  static isContactInfoTaken(email: string, phoneNumber: string): { emailTaken: boolean; phoneTaken: boolean } {
    let emailTaken = false;
    let phoneTaken = false;

    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        emailTaken = true;
      }
      if (user.phoneNumber === phoneNumber) {
        phoneTaken = true;
      }
    }

    return { emailTaken, phoneTaken };
  }

  /**
   * Register a new user account
   */
  static async registerUser(userData: {
    email: string;
    phoneNumber: string;
    ipAddress: string;
    password: string; // In production, this would be hashed
  }): Promise<{ success: boolean; userId?: string; error?: string }> {
    
    // Check IP address limits
    const ipCheck = this.canRegisterFromIP(userData.ipAddress);
    if (!ipCheck.allowed) {
      return { success: false, error: ipCheck.reason };
    }

    // Check if contact info is already taken
    const contactCheck = this.isContactInfoTaken(userData.email, userData.phoneNumber);
    if (contactCheck.emailTaken) {
      return { success: false, error: 'Email address is already registered' };
    }
    if (contactCheck.phoneTaken) {
      return { success: false, error: 'Phone number is already registered' };
    }

    // Generate user ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create user account
    const newUser: UserAccount = {
      id: userId,
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      ipAddress: userData.ipAddress,
      isEmailVerified: false,
      isPhoneVerified: false,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      accountStatus: 'pending_verification'
    };

    // Store user
    this.users.set(userId, newUser);

    // Update IP address tracking
    this.updateIPAddressInfo(userData.ipAddress, userId);

    // Send verification codes
    await this.sendEmailVerification(userId);
    await this.sendPhoneVerification(userId);

    return { success: true, userId };
  }

  /**
   * Update IP address tracking information
   */
  private static updateIPAddressInfo(ipAddress: string, userId: string): void {
    const existing = this.ipAddresses.get(ipAddress);
    
    if (existing) {
      existing.accountCount++;
      existing.accountIds.push(userId);
      existing.lastRegistration = new Date();
    } else {
      this.ipAddresses.set(ipAddress, {
        ipAddress,
        accountCount: 1,
        accountIds: [userId],
        firstRegistration: new Date(),
        lastRegistration: new Date(),
        isBlocked: false
      });
    }
  }

  /**
   * Send email verification code
   */
  static async sendEmailVerification(userId: string): Promise<{ success: boolean; error?: string }> {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + this.VERIFICATION_CODE_EXPIRY);

    // Store verification code
    this.verificationCodes.set(`email_${userId}`, {
      code,
      expiresAt,
      type: 'email'
    });

    // In production, send actual email
    console.log(`Email verification code for ${user.email}: ${code}`);
    
    return { success: true };
  }

  /**
   * Send phone verification code (SMS)
   */
  static async sendPhoneVerification(userId: string): Promise<{ success: boolean; error?: string }> {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + this.VERIFICATION_CODE_EXPIRY);

    // Store verification code
    this.verificationCodes.set(`phone_${userId}`, {
      code,
      expiresAt,
      type: 'phone'
    });

    // In production, send actual SMS
    console.log(`SMS verification code for ${user.phoneNumber}: ${code}`);
    
    return { success: true };
  }

  /**
   * Verify email with code
   */
  static verifyEmail(userId: string, code: string): { success: boolean; error?: string } {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const verificationData = this.verificationCodes.get(`email_${userId}`);
    if (!verificationData) {
      return { success: false, error: 'No verification code found' };
    }

    if (new Date() > verificationData.expiresAt) {
      this.verificationCodes.delete(`email_${userId}`);
      return { success: false, error: 'Verification code has expired' };
    }

    if (verificationData.code !== code) {
      return { success: false, error: 'Invalid verification code' };
    }

    // Mark email as verified
    user.isEmailVerified = true;
    this.verificationCodes.delete(`email_${userId}`);

    // Update account status if both email and phone are verified
    if (user.isEmailVerified && user.isPhoneVerified) {
      user.accountStatus = 'active';
    }

    return { success: true };
  }

  /**
   * Verify phone with code
   */
  static verifyPhone(userId: string, code: string): { success: boolean; error?: string } {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const verificationData = this.verificationCodes.get(`phone_${userId}`);
    if (!verificationData) {
      return { success: false, error: 'No verification code found' };
    }

    if (new Date() > verificationData.expiresAt) {
      this.verificationCodes.delete(`phone_${userId}`);
      return { success: false, error: 'Verification code has expired' };
    }

    if (verificationData.code !== code) {
      return { success: false, error: 'Invalid verification code' };
    }

    // Mark phone as verified
    user.isPhoneVerified = true;
    this.verificationCodes.delete(`phone_${userId}`);

    // Update account status if both email and phone are verified
    if (user.isEmailVerified && user.isPhoneVerified) {
      user.accountStatus = 'active';
    }

    return { success: true };
  }

  /**
   * Get user account information
   */
  static getUserAccount(userId: string): UserAccount | null {
    return this.users.get(userId) || null;
  }

  /**
   * Get IP address information
   */
  static getIPAddressInfo(ipAddress: string): IPAddressInfo | null {
    return this.ipAddresses.get(ipAddress) || null;
  }

  /**
   * Block an IP address (admin function)
   */
  static blockIPAddress(ipAddress: string, reason: string): { success: boolean } {
    const ipInfo = this.ipAddresses.get(ipAddress);
    
    if (ipInfo) {
      ipInfo.isBlocked = true;
    } else {
      this.ipAddresses.set(ipAddress, {
        ipAddress,
        accountCount: 0,
        accountIds: [],
        firstRegistration: new Date(),
        lastRegistration: new Date(),
        isBlocked: true
      });
    }

    console.log(`IP address ${ipAddress} blocked. Reason: ${reason}`);
    return { success: true };
  }

  /**
   * Get platform statistics
   */
  static getPlatformStats(): {
    totalUsers: number;
    verifiedUsers: number;
    pendingVerification: number;
    uniqueIPs: number;
    blockedIPs: number;
    averageAccountsPerIP: number;
  } {
    const totalUsers = this.users.size;
    let verifiedUsers = 0;
    let pendingVerification = 0;

    for (const user of this.users.values()) {
      if (user.accountStatus === 'active') {
        verifiedUsers++;
      } else if (user.accountStatus === 'pending_verification') {
        pendingVerification++;
      }
    }

    const uniqueIPs = this.ipAddresses.size;
    let blockedIPs = 0;
    let totalAccountsAcrossIPs = 0;

    for (const ipInfo of this.ipAddresses.values()) {
      if (ipInfo.isBlocked) {
        blockedIPs++;
      }
      totalAccountsAcrossIPs += ipInfo.accountCount;
    }

    const averageAccountsPerIP = uniqueIPs > 0 ? totalAccountsAcrossIPs / uniqueIPs : 0;

    return {
      totalUsers,
      verifiedUsers,
      pendingVerification,
      uniqueIPs,
      blockedIPs,
      averageAccountsPerIP: Math.round(averageAccountsPerIP * 100) / 100
    };
  }

  /**
   * Resend verification codes
   */
  static async resendVerification(userId: string, type: 'email' | 'phone'): Promise<{ success: boolean; error?: string }> {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (type === 'email' && user.isEmailVerified) {
      return { success: false, error: 'Email is already verified' };
    }

    if (type === 'phone' && user.isPhoneVerified) {
      return { success: false, error: 'Phone number is already verified' };
    }

    // Remove existing verification code
    this.verificationCodes.delete(`${type}_${userId}`);

    // Send new verification code
    if (type === 'email') {
      return await this.sendEmailVerification(userId);
    } else {
      return await this.sendPhoneVerification(userId);
    }
  }
}

// Initialize with some mock data for testing
UserManagementService.registerUser({
  email: 'test@example.com',
  phoneNumber: '+1234567890',
  ipAddress: '192.168.1.1',
  password: 'hashedpassword123'
});

export default UserManagementService;
