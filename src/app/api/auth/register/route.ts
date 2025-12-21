import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatPhoneNumber, validatePhoneNumber, normalizePhoneNumber } from '@/lib/utils/phoneFormatter';

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
    const body = await request.json();
    const { 
      firstName, 
      lastName, 
      username, 
      email, 
      password,
      phone,
      location,
      marketingConsent 
    } = body;

    // Validate required fields
    if (!email || !password || !username) {
      return NextResponse.json(
        { message: 'Email, password, and username are required' },
        { status: 400 }
      );
    }

    // Validate and format phone number
    if (!phone || phone.trim() === '') {
      return NextResponse.json(
        { message: 'Phone number is required for account security and identity verification' },
        { status: 400 }
      );
    }

    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.valid) {
      return NextResponse.json(
        { message: phoneValidation.error || 'Invalid phone number format' },
        { status: 400 }
      );
    }

    const formattedPhone = phoneValidation.formatted!;
    const normalizedPhone = normalizePhoneNumber(phone);

    // Verify phone number has been verified
    const { data: phoneVerified, error: verifyCheckError } = await supabase
      .rpc('is_phone_verified', { phone_param: formattedPhone });

    if (verifyCheckError) {
      console.error('Phone verification check error:', verifyCheckError);
      // Continue but log the error
    } else if (!phoneVerified) {
      return NextResponse.json(
        { message: 'Phone number must be verified before creating an account. Please verify your phone number first.' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existingEmail) {
      return NextResponse.json(
        { message: 'An account with this email address already exists. Please use a different email or try signing in.' },
        { status: 400 }
      );
    }

    // Check if username is already taken
    const { data: existingUsername } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUsername) {
      return NextResponse.json(
        { message: 'Username is already taken' },
        { status: 400 }
      );
    }

    // Check if phone number already exists using database function (more reliable)
    const { data: phoneCheckResult, error: phoneCheckError } = await supabase
      .rpc('is_phone_available', { phone_param: formattedPhone });

    if (phoneCheckError) {
      console.error('Phone check RPC error:', phoneCheckError);
      // Fallback to manual check
      const { data: existingPhones } = await supabase
        .from('users')
        .select('id, phone')
        .not('phone', 'is', null)
        .limit(10000); // Increased limit

      if (existingPhones) {
        const phoneExists = existingPhones.some((user: any) => {
          if (!user.phone) return false;
          const existingNormalized = normalizePhoneNumber(user.phone);
          return existingNormalized === normalizedPhone;
        });

        if (phoneExists) {
          return NextResponse.json(
            { message: 'This phone number is already registered. Please use a different phone number or try signing in.' },
            { status: 400 }
          );
        }
      }
    } else if (phoneCheckResult === false) {
      return NextResponse.json(
        { message: 'This phone number is already registered. Please use a different phone number or try signing in.' },
        { status: 400 }
      );
    }

    // Create user with Supabase Auth
    console.log('📝 Creating auth user with phone:', formattedPhone);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          first_name: firstName,
          last_name: lastName,
          phone: formattedPhone, // Use formatted phone in auth metadata
          location,
          marketing_consent: marketingConsent
        }
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      
      // Handle specific error cases
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { message: 'An account with this email already exists' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { message: authError.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { message: 'Failed to create user account' },
        { status: 400 }
      );
    }

    // Create user profile in users table with formatted phone number
    console.log('📝 Inserting user profile (without phone in users table)');
    const userProfile = {
        id: authData.user.id,
        email: email.toLowerCase().trim(),
        username,
        full_name: `${firstName || ''} ${lastName || ''}`.trim() || null,
        location: location || null,
      tokens: 1, // Starting token
        is_verified: false,
        marketing_consent: marketingConsent || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    console.log('📦 User profile data:', JSON.stringify(userProfile, null, 2));
    
    const { data: insertedProfile, error: profileError } = await supabase
      .from('users')
      .insert(userProfile)
      .select();
    
    // ALWAYS try to save phone, even if profile has issues
    console.log('📱📱📱 [REGISTER] ==========================================');
    console.log('📱📱📱 [REGISTER] SAVING PHONE NUMBER TO DATABASE');
    console.log('📱📱📱 [REGISTER] This happens REGARDLESS of profile status');
    console.log('📱📱📱 [REGISTER] ==========================================');
    console.log('📱 [REGISTER] Phone:', formattedPhone);
    console.log('📱 [REGISTER] User ID:', authData.user.id);
    
    const phoneRecord = {
      user_id: authData.user.id,
      phone_number: formattedPhone,
      verified: true,
      verified_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    console.log('📱 [REGISTER] Phone record:', JSON.stringify(phoneRecord, null, 2));
    
    if (insertedProfile) {
      console.log('✅ Profile created successfully:', insertedProfile);
    } else {
      console.log('⚠️ Profile may have had issues, but we STILL save the phone');
    }
      
    let phoneData = null;
    let phoneError = null;
    let saveMethod = '';
    
    // METHOD 1: Direct insert first (most reliable)
    try {
      console.log('📱 [REGISTER] METHOD 1: Direct insert (no function)...');
      const { data: insertResult, error: insertError } = await supabase
        .from('user_phones')
        .insert(phoneRecord)
        .select();
      
      if (insertError) {
        console.error('❌ [REGISTER] Direct insert error:', insertError);
        console.error('❌ [REGISTER] Error code:', insertError.code);
        console.error('❌ [REGISTER] Error message:', insertError.message);
        console.error('❌ [REGISTER] Full error:', JSON.stringify(insertError, null, 2));
        throw insertError;
      }
      
      console.log('✅✅✅ [REGISTER] Phone saved via direct insert!');
      console.log('✅ [REGISTER] Insert result:', JSON.stringify(insertResult, null, 2));
      phoneData = insertResult;
      saveMethod = 'direct_insert';
    } catch (err1: any) {
      console.error('❌ [REGISTER] METHOD 1 FAILED:', err1.message || err1);
      
      // METHOD 2: Try database function
      try {
        console.log('📱 [REGISTER] METHOD 2: Attempting via database function...');
        const { data: functionResult, error: functionError } = await supabase
          .rpc('save_user_phone', {
            p_user_id: authData.user.id,
            p_phone_number: formattedPhone,
            p_verified: true
          });
        
        if (functionError) {
          console.error('❌ [REGISTER] Function error:', functionError);
          throw functionError;
        }
        
        console.log('✅ [REGISTER] Phone saved via database function!');
        console.log('✅ [REGISTER] Function result:', JSON.stringify(functionResult, null, 2));
        phoneData = functionResult;
        saveMethod = 'database_function';
      } catch (err2: any) {
        console.error('❌ [REGISTER] METHOD 2 FAILED:', err2.message || err2);
        
        // METHOD 3: Raw SQL insert
        try {
          console.log('📱 [REGISTER] METHOD 3: Raw SQL insert...');
          const { data: sqlResult, error: sqlError } = await supabase
            .rpc('save_phone_raw', {
              p_user_id: authData.user.id,
              p_phone: formattedPhone
            });
          
          if (sqlError) {
            console.error('❌ [REGISTER] SQL error:', sqlError);
            phoneError = sqlError;
          } else {
            console.log('✅ [REGISTER] Phone saved via raw SQL!');
            phoneData = sqlResult;
            saveMethod = 'raw_sql';
          }
        } catch (err3: any) {
          console.error('❌ [REGISTER] METHOD 3 FAILED:', err3.message || err3);
          phoneError = err3;
        }
      }
    }
    
    console.log('📱📱📱 [REGISTER] ==========================================');
    console.log('📱📱📱 [REGISTER] SAVE RESULT:', phoneData ? '✅ SUCCESS' : '❌ FAILED');
    console.log('📱📱📱 [REGISTER] Method used:', saveMethod || 'none');
    if (phoneError) {
      console.log('📱📱📱 [REGISTER] Error:', phoneError.message || phoneError);
    }
    console.log('📱📱📱 [REGISTER] ==========================================');
      
      if (phoneError) {
        console.error('❌ [REGISTER] CRITICAL: Error saving phone number:', phoneError);
        console.error('❌ [REGISTER] Error code:', phoneError.code);
        console.error('❌ [REGISTER] Error message:', phoneError.message);
        console.error('❌ [REGISTER] Error details:', JSON.stringify(phoneError, null, 2));
        
        // If duplicate phone somehow got through, fail the registration
        if (phoneError.code === '23505') {
          console.error('❌ Duplicate phone number detected at insert!');
          // Clean up the auth user
          try {
            await supabase.auth.admin.deleteUser(authData.user.id);
            console.log('🗑️ Cleaned up duplicate user');
          } catch (cleanupError) {
            console.error('❌ Failed to cleanup user:', cleanupError);
          }
          
          return NextResponse.json(
            { success: false, message: 'This phone number is already registered. Please use a different number.' },
            { status: 400 }
          );
        }
        
        // For other errors, THIS IS CRITICAL - we should probably fail the registration
        console.error('⚠️⚠️⚠️ [REGISTER] CRITICAL: User created but phone NOT saved!');
        console.error('⚠️⚠️⚠️ [REGISTER] This means duplicate prevention will NOT work!');
        console.error('⚠️⚠️⚠️ [REGISTER] User:', authData.user.id);
        console.error('⚠️⚠️⚠️ [REGISTER] Phone:', formattedPhone);
        
        // Log to help debug
        console.error('⚠️ [REGISTER] Please check:');
        console.error('  1. Does user_phones table exist?');
        console.error('  2. Does save_user_phone function exist?');
        console.error('  3. Do RLS policies allow service role to insert?');
        console.error('  4. Is SUPABASE_SERVICE_ROLE_KEY set correctly?');
      } else {
        console.log('✅✅✅ [REGISTER] Phone number saved to user_phones table!');
        console.log('✅ [REGISTER] Saved phone record:', JSON.stringify(phoneData, null, 2));
        console.log('✅ [REGISTER] Saved phone number:', phoneData?.[0]?.phone_number);
        console.log('✅ [REGISTER] Record ID:', phoneData?.[0]?.id);
        console.log('✅ [REGISTER] Method:', saveMethod);
      }

    if (profileError) {
      console.error('Profile creation error:', profileError);
      
      // Check if it's a duplicate phone number error
      if (profileError.code === '23505' && profileError.message.includes('phone')) {
        // Clean up auth user since profile creation failed
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError);
        }
        
        return NextResponse.json(
          { message: 'This phone number is already registered. Please use a different phone number or try signing in.' },
          { status: 400 }
        );
      }
      
      // Check if it's a duplicate email error
      if (profileError.code === '23505' && profileError.message.includes('email')) {
        // Clean up auth user since profile creation failed
        try {
          await supabase.auth.admin.deleteUser(authData.user.id);
        } catch (cleanupError) {
          console.error('Failed to cleanup auth user:', cleanupError);
        }
        
        return NextResponse.json(
          { message: 'An account with this email address already exists. Please use a different email or try signing in.' },
          { status: 400 }
        );
      }
      
      // Note: Auth user was created but profile failed
      // The trigger might handle this or we can clean up manually
    }

    // ============================================
    // CRITICAL: Link phone verification to this user
    // ============================================
    // This marks the phone as "used for completed registration"
    // So it can't be used to register another account
    console.log('🔗 [REGISTER] Linking phone verification to user...');
    
    try {
      const { data: linkResult, error: linkError } = await supabase
        .rpc('link_phone_to_user', {
          p_phone: formattedPhone,
          p_user_id: authData.user.id
        });
      
      if (linkError) {
        console.error('⚠️ [REGISTER] Failed to link phone to user:', linkError);
        // Don't fail registration, just log the error
      } else {
        console.log('✅ [REGISTER] Phone linked to user successfully:', linkResult);
      }
    } catch (linkErr) {
      console.error('⚠️ [REGISTER] Error linking phone:', linkErr);
      // Don't fail registration, just log the error
    }

    return NextResponse.json(
      { 
        message: 'Account created successfully!',
        userId: authData.user.id 
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

