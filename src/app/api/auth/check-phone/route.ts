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

    console.log('🔍 [CHECK-PHONE] Incoming phone:', phone);
    console.log('🔍 [CHECK-PHONE] Formatted phone:', formattedPhone);

    // Check user_phones table for existing phone number
    const { data: existingPhones, error: checkError } = await supabase
      .from('user_phones')
      .select('id, phone_number, user_id, created_at')
      .eq('phone_number', formattedPhone)
      .limit(1);

    if (checkError) {
      console.error('❌ [CHECK-PHONE] Error:', checkError);
      console.error('❌ [CHECK-PHONE] Error code:', checkError.code);
      console.error('❌ [CHECK-PHONE] Error message:', checkError.message);
      
      // If table doesn't exist, return clear error
      if (checkError.message?.includes('relation "user_phones" does not exist') || 
          checkError.code === '42P01') {
        return NextResponse.json(
          { 
            exists: false, 
            error: 'Database table missing - please contact support',
            debug: 'user_phones table does not exist'
          },
          { status: 500 }
        );
      }
    }

    const exists = existingPhones && existingPhones.length > 0;
    
    console.log('📞 [CHECK-PHONE] Query result:', { 
      formattedPhone, 
      exists, 
      foundRecords: existingPhones?.length || 0,
      records: existingPhones 
    });

    // Also check ALL phones in table for debugging
    const { data: allPhones } = await supabase
      .from('user_phones')
      .select('phone_number')
      .limit(10);
    
    console.log('📊 [CHECK-PHONE] Sample of phones in DB:', allPhones?.map(p => p.phone_number));

    return NextResponse.json(
      { exists, formatted: formattedPhone, debug: { recordsFound: existingPhones?.length || 0 } },
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

