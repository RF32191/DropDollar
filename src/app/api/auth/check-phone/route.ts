import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizePhoneNumber, formatPhoneNumber, validatePhoneNumber } from '@/lib/utils/phoneFormatter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { exists: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate and format phone number
    const validation = validatePhoneNumber(phone);
    if (!validation.valid) {
      return NextResponse.json(
        { exists: false, error: validation.error },
        { status: 400 }
      );
    }

    const formattedPhone = validation.formatted!;
    const normalizedPhone = normalizePhoneNumber(phone);

    // Use database function for more reliable duplicate checking
    const { data: phoneAvailable, error: rpcError } = await supabase
      .rpc('is_phone_available', { phone_param: formattedPhone });

    let exists = false;
    
    if (rpcError) {
      console.error('Phone check RPC error:', rpcError);
      // Fallback to manual check
      const { data: existingPhones } = await supabase
        .from('users')
        .select('id, phone')
        .not('phone', 'is', null)
        .limit(10000); // Increased limit for better coverage

      if (existingPhones) {
        exists = existingPhones.some((user: any) => {
          if (!user.phone) return false;
          const existingNormalized = normalizePhoneNumber(user.phone);
          return existingNormalized === normalizedPhone;
        });
      }
    } else {
      // RPC returns true if available, false if taken
      exists = phoneAvailable === false;
    }

    return NextResponse.json(
      { exists, formatted: formattedPhone },
      { status: 200 }
    );

  } catch (error) {
    console.error('Phone check error:', error);
    return NextResponse.json(
      { exists: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

