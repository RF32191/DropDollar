import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatPhoneNumber, validatePhoneNumber, normalizePhoneNumber } from '@/lib/utils/phoneFormatter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    
    if (insertedProfile) {
      console.log('✅ Profile created successfully:', insertedProfile);
      
      // Insert phone number into separate user_phones table
      console.log('📱 Inserting phone into user_phones table:', formattedPhone);
      const { data: phoneData, error: phoneError } = await supabase
        .from('user_phones')
        .insert({
          user_id: authData.user.id,
          phone_number: formattedPhone,
          verified: true,
          verified_at: new Date().toISOString()
        })
        .select();
      
      if (phoneError) {
        console.error('❌ Error saving phone number:', phoneError);
      } else {
        console.log('✅ Phone number saved to user_phones table:', phoneData);
      }
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

