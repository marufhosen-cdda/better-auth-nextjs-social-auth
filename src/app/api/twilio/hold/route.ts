import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
    try {
        const { callSid, hold } = await request.json();

        if (!callSid) {
            return NextResponse.json(
                { error: 'Call SID is required' },
                { status: 400 }
            );
        }

        const twiml = new twilio.twiml.VoiceResponse();

        if (hold) {
            twiml.play('http://com.twilio.music.classical.s3.amazonaws.com/BusyStrings.wav');
        } else {
            // Resume the call - this would need more complex logic based on your app
            twiml.say('Call resumed');
        }

        // Update the call with new TwiML
        await client.calls(callSid).update({
            twiml: twiml.toString()
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Hold/unhold error:', error);
        return NextResponse.json(
            { error: 'Failed to hold/unhold call' },
            { status: 500 }
        );
    }
}