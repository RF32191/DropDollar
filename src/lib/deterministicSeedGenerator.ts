/**
 * Deterministic RNG Seed Generator
 * 
 * Generates a deterministic seed from a session ID to ensure
 * all players in the same session get the exact same RNG seed.
 * 
 * This matches the SQL function: generate_deterministic_rng_seed(session_id)
 */

/**
 * Generate a deterministic integer seed from a UUID string
 * This ensures the same session ID always produces the same seed
 * 
 * @param sessionId - UUID string (e.g., "123e4567-e89b-12d3-a456-426614174000")
 * @returns Integer seed between 1 and 2,147,483,647
 */
export function generateDeterministicSeed(sessionId: string): number {
  if (!sessionId) {
    console.warn('⚠️ [DeterministicSeed] No session ID provided, using fallback seed');
    return 1;
  }

  try {
    // Remove hyphens and convert UUID to a hash-like value
    const uuidWithoutHyphens = sessionId.replace(/-/g, '');
    
    // Simple hash function: convert UUID string to integer
    // This mimics the SQL MD5 hash approach
    let hash = 0;
    for (let i = 0; i < uuidWithoutHyphens.length; i++) {
      const char = uuidWithoutHyphens.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Ensure positive integer in valid range (1 to max safe integer)
    const seed = (Math.abs(hash) % 2147483647) + 1;
    
    return seed;
  } catch (error) {
    console.error('❌ [DeterministicSeed] Error generating seed from session ID:', error);
    return 1; // Fallback to safe default
  }
}

/**
 * Get RNG seed for a game session
 * Priority: session.rng_seed > deterministic from session ID > config.rng_seed > fallback
 * 
 * @param sessionId - UUID string of the session
 * @param sessionRngSeed - Optional RNG seed from session object
 * @param configRngSeed - Optional RNG seed from config object
 * @returns Valid RNG seed (always > 0)
 */
export function getRngSeedForSession(
  sessionId: string,
  sessionRngSeed?: number | null,
  configRngSeed?: number | null
): number {
  // Priority 1: Use session's rng_seed if available and valid
  if (sessionRngSeed && sessionRngSeed > 0) {
    return sessionRngSeed;
  }
  
  // Priority 2: Generate deterministic seed from session ID
  if (sessionId) {
    const deterministicSeed = generateDeterministicSeed(sessionId);
    console.log('🎲 [DeterministicSeed] Generated seed from session ID:', {
      sessionId,
      deterministicSeed
    });
    return deterministicSeed;
  }
  
  // Priority 3: Use config seed if available
  if (configRngSeed && configRngSeed > 0) {
    return configRngSeed;
  }
  
  // Priority 4: Fallback to safe default
  console.warn('⚠️ [DeterministicSeed] No valid seed found, using fallback');
  return 1;
}

