import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizePhoneNumber, formatPhoneNumber, validatePhoneNumber } from '@/lib/utils/phoneFormatter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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

    // Extract last 7 digits for matching (handles format differences)
    const digitsOnly = formattedPhone.replace(/\D/g, '');
    const last7Digits = digitsOnly.slice(-7);
    
    console.log('🔍 [CHECK-PHONE] Formatted:', formattedPhone);
    console.log('🔍 [CHECK-PHONE] Last 7 digits:', last7Digits);

    // METHOD 1: Check phone_verification_codes table (this HAS data!)
    // Look for VERIFIED phones (verified = true means they completed registration)
    console.log('🔍 [CHECK-PHONE] Checking phone_verification_codes for verified phones...');
    const { data: verifiedCodes, error: verifyError } = await supabase
      .from('phone_verification_codes')
      .select('phone, verified, created_at')
      .eq('verified', true)
      .limit(100);
    
    if (!verifyError && verifiedCodes && verifiedCodes.length > 0) {
      // Check if any verified phone matches (by last 7 digits)
      const matchingPhone = verifiedCodes.find(record => {
        const recordDigits = record.phone?.replace(/\D/g, '') || '';
        const recordLast7 = recordDigits.slice(-7);
        return recordLast7 === last7Digits;
      });
      
      if (matchingPhone) {
        console.log('🚫 [CHECK-PHONE] Found verified phone match:', matchingPhone.phone);
        return NextResponse.json(
          { exists: true, formatted: formattedPhone, method: 'phone_verification_codes', match: matchingPhone.phone },
          { status: 200 }
        );
      }
    }
    
    console.log('🔍 [CHECK-PHONE] No match in phone_verification_codes, checking user_phones...');

    // METHOD 2: Try database function (bypasses RLS reliably)
    console.log('🔍 [CHECK-PHONE] Using database function to check...');
    const { data: functionResult, error: functionError } = await supabase
      .rpc('check_phone_exists', { phone_to_check: formattedPhone });

    if (!functionError && functionResult !== null && functionResult === true) {
      console.log('✅ [CHECK-PHONE] Database function result:', functionResult);
      
      return NextResponse.json(
        { exists: functionResult, formatted: formattedPhone, method: 'database_function' },
        { status: 200 }
      );
    }

    console.log('⚠️ [CHECK-PHONE] Database function returned:', functionResult);

    // METHOD 3: Fallback to direct query on user_phones
    const { data: existingPhones, error: checkError } = await supabase
      .from('user_phones')
      .select('id, phone_number, user_id, created_at')
      .eq('phone_number', formattedPhone)
      .limit(1);

    if (checkError) {
      console.error('❌ [CHECK-PHONE] Direct query error:', checkError);
      console.error('❌ [CHECK-PHONE] Error code:', checkError.code);
      console.error('❌ [CHECK-PHONE] Error message:', checkError.message);
      
      // If table doesn't exist, return clear error
      if (checkError.message?.includes('relation "user_phones" does not exist') || 
          checkError.code === '42P01') {
        return NextResponse.json(
          { 
            exists: false, 
            error: 'Database table missing - please run FIX_PHONE_CHECK_WITH_RLS.sql',
            debug: 'user_phones table does not exist'
          },
          { status: 500 }
        );
      }
      
      // If function doesn't exist
      if (checkError.message?.includes('function') || checkError.code === '42883') {
        return NextResponse.json(
          { 
            exists: false, 
            error: 'Database function missing - please run FIX_PHONE_CHECK_WITH_RLS.sql',
            debug: 'check_phone_exists function does not exist'
          },
          { status: 500 }
        );
      }
    }

    const exists = existingPhones && existingPhones.length > 0;
    
    console.log('📞 [CHECK-PHONE] Direct query result:', { 
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
      { exists, formatted: formattedPhone, method: 'direct_query', debug: { recordsFound: existingPhones?.length || 0 } },
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

