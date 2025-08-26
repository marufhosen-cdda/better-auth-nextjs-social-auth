import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
  try {
    const { conferenceName, participant } = await request.json();

    console.log('Add to conference request:', { conferenceName, participant });

    // Validate required fields
    if (!conferenceName || !participant) {
      console.error('Missing required fields:', { conferenceName: !!conferenceName, participant: !!participant });
      return NextResponse.json(
        { error: 'Conference name and participant are required' },
        { status: 400 }
      );
    }

    // Validate environment variables
    if (!process.env.TWILIO_PHONE_NUMBER) {
      console.error('Missing TWILIO_PHONE_NUMBER environment variable');
      return NextResponse.json(
        { error: 'Server configuration error: missing phone number' },
        { status: 500 }
      );
    }

    // Validate participant phone number format
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(participant)) {
      console.error('Invalid participant phone number format:', participant);
      return NextResponse.json(
        { error: 'Invalid phone number format. Use format: +1234567890' },
        { status: 400 }
      );
    }

    console.log('Creating call to add participant to conference...');

    const call = await client.calls.create({
      to: participant,
      from: process.env.TWILIO_PHONE_NUMBER,
      twiml: `
<Response>
    <Dial>
        <Conference 
            startConferenceOnEnter="true"
            endConferenceOnExit="false"
            waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical"
            maxParticipants="10"
        >
            ${conferenceName}
        </Conference>
    </Dial>
</Response>`,
      statusCallback: `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000'}/api/twilio/status`,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
    });

    console.log('Call created successfully:', { callSid: call.sid, status: call.status });

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      participant,
      status: call.status,
      conferenceName
    });

  } catch (error: any) {
    console.error('Add to conference error:', {
      error: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
      status: error.status
    });

    // Handle specific Twilio errors
    if (error.code) {
      switch (error.code) {
        case 21211:
          return NextResponse.json(
            { error: 'Invalid phone number format' },
            { status: 400 }
          );
        case 21212:
          return NextResponse.json(
            { error: 'Invalid Twilio phone number' },
            { status: 500 }
          );
        case 20003:
          return NextResponse.json(
            { error: 'Authentication error - check Twilio credentials' },
            { status: 401 }
          );
        case 20429:
          return NextResponse.json(
            { error: 'Too many requests - please try again later' },
            { status: 429 }
          );
        default:
          return NextResponse.json(
            {
              error: 'Failed to add participant to conference',
              details: error.message,
              code: error.code
            },
            { status: 500 }
          );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to add participant to conference',
        details: error.message
      },
      { status: 500 }
    );
  }
}