import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/database';
import { validatePasswordStrength } from '@/lib/passwordUtils';

// Import the verification codes (in production, use Redis or database)
const verificationCodes = new Map<string, { code: string; expiresAt: number; attempts: number; verified?: boolean }>();

function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it starts with 1 and has 11 digits, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If it has 10 digits, assume US number and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If it already starts with +, return as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Otherwise, add + to the beginning
  return `+${digits}`;
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, code, newPassword } = await request.json();

    if (!phoneNumber || !code || !newPassword) {
      return NextResponse.json(
        { error: 'Phone number, verification code, and new password are required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    const storedData = verificationCodes.get(formattedPhone);

    if (!storedData || !storedData.verified) {
      return NextResponse.json(
        { error: 'Invalid or unverified code. Please verify your code first.' },
        { status: 400 }
      );
    }

    // Check if code has expired
    if (Date.now() > storedData.expiresAt) {
      verificationCodes.delete(formattedPhone);
      return NextResponse.json(
        { error: 'Verification code has expired. Please start over.' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordStrength = validatePasswordStrength(newPassword);
    if (!passwordStrength.isValid) {
      return NextResponse.json(
        { 
          error: 'Password does not meet security requirements',
          feedback: passwordStrength.feedback 
        },
        { status: 400 }
      );
    }

    // Get user and update password
    await database.initDB();
    const user = await database.getUserByPhoneNumber(formattedPhone);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = await database.hashPassword(newPassword);
    
    // Update user's password
    const success = await database.updateUser(user.id, { 
      password: hashedPassword,
      lastLogin: new Date()
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Clean up verification code
    verificationCodes.delete(formattedPhone);

    // Log the password reset for security
    console.log(`Password reset successful for user ${user.id} (${formattedPhone})`);

    return NextResponse.json({ 
      success: true, 
      message: 'Password reset successfully' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
