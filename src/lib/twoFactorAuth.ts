// Two-Factor Authentication Service
// SMS-based verification for enhanced security

export interface TwoFactorCode {
  id: string;
  userId: string;
  phoneNumber: string;
  code: string;
  purpose: 'login' | 'registration' | 'password_reset' | 'phone_verification';
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  verified: boolean;
  ipAddress: string;
}

export interface TwoFactorSettings {
  userId: string;
  enabled: boolean;
  phoneNumber: string;
  backupCodes: string[];
  lastUsed?: Date;
  createdAt: Date;
}

export class TwoFactorAuthService {
  private static readonly STORAGE_KEY_CODES = 'dropdollar_2fa_codes';
  private static readonly STORAGE_KEY_SETTINGS = 'dropdollar_2fa_settings';
  private static readonly CODE_EXPIRY_MINUTES = 10; // 10 minutes
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly CODE_LENGTH = 6;

  // Get all 2FA codes from localStorage
  private static getCodes(): TwoFactorCode[] {
    if (typeof window === 'undefined') return [];
    const codes = localStorage.getItem(this.STORAGE_KEY_CODES);
    return codes ? JSON.parse(codes) : [];
  }

  // Save 2FA codes to localStorage
  private static saveCodes(codes: TwoFactorCode[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY_CODES, JSON.stringify(codes));
  }

  // Get all 2FA settings from localStorage
  private static getSettings(): TwoFactorSettings[] {
    if (typeof window === 'undefined') return [];
    const settings = localStorage.getItem(this.STORAGE_KEY_SETTINGS);
    return settings ? JSON.parse(settings) : [];
  }

