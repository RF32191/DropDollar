import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

// Store verification codes temporarily (in production, use Redis or similar)
const verificationCodes = new Map<string, { code: string; expiresAt: number; attempts: number }>();

// Clean up expired codes
setInterval(() => {
  const now = Date.now();
  for (const [phone, data] of verificationCodes.entries()) {
    if (data.expiresAt < now) {
      verificationCodes.delete(phone);
    }
  }
}, 60000); // Clean up every minute

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
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Check if user exists with this phone number
    const { data: user, error } = await supabase
      .from('users')
      .select('id, phone')
      .eq('phone', formattedPhone)
      .single();
    
    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this phone number' },
        { status: 404 }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store the code
    verificationCodes.set(formattedPhone, { code, expiresAt, attempts: 0 });

    // Send SMS using Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID) {
      try {
        const response = await fetch(`https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/Verifications`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: formattedPhone,
            Channel: 'sms',
            CustomCode: code,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Twilio error:', errorData);
          throw new Error('Failed to send SMS');
        }

        console.log(`Verification code sent to ${formattedPhone}: ${code}`);
      } catch (error) {
        console.error('Error sending SMS:', error);
        // In development, we'll continue without SMS
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: 'Failed to send verification code' },
            { status: 500 }
          );
        }
      }
    } else {
      console.log(`Development mode - Verification code for ${formattedPhone}: ${code}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Verification code sent successfully',
      // In development, include the code for testing
      ...(process.env.NODE_ENV === 'development' && { code })
    });

  } catch (error) {
    console.error('Send code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Export the verification codes map for use in other routes
export { verificationCodes };
