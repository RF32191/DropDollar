import crypto from 'crypto';
import { GameToken } from '@/types/gameSession';

export class GameTokenService {
  private static readonly SECRET = process.env.GAME_TOKEN_SECRET || 'fallback-secret-for-development-only-change-in-production';
  private static readonly SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Generate a secure game session token with cryptographic signature
   */
  static generateToken(
    userId: string,
    gameType: string,
    listingId?: string,
    entryNumber?: number
  ): { token: string; payload: GameToken } {
    const sessionId = crypto.randomUUID();
    const timestamp = Date.now();
    const expiresAt = timestamp + this.SESSION_TIMEOUT;
    
    // Generate deterministic RNG seed from listing + entry (or random if not provided)
    const rngSeed = listingId && entryNumber 
      ? this.generateRNGSeed(listingId, entryNumber)
      : Math.floor(Math.random() * 0xFFFFFFFF);
    
    const payload: GameToken = {
      sessionId,
      userId,
      gameType,
      rngSeed,
      listingId,
      entryNumber,
      timestamp,
      expiresAt
    };
    
    // Create HMAC signature
    const signature = this.signPayload(payload);
    
    // Combine payload + signature into base64 token
    const token = Buffer.from(
      JSON.stringify({ payload, signature })
    ).toString('base64');
    
    return { token, payload };
  }
  
  /**
   * Verify and decode a game token
   * Returns null if token is invalid or expired
   */
  static verifyToken(token: string): GameToken | null {
    try {
      // Decode base64 token
      const decoded = JSON.parse(
        Buffer.from(token, 'base64').toString('utf-8')
      );
      
      const { payload, signature } = decoded;
      
      if (!payload || !signature) {
        console.error('❌ Token missing payload or signature');
        return null;
      }
      
      // Verify signature hasn't been tampered with
      const expectedSignature = this.signPayload(payload);
      if (signature !== expectedSignature) {
        console.error('❌ Invalid token signature - token was tampered with');
        return null;
      }
      
      // Check if token has expired
      if (Date.now() > payload.expiresAt) {
        console.error('❌ Token expired');
        return null;
      }
      
      return payload as GameToken;
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      return null;
    }
  }
  
  /**
   * Create HMAC-SHA256 signature of payload
   * This prevents tampering with the token data
   */
  private static signPayload(payload: GameToken): string {
    const hmac = crypto.createHmac('sha256', this.SECRET);
    
    // Sign only the critical fields in a deterministic order
    const dataToSign = JSON.stringify({
      sessionId: payload.sessionId,
      userId: payload.userId,
      gameType: payload.gameType,
      rngSeed: payload.rngSeed,
      timestamp: payload.timestamp,
      expiresAt: payload.expiresAt
    });
    
    hmac.update(dataToSign);
    return hmac.digest('hex');
  }
  
  /**
   * Generate deterministic RNG seed from listing ID + entry number
   * This ensures all players in same match get same random events
   */
  private static generateRNGSeed(
    listingId: string,
    entryNumber: number
  ): number {
    const hash = crypto
      .createHash('sha256')
      .update(`${listingId}-${entryNumber}`)
      .digest('hex');
    
    // Convert first 8 hex chars to integer (32-bit)
    return parseInt(hash.substring(0, 8), 16);
  }
  
  /**
   * Generate a short hash for database storage
   * Used to quickly lookup sessions without storing full token
   */
  static generateTokenHash(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex')
      .substring(0, 20);
  }
}

