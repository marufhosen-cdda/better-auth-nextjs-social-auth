import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
    try {
        const { conferenceName, participant } = await request.json();

        if (!conferenceName || !participant) {
            return NextResponse.json(
                { error: 'Conference name and participant are required' },
                { status: 400 }
            );
        }

        const call = await client.calls.create({
            to: participant,
            from: process.env.TWILIO_PHONE_NUMBER || '',
            twiml: `
        <Response>
          <Dial>
            <Conference 
              startConferenceOnEnter="false"
              endConferenceOnExit="false"
              waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical"
            >
              ${conferenceName}
            </Conference>
          </Dial>
        </Response>
      `
        });

        return NextResponse.json({
            success: true,
            callSid: call.sid,
            participant,
            status: call.status
        });
    } catch (error) {
        console.error('Add to conference error:', error);
        return NextResponse.json(
            { error: 'Failed to add participant to conference' },
            { status: 500 }
        );
    }
}