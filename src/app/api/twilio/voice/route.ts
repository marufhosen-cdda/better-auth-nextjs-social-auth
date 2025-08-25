import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const To = formData.get('To') as string;
        const From = formData.get('From') as string;
        const isAppToApp = formData.get('isAppToApp') === 'true';

        const twiml = new VoiceResponse();

        if (isAppToApp) {
            // App-to-app call
            const dial = twiml.dial({
                callerId: From,
                timeout: 30
            });
            dial.client(To);
        } else {
            // App-to-phone call
            const dial = twiml.dial({
                callerId: process.env.TWILIO_PHONE_NUMBER,
                timeout: 30
            });
            dial.number(To);
        }

        return new NextResponse(twiml.toString(), {
            headers: {
                'Content-Type': 'text/xml'
            }
        });
    } catch (error) {
        console.error('Voice webhook error:', error);
        const twiml = new VoiceResponse();
        twiml.say('An error occurred. Please try again later.');

        return new NextResponse(twiml.toString(), {
            headers: {
                'Content-Type': 'text/xml'
            }
        });
    }
}