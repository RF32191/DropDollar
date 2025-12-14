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

    // Check if phone exists in users table (check both formatted and normalized)
    // First check with formatted phone
    const { data: data1, error: error1 } = await supabase
      .from('users')
      .select('id')
      .eq('phone', formattedPhone)
      .single();

    // Also check with normalized phone for any variations
    const { data: data2, error: error2 } = await supabase
      .from('users')
      .select('id, phone')
      .not('phone', 'is', null)
      .limit(100); // Get a reasonable number to check

    // Check if any existing phone matches normalized version
    let exists = !!data1;
    if (!exists && data2) {
      exists = data2.some((user: any) => {
        if (!user.phone) return false;
        const existingNormalized = normalizePhoneNumber(user.phone);
        return existingNormalized === normalizedPhone;
      });
    }

    if (error1 && error1.code !== 'PGRST116' && error1.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected
      console.error('Phone check error:', error1);
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

