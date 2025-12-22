import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Format phone number to E.164 format
function formatPhoneNumber(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    digits = '1' + digits;
  }
  return '+' + digits;
}

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhoneNumber(phone);
    const digitsOnly = formattedPhone.replace(/\D/g, '');
    const last10Digits = digitsOnly.slice(-10);

    console.log('🔍 [FindEmail] Looking for email by phone:', last10Digits.slice(-4) + '****');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Find user by phone in user_phones table
    const { data: allPhones, error: phonesError } = await supabaseAdmin
      .from('user_phones')
      .select('user_id, phone_number');

    if (phonesError) {
      console.error('❌ [FindEmail] Error fetching phones:', phonesError);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      );
    }

    // Find matching phone by last 10 digits
    const matchedPhone = allPhones?.find(p => {
      if (!p.phone_number) return false;
      const pDigits = p.phone_number.replace(/\D/g, '');
      const pLast10 = pDigits.slice(-10);
      return pLast10 === last10Digits;
    });

    if (!matchedPhone) {
      console.log('❌ [FindEmail] No phone match found');
      return NextResponse.json(
        { success: false, error: 'No account found with this phone number.' },
        { status: 404 }
      );
    }

    // Get user email
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', matchedPhone.user_id)
      .single();

    if (userError || !userData?.email) {
      console.log('❌ [FindEmail] User or email not found');
      return NextResponse.json(
        { success: false, error: 'Account not found.' },
        { status: 404 }
      );
    }

    console.log('✅ [FindEmail] Found email for phone');

    return NextResponse.json({
      success: true,
      email: userData.email,
    });

  } catch (error) {
    console.error('❌ [FindEmail] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

