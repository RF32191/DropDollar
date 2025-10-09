import { NextRequest, NextResponse } from 'next/server';

function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // If it's 10 digits, add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If it's 11 digits starting with 1, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If it already has +, return as is
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Default: add +1
  return `+1${digits}`;
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, code } = await request.json();
    if (!phoneNumber || !code) {
      return NextResponse.json({ success: false, message: 'Missing phoneNumber or code' }, { status: 400 });
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !serviceSid) {
      return NextResponse.json({ success: false, message: 'Twilio env vars not configured' }, { status: 500 });
    }

    const url = `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`;
    const body = new URLSearchParams({
      To: formattedPhone,
      Code: code
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ success: false, message: json?.message || 'Verification failed' }, { status: res.status });
    }

    if (json.status === 'approved') {
      return NextResponse.json({ success: true, message: 'Code verified' });
    }
    return NextResponse.json({ success: false, message: 'Invalid code' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Unexpected error' }, { status: 500 });
  }
}


