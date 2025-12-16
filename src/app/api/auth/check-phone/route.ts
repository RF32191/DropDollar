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

    // Check user_phones table for existing phone number
    const { data: existingPhones, error: checkError } = await supabase
      .from('user_phones')
      .select('id')
      .eq('phone_number', formattedPhone)
      .limit(1);

    if (checkError) {
      console.error('Phone check error:', checkError);
    }

    const exists = existingPhones && existingPhones.length > 0;
    
    console.log('📞 Phone check:', formattedPhone, 'exists:', exists);

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

