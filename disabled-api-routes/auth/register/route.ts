import { NextRequest, NextResponse } from 'next/server';

// Conditionally import Supabase only if environment variables are available
let supabase: any = null;
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  try {
    const { supabase: supabaseClient } = require('@/lib/supabase/client');
    supabase = supabaseClient;
  } catch (error) {
    console.warn('Supabase not available:', error);
  }
}
import { LocationService, type LocationData } from '@/lib/locationService';

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    const { email, password, firstName, lastName, username, role = 'buyer', location } = body;
    
    if (!email || !password || !firstName || !lastName || !username) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, firstName, lastName, username' },
        { status: 400 }
      );
    }

    // Validate location data if provided
    if (location && !location.isAllowed) {
      return NextResponse.json(
        { error: `Registration not available: ${location.restrictionReason || 'Location not eligible for skill-based competitions'}` },
        { status: 403 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if username is already taken
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      );
    }

    // Create user with Supabase Auth (disable email confirmation for now)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          username: username,
          role: role
        },
        emailRedirectTo: undefined // Disable email confirmation
      }
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      
      // Handle specific error cases
      if (authError.message.includes('User already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: authError.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 400 }
      );
    }

    // Create user profile in the users table
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        username: username,
        first_name: firstName,
        last_name: lastName,
        role: role,
        location_verified: !!location,
        location_state: location?.stateCode || null,
        location_city: location?.city || null,
        location_country: location?.country || null,
        location_allowed: location?.isAllowed || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      
      // If it's a schema cache issue, try to refresh and retry once
      if (profileError.code === 'PGRST204') {
        console.log('Schema cache issue detected, retrying in 2 seconds...');
        
        // Wait a moment and try again
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { error: retryError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: email,
            username: username,
            first_name: firstName,
            last_name: lastName,
            role: role,
            location_verified: !!location,
            location_state: location?.stateCode || null,
            location_city: location?.city || null,
            location_country: location?.country || null,
            location_allowed: location?.isAllowed || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (retryError) {
          console.error('Profile creation retry failed:', retryError);
          // Try to clean up auth user if profile creation fails
          await supabase.auth.admin.deleteUser(authData.user.id);
          return NextResponse.json(
            { error: 'Database schema issue. Please try again in a few minutes or contact support.' },
            { status: 500 }
          );
        }
      } else {
        // Try to clean up auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json(
          { error: 'Failed to create user profile. Please try again.' },
          { status: 400 }
        );
      }
    }

    // Store location data if provided
    if (location) {
      const { error: locationError } = await supabase
        .from('user_locations')
        .insert({
          user_id: authData.user.id,
          latitude: location.latitude || 0,
          longitude: location.longitude || 0,
          state_code: location.stateCode || 'Unknown',
          state_name: location.state || 'Unknown',
          city: location.city || 'Unknown',
          country: location.country || 'US',
          is_allowed: location.isAllowed || false,
          restriction_reason: location.restrictionReason || null,
          verified_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (locationError) {
        console.error('Location storage error:', locationError);
        // Continue anyway
      }

      // Log compliance
      const { error: complianceError } = await supabase
        .from('location_compliance_log')
        .insert({
          user_id: authData.user.id,
          action: 'signup',
          location_data: location,
          is_allowed: location.isAllowed || false,
          restriction_reason: location.restrictionReason || null,
          created_at: new Date().toISOString()
        });

      if (complianceError) {
        console.error('Compliance log error:', complianceError);
        // Continue anyway
      }
    }

    // Initialize user balance (in case trigger doesn't work)
    const { error: balanceError } = await supabase
      .from('user_balances')
      .insert({
        user_id: authData.user.id,
        drop_tokens: 0.00,
        cash_balance_usd: 0.00,
        pending_earnings: 0.00,
        lifetime_earnings: 0.00,
        total_spent: 0.00,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (balanceError && balanceError.code !== '23505') { // Ignore duplicate key errors
      console.error('Balance initialization error:', balanceError);
    }

    // Initialize DropPoints level system (in case trigger doesn't work)
    const { error: levelError } = await supabase
      .from('user_levels')
      .insert({
        user_id: authData.user.id,
        current_level: 1,
        total_points: 0,
        experience_points: 0,
        skill_rating: 1000,
        games_played: 0,
        daily_games_played: 0,
        last_game_date: new Date().toISOString().split('T')[0], // Date only
        multi_target_rating: 1000,
        falling_object_rating: 1000,
        color_sequence_rating: 1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (levelError && levelError.code !== '23505') { // Ignore duplicate key errors
      console.error('Level initialization error:', levelError);
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! Please check your email to verify your account.',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        username: username,
        firstName: firstName,
        lastName: lastName,
        role: role,
        locationVerified: !!location,
        locationAllowed: location?.isAllowed || false
      }
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error during registration' },
      { status: 500 }
    );
  }
}
