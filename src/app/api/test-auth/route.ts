import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Testing Supabase connection...');
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('🌐 Supabase URL:', supabaseUrl ? 'SET' : 'MISSING');
    console.log('🔑 Supabase Key:', supabaseKey ? 'SET' : 'MISSING');
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase environment variables',
        details: {
          url: supabaseUrl ? 'SET' : 'MISSING',
          key: supabaseKey ? 'SET' : 'MISSING'
        }
      }, { status: 500 });
    }
    
    // Test basic Supabase connection
    const { data, error } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection error:', error);
      return NextResponse.json({
        success: false,
        error: 'Supabase connection failed',
        details: error.message
      }, { status: 500 });
    }
    
    console.log('✅ Supabase connection successful');
    
    return NextResponse.json({
      success: true,
      message: 'Supabase connection working',
      timestamp: new Date().toISOString(),
      environment: {
        url: supabaseUrl ? 'SET' : 'MISSING',
        key: supabaseKey ? 'SET' : 'MISSING'
      }
    });
    
  } catch (error: any) {
    console.error('💥 Test auth error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error during auth test',
      details: error.message
    }, { status: 500 });
  }
}