  // Save 2FA settings to localStorage
  private static saveSettings(settings: TwoFactorSettings[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }

  // Generate unique ID
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Generate random 6-digit code
  private static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate backup codes
  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
    }
    return codes;
  }

  // Clean up expired codes
  private static cleanupExpiredCodes(): void {
    const codes = this.getCodes();
    const now = new Date();
    const validCodes = codes.filter(code => new Date(code.expiresAt) > now);
    
    if (validCodes.length !== codes.length) {
      this.saveCodes(validCodes);
    }
  }

  // Enable 2FA for a user
  static async enable2FA(userId: string, phoneNumber: string): Promise<{
    success: boolean;
    message: string;
    backupCodes?: string[];
  }> {
    const settings = this.getSettings();
    const existingIndex = settings.findIndex(s => s.userId === userId);
    
    const backupCodes = this.generateBackupCodes();
    const newSettings: TwoFactorSettings = {
      userId,
      enabled: true,
      phoneNumber,
      backupCodes,
      createdAt: new Date(),
    };

    if (existingIndex !== -1) {
      settings[existingIndex] = newSettings;
    } else {
      settings.push(newSettings);
    }

    this.saveSettings(settings);

    console.log(`🔐 2FA enabled for user ${userId} with phone ${phoneNumber}`);

    return {
      success: true,
      message: '2FA enabled successfully. Please save your backup codes.',
      backupCodes,
    };
  }

  // Disable 2FA for a user
  static async disable2FA(userId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const settings = this.getSettings();
    const filteredSettings = settings.filter(s => s.userId !== userId);
    
    this.saveSettings(filteredSettings);

    console.log(`🔓 2FA disabled for user ${userId}`);

    return {
      success: true,
      message: '2FA has been disabled for your account.',
    };
  }

  // Check if 2FA is enabled for a user
  static is2FAEnabled(userId: string): boolean {
    const settings = this.getSettings();
    const userSettings = settings.find(s => s.userId === userId);
    return userSettings ? userSettings.enabled : false;
  }

  // Get user's 2FA settings
  static get2FASettings(userId: string): TwoFactorSettings | null {
    const settings = this.getSettings();
    return settings.find(s => s.userId === userId) || null;
  }

  // Send 2FA code via SMS (uses Twilio Verify API route when env is set; falls back to mock)
  static async sendCode(
    userId: string, 
    phoneNumber: string, 
    purpose: TwoFactorCode['purpose'],
    ipAddress: string = 'unknown'
  ): Promise<{
    success: boolean;
    message: string;
    codeId?: string;
  }> {
    // If Twilio env present, call API route
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_TWILIO_VERIFY_ENABLED === 'true') {
      try {
        const res = await fetch('/api/verify/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber })
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          return { success: false, message: json.message || 'Failed to send verification' };
        }
        // Create local code record placeholder so UI flow remains consistent
        this.cleanupExpiredCodes();
        const codes = this.getCodes();
        const newCode: TwoFactorCode = {
          id: this.generateId(),
          userId,
          phoneNumber,
          code: 'REMOTE',
          purpose,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000),
          attempts: 0,
          maxAttempts: this.MAX_ATTEMPTS,
          verified: false,
          ipAddress,
        };
        codes.push(newCode);
        this.saveCodes(codes);
        return { success: true, message: 'Verification code sent via SMS.', codeId: newCode.id };
      } catch (e: any) {
        // Fall through to mock
        console.warn('Twilio send failed, using mock:', e?.message);
      }
    }

    // Mock mode
    this.cleanupExpiredCodes();

    // Check for recent codes to prevent spam
    const codes = this.getCodes();
    const recentCode = codes.find(code => 
      code.userId === userId && 
      code.purpose === purpose &&
      new Date(code.createdAt).getTime() > Date.now() - 60000 // 1 minute ago
    );

    if (recentCode) {
      return {
        success: false,
        message: 'Please wait before requesting another code.',
      };
    }

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000);

    const newCode: TwoFactorCode = {
      id: this.generateId(),
      userId,
      phoneNumber,
      code,
      purpose,
      createdAt: new Date(),
      expiresAt,
      attempts: 0,
      maxAttempts: this.MAX_ATTEMPTS,
      verified: false,
      ipAddress,
    };

    codes.push(newCode);
    this.saveCodes(codes);

    // Simulate SMS sending (in production, integrate with Twilio/AWS SNS)
    console.log(`📱 SMS sent to ${phoneNumber}: Your DropDollar verification code is ${code}. Valid for ${this.CODE_EXPIRY_MINUTES} minutes.`);

    return {
      success: true,
      message: `Verification code sent to ${phoneNumber.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2')}`,
      codeId: newCode.id,
    };
  }

  // Verify 2FA code (uses Twilio Verify API route when enabled)
  static async verifyCode(
    codeId: string,
    inputCode: string,
    ipAddress: string = 'unknown'
  ): Promise<{
    success: boolean;
    message: string;
    userId?: string;
  }> {
    // If Twilio enabled, call API route
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_TWILIO_VERIFY_ENABLED === 'true') {
      try {
        const codes = this.getCodes();
        const record = codes.find(c => c.id === codeId);
        if (!record) {
          return { success: false, message: 'Invalid or expired verification code.' };
        }
        const res = await fetch('/api/verify/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: record.phoneNumber, code: inputCode })
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          return { success: false, message: json.message || 'Invalid code.' };
        }
        // Mark as verified locally
        this.cleanupExpiredCodes();
        const idx = codes.findIndex(c => c.id === codeId);
        if (idx !== -1) {
          codes[idx].verified = true;
          this.saveCodes(codes);
        }
        return { success: true, message: 'Verification successful!', userId: record.userId };
      } catch (e: any) {
        console.warn('Twilio verify failed, using mock:', e?.message);
      }
    }

    this.cleanupExpiredCodes();

    const codes = this.getCodes();
    const codeIndex = codes.findIndex(c => c.id === codeId);

    if (codeIndex === -1) {
      return {
        success: false,
        message: 'Invalid or expired verification code.',
      };
    }

    const codeRecord = codes[codeIndex];

    // Check if code is expired
    if (new Date() > new Date(codeRecord.expiresAt)) {
      return {
        success: false,
        message: 'Verification code has expired. Please request a new one.',
      };
    }

    // Check if code is already verified
    if (codeRecord.verified) {
      return {
        success: false,
        message: 'This verification code has already been used.',
      };
    }

    // Increment attempts
    codes[codeIndex].attempts++;

    // Check max attempts
    if (codes[codeIndex].attempts > codeRecord.maxAttempts) {
      return {
        success: false,
        message: 'Too many failed attempts. Please request a new code.',
      };
    }

    // Verify code
    if (inputCode !== codeRecord.code) {
      this.saveCodes(codes);
      return {
        success: false,
        message: `Invalid code. ${codeRecord.maxAttempts - codes[codeIndex].attempts} attempts remaining.`,
      };
    }

    // Mark as verified
    codes[codeIndex].verified = true;
    this.saveCodes(codes);

    // Update last used for 2FA settings
    if (codeRecord.purpose === 'login') {
      const settings = this.getSettings();
      const settingsIndex = settings.findIndex(s => s.userId === codeRecord.userId);
      if (settingsIndex !== -1) {
        settings[settingsIndex].lastUsed = new Date();
        this.saveSettings(settings);
      }
    }

    console.log(`✅ 2FA code verified for user ${codeRecord.userId}`);

    return {
      success: true,
      message: 'Verification successful!',
      userId: codeRecord.userId,
    };
  }

  // Verify backup code
  static async verifyBackupCode(
    userId: string,
    backupCode: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const settings = this.getSettings();
    const userSettingsIndex = settings.findIndex(s => s.userId === userId);

    if (userSettingsIndex === -1) {
      return {
        success: false,
        message: '2FA is not enabled for this account.',
      };
    }

    const userSettings = settings[userSettingsIndex];
    const codeIndex = userSettings.backupCodes.indexOf(backupCode.toUpperCase());

    if (codeIndex === -1) {
      return {
        success: false,
        message: 'Invalid backup code.',
      };
    }

    // Remove used backup code
    userSettings.backupCodes.splice(codeIndex, 1);
    userSettings.lastUsed = new Date();
    
    settings[userSettingsIndex] = userSettings;
    this.saveSettings(settings);

    console.log(`🔑 Backup code used for user ${userId}. ${userSettings.backupCodes.length} codes remaining.`);

    return {
      success: true,
      message: `Backup code verified. You have ${userSettings.backupCodes.length} backup codes remaining.`,
    };
  }

  // Get user's remaining backup codes count
  static getBackupCodesCount(userId: string): number {
    const settings = this.getSettings();
    const userSettings = settings.find(s => s.userId === userId);
    return userSettings ? userSettings.backupCodes.length : 0;
  }

  // Regenerate backup codes
  static async regenerateBackupCodes(userId: string): Promise<{
    success: boolean;
    message: string;
    backupCodes?: string[];
  }> {
    const settings = this.getSettings();
    const userSettingsIndex = settings.findIndex(s => s.userId === userId);

    if (userSettingsIndex === -1) {
      return {
        success: false,
        message: '2FA is not enabled for this account.',
      };
    }

    const newBackupCodes = this.generateBackupCodes();
    settings[userSettingsIndex].backupCodes = newBackupCodes;
    
    this.saveSettings(settings);

    console.log(`🔄 Backup codes regenerated for user ${userId}`);

    return {
      success: true,
      message: 'New backup codes generated successfully.',
      backupCodes: newBackupCodes,
    };
  }

  // Get 2FA statistics
  static get2FAStats(): {
    totalUsers: number;
    enabled2FA: number;
    recentCodes: number;
    successRate: number;
  } {
    const settings = this.getSettings();
    const codes = this.getCodes();
    
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCodes = codes.filter(code => new Date(code.createdAt) > last24Hours);
    const successfulCodes = recentCodes.filter(code => code.verified);
    
    return {
      totalUsers: settings.length,
      enabled2FA: settings.filter(s => s.enabled).length,
      recentCodes: recentCodes.length,
      successRate: recentCodes.length > 0 ? (successfulCodes.length / recentCodes.length) * 100 : 0,
    };
  }

  // Format phone number for display
  static formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4');
    }
    return phoneNumber;
  }

  // Mask phone number for security
  static maskPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      return cleaned.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2');
    }
    return phoneNumber;
  }
}

// Initialize cleanup on module load
if (typeof window !== 'undefined') {
  // Clean up expired codes every 5 minutes
  setInterval(() => {
    TwoFactorAuthService['cleanupExpiredCodes']();
  }, 5 * 60 * 1000);
}
