import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
    try {
        const { callSid, forwardTo } = await request.json();

        if (!callSid || !forwardTo) {
            return NextResponse.json(
                { error: 'Call SID and forward number are required' },
                { status: 400 }
            );
        }

        const twiml = new twilio.twiml.VoiceResponse();
        const dial = twiml.dial({
            callerId: process.env.TWILIO_PHONE_NUMBER
        });
        dial.number(forwardTo);

        // Update the call to forward
        await client.calls(callSid).update({
            twiml: twiml.toString()
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Forward error:', error);
        return NextResponse.json(
            { error: 'Failed to forward call' },
            { status: 500 }
        );
    }
}