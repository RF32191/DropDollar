import { NextRequest, NextResponse } from 'next/server';
import { getEnvironmentConfig } from '@/lib/config';

// Get environment configuration
const config = getEnvironmentConfig();

// Only import Supabase if it's configured
let supabase: any = null;
if (config.supabase.enabled) {
  try {
    const { supabase: supabaseClient } = await import('@/lib/supabase/client');
    supabase = supabaseClient;
  } catch (error) {
    console.warn('Supabase not available:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is available
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const campaignData = await request.json();

    // Validate required fields
    const requiredFields = [
      'campaignName', 'advertiserName', 'contactEmail', 'adType',
      'campaignObjective', 'adTitle', 'adDescription', 'clickUrl',
      'budget', 'costPerView', 'costPerClick', 'maxDailyViews'
    ];

    for (const field of requiredFields) {
      if (!campaignData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Prepare data for insertion
    const insertData = {
      name: campaignData.campaignName,
      advertiser_name: campaignData.advertiserName,
      contact_email: campaignData.contactEmail,
      contact_phone: campaignData.contactPhone || null,
      website: campaignData.website || null,
      
      // Campaign details
      ad_type: campaignData.adType,
      campaign_objective: campaignData.campaignObjective,
      target_audience: campaignData.targetAudience || [],
      game_types: campaignData.gameTypes || [],
      user_demographics: campaignData.userDemographics || [],
      time_slots: campaignData.timeSlots || [],
      
      // Creative assets
      banner_image_url: campaignData.bannerImageUrl || null,
      banner_html: campaignData.bannerHtml || null,
      click_url: campaignData.clickUrl,
      ad_title: campaignData.adTitle,
      ad_description: campaignData.adDescription,
      call_to_action: campaignData.callToAction || 'Learn More',
      
      // Budget and timing
      budget: campaignData.budget,
      cost_per_view: campaignData.costPerView,
      cost_per_click: campaignData.costPerClick,
      max_daily_views: campaignData.maxDailyViews,
      start_date: campaignData.startDate || null,
      end_date: campaignData.endDate || null,
      
      // Additional info
      special_requests: campaignData.specialRequests || null,
      
      // Status and metadata
      status: 'pending_review', // All campaigns start as pending review
      is_active: false, // Will be activated after approval
      current_daily_views: 0,
      total_views: 0,
      total_clicks: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('ad_campaign_submissions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to submit campaign', details: error.message },
        { status: 500 }
      );
    }

    // Send notification email to admin (you could implement this)
    // await sendAdminNotification(data);

    return NextResponse.json({
      success: true,
      message: 'Campaign submitted successfully',
      campaignId: data.id,
      data: data
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('id');
    const userEmail = searchParams.get('email');

    if (campaignId) {
      // Get specific campaign
      const { data, error } = await supabase
        .from('ad_campaign_submissions')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ data });
    }

    if (userEmail) {
      // Get campaigns by user email
      const { data, error } = await supabase
        .from('ad_campaign_submissions')
        .select('*')
        .eq('contact_email', userEmail)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch campaigns' },
          { status: 500 }
        );
      }

      return NextResponse.json({ data });
    }

    // Get all campaigns (admin only - you might want to add authentication)
    const { data, error } = await supabase
      .from('ad_campaign_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
