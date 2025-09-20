import { NextRequest, NextResponse } from 'next/server';

// Import the verification codes from the send-code route
// In production, this would be stored in Redis or a database
const verificationCodes = new Map<string, { code: string; expiresAt: number; attempts: number }>();

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
    const { phoneNumber, code } = await request.json();

    if (!phoneNumber || !code) {
      return NextResponse.json(
        { error: 'Phone number and verification code are required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    const storedData = verificationCodes.get(formattedPhone);

    if (!storedData) {
      return NextResponse.json(
        { error: 'No verification code found. Please request a new code.' },
        { status: 404 }
      );
    }

    // Check if code has expired
    if (Date.now() > storedData.expiresAt) {
      verificationCodes.delete(formattedPhone);
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check attempts limit
    if (storedData.attempts >= 3) {
      verificationCodes.delete(formattedPhone);
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new code.' },
        { status: 400 }
      );
    }

    // Verify the code
    if (storedData.code !== code) {
      storedData.attempts += 1;
      verificationCodes.set(formattedPhone, storedData);
      
      return NextResponse.json(
        { error: `Invalid verification code. ${3 - storedData.attempts} attempts remaining.` },
        { status: 400 }
      );
    }

    // Code is valid - mark as verified but keep it for password reset
    storedData.attempts = 0; // Reset attempts
    verificationCodes.set(formattedPhone, { ...storedData, verified: true } as any);

    return NextResponse.json({ 
      success: true, 
      message: 'Verification code confirmed successfully' 
    });

  } catch (error) {
    console.error('Verify code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export for use in other routes
export { verificationCodes };
