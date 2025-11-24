/**
 * ADMIN AUTHENTICATION HELPER
 * 
 * Checks if a user has admin access.
 * Admin users can:
 * - View all W-9 forms
 * - Generate 1099s
 * - Download backups
 * - View all user tax records
 */

import { createClient } from '@supabase/supabase-js';

// Admin email addresses (add more as needed)
const ADMIN_EMAILS = [
  'rf32191@gmail.com',
  // Add more admin emails here
];

const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

/**
 * Check if user has admin access
 * Returns true if:
 * 1. Request has valid admin API key, OR
 * 2. User is logged in with an admin email address
 */
export async function isAdmin(request: Request): Promise<{
  isAdmin: boolean;
  userId?: string;
  email?: string;
}> {
  // Check for API key first
  const apiKey = request.headers.get('x-api-key');
  if (apiKey === process.env.ADMIN_API_KEY) {
    return { isAdmin: true };
  }

  // Check for authenticated user with admin email
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { isAdmin: false };
  }

  const supabase = getServiceClient();
  const token = authHeader.replace('Bearer ', '');

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user || !user.email) {
      return { isAdmin: false };
    }

    // Check if user's email is in admin list
    const isAdminUser = ADMIN_EMAILS.includes(user.email.toLowerCase());

    return {
      isAdmin: isAdminUser,
      userId: user.id,
      email: user.email,
    };
  } catch (error) {
    console.error('Error checking admin status:', error);
    return { isAdmin: false };
  }
}

/**
 * Middleware to verify admin access
 * Throws error if user is not admin
 */
export async function requireAdmin(request: Request): Promise<{
  userId?: string;
  email?: string;
}> {
  const result = await isAdmin(request);

  if (!result.isAdmin) {
    throw new Error('Admin access required');
  }

  return {
    userId: result.userId,
    email: result.email,
  };
}

/**
 * Check if email is an admin email
 */
export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Get list of admin emails (for display purposes)
 */
export function getAdminEmails(): string[] {
  return [...ADMIN_EMAILS];
}

